import { entriesForLevel, getEntry } from '@content/index'
import type { TrackId } from '@content/types'
import type { ProgressDoc } from '@/storage/progress-schema'
import { chooseModality, currentLevel, dueIds, entryOrThrow, progressFor } from './scheduler'
import { isDue } from './srs'

export interface QueueItem {
  id: string
  modality: ReturnType<typeof chooseModality>
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

export const SESSION_SIZE = 16
/** Earlier-level dues that may trail a sitting, after the opened level is filled. */
export const REVIEW_TAIL = 4

export function startSession(doc: ProgressDoc, now = Date.now(), level?: number, track: TrackId = 'voice'): LiveSession {
  const target = level ?? currentLevel(doc, now, track)
  const salt = String(now)
  const queue: QueueItem[] = []
  const seen = new Set<string>()
  const newCap = Math.max(0, doc.settings.newPerSession)

  const push = (id: string) => {
    if (seen.has(id) || queue.length >= SESSION_SIZE) return
    seen.add(id)
    const entry = entryOrThrow(id)
    queue.push({ id, modality: chooseModality(entry, progressFor(doc, id), salt), salt })
  }

  const onLevel = entriesForLevel(target, track)
  const fresh = onLevel.filter((e) => progressFor(doc, e.id).reps === 0)
  const dueHere = onLevel.filter((e) => isDue(progressFor(doc, e.id), now))
  const leftover = onLevel.filter((e) => progressFor(doc, e.id).reps > 0)

  for (const e of fresh.slice(0, newCap)) push(e.id)
  for (const e of dueHere) push(e.id)
  for (const e of leftover) push(e.id)

  let tail = 0
  for (const id of dueIds(doc, now, track)) {
    if (tail >= REVIEW_TAIL) break
    const entry = getEntry(id)
    if (!entry || entry.level >= target) continue
    if (seen.has(id)) continue
    push(id)
    tail++
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
  return {
    ...session,
    track: session.track ?? 'voice',
  }
}

/** Unfinished sitting for this track and level, with every card still in the catalog. */
export function canContinue(session: LiveSession | null, track: TrackId, level: number): session is LiveSession {
  if (!session) return false
  if ((session.track ?? 'voice') !== track || session.level !== level) return false
  if (session.queue.length === 0 || session.cursor >= session.queue.length) return false
  return session.queue.every((q) => Boolean(getEntry(q.id)))
}

export function sessionStillValid(session: LiveSession, resetAt: number): boolean {
  if (session.startedAt < resetAt) return false
  return session.queue.every((q) => Boolean(getEntry(q.id)))
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
