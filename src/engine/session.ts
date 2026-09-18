import { entriesForLevel } from '@content/index'
import type { TrackId } from '@content/types'
import type { ProgressDoc } from '@/storage/progress-schema'
import { chooseModality, currentLevel, dueIds, entryOrThrow, hash, progressFor } from './scheduler'
import type { Modality } from './srs'

export interface QueueItem {
  id: string
  modality: Modality
  salt: string
}

/**
 * A miss on a typed Thai card holds the learner on the card until the rom is
 * retyped. English misses do not hold: copying "dog" under "dog" teaches
 * nothing, so they show the meaning and requeue like pick and tone misses.
 */
export type Hold = { kind: 'retype-th'; id: string; target: string }

export interface LiveSession {
  startedAt: number
  level: number
  track?: TrackId
  queue: QueueItem[]
  cursor: number
  answered: number
  correct: number
  hold: Hold | null
}

const SESSION_SIZE = 16

function translationOnly(m: Modality, salt: string): Modality {
  if (m === 'listen' || m === 'tone') return hash(salt) < 0.5 ? 'en-th' : 'th-en'
  return m
}

export function startSession(doc: ProgressDoc, now = Date.now(), level?: number, track: TrackId = 'voice'): LiveSession {
  const target = level ?? currentLevel(doc, now, track)
  const salt = String(now)
  const queue: QueueItem[] = []
  const seen = new Set<string>()

  const push = (id: string) => {
    if (seen.has(id) || queue.length >= SESSION_SIZE) return
    seen.add(id)
    const entry = entryOrThrow(id)
    queue.push({ id, modality: chooseModality(entry, progressFor(doc, id), salt), salt })
  }

  for (const id of dueIds(doc, now, track)) push(id)

  if (queue.length < SESSION_SIZE) {
    const entries = entriesForLevel(target, track)
    const fresh = entries.filter((e) => progressFor(doc, e.id).reps === 0)
    const leftover = entries.filter((e) => progressFor(doc, e.id).reps > 0)
    for (const e of [...fresh, ...leftover]) push(e.id)
  }

  return {
    startedAt: now,
    level: target,
    track,
    queue,
    cursor: 0,
    answered: 0,
    correct: 0,
    hold: null,
  }
}

export function normalizeSession(session: LiveSession): LiveSession {
  const track = session.track ?? 'voice'
  return {
    ...session,
    track,
    queue: session.queue.map((q) => ({
      ...q,
      modality: track === 'voice' ? translationOnly(q.modality, q.salt) : q.modality,
    })),
  }
}

export function currentItem(session: LiveSession): QueueItem | null {
  return session.queue[session.cursor] ?? null
}

export function remaining(session: LiveSession): number {
  return Math.max(0, session.queue.length - session.cursor)
}

export function markCorrect(session: LiveSession): LiveSession {
  return {
    ...session,
    cursor: session.cursor + 1,
    answered: session.answered + 1,
    correct: session.correct + 1,
    hold: null,
  }
}

/** Missed a typed card: stay on it and force a retype. */
export function markMissStay(session: LiveSession, hold: Hold): LiveSession {
  return {
    ...session,
    answered: session.answered + 1,
    hold,
  }
}

/** Missed a pick/tone card: count the attempt, wait for Next, then requeue. */
export function markMissMove(session: LiveSession): LiveSession {
  return {
    ...session,
    answered: session.answered + 1,
  }
}

/** After a successful retype, send the card to the back of the queue. */
export function afterHold(session: LiveSession): LiveSession {
  return requeueCurrent({ ...session, hold: null })
}

export function requeueCurrent(session: LiveSession): LiveSession {
  const item = currentItem(session)
  if (!item) return { ...session, hold: null }
  const rest = session.queue.slice(session.cursor + 1)
  return {
    ...session,
    queue: [...rest, item],
    cursor: 0,
    hold: null,
  }
}

export function clearHold(session: LiveSession): LiveSession {
  return { ...session, hold: null }
}

export function isFinished(session: LiveSession): boolean {
  return session.queue.length === 0 || session.cursor >= session.queue.length
}
