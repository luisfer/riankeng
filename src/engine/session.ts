import { entriesForLevel, getEntry } from '@content/index'
import type { TrackId } from '@content/types'
import { hasShippedClip } from '@/audio/clips'
import { detectVoice } from '@/audio/tts'
import type { ProgressDoc } from '@/storage/progress-schema'
import { chooseModality, currentLevel, dueIds, entryOrThrow, progressFor } from './scheduler'
import { isDue } from './srs'

export interface QueueItem {
  id: string
  modality: ReturnType<typeof chooseModality>
  salt: string
  /** Unseen cards show both sides once before the test. Missing on older sittings. */
  meet?: boolean
  /** This sitting already recorded a Check for this card. */
  scored?: boolean
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
  /** Already-yours sitting. Pause still goes home; Continue on a level is off. */
  review?: boolean
  /** Last Check on the current card, so resume and Pause know the verdict. */
  pending?: { ok: boolean; text: string }
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

  const voiceReady = detectVoice().ready
  const push = (id: string, cap = SESSION_SIZE) => {
    if (seen.has(id) || queue.length >= cap) return
    seen.add(id)
    const entry = entryOrThrow(id)
    const progress = progressFor(doc, id)
    const canHear = !doc.settings.silent && (voiceReady || hasShippedClip(id))
    const item: QueueItem = { id, modality: chooseModality(entry, progress, salt, canHear), salt }
    if (progress.reps === 0) item.meet = true
    queue.push(item)
  }

  const onLevel = entriesForLevel(target, track)
  const fresh = onLevel.filter((e) => progressFor(doc, e.id).reps === 0)
  const dueHere = onLevel.filter((e) => isDue(progressFor(doc, e.id), now))
  const leftover = onLevel.filter((e) => progressFor(doc, e.id).reps > 0)

  const tailIds: string[] = []
  for (const id of dueIds(doc, now, track)) {
    if (tailIds.length >= REVIEW_TAIL) break
    const entry = getEntry(id)
    if (!entry || entry.level >= target) continue
    tailIds.push(id)
  }

  const introducing = fresh.slice(0, newCap)
  const levelCap = SESSION_SIZE - tailIds.length
  for (const e of introducing) push(e.id, levelCap)
  for (const e of dueHere) push(e.id, levelCap)
  for (const id of tailIds) push(id)
  // Not-due leftovers only when the sitting would otherwise be empty (Sit again, nothing due).
  if (queue.length === 0) {
    for (const e of leftover) push(e.id)
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

export function startReviewSession(
  doc: ProgressDoc,
  now: number,
  ids: string[],
  track: TrackId = 'voice',
): LiveSession {
  const salt = String(now)
  const voiceReady = !doc.settings.silent && detectVoice().ready
  const queue: QueueItem[] = []
  const seen = new Set<string>()
  for (const id of ids) {
    if (queue.length >= SESSION_SIZE) break
    if (seen.has(id)) continue
    const entry = getEntry(id)
    if (!entry) continue
    seen.add(id)
    const progress = progressFor(doc, id)
    queue.push({
      id,
      modality: chooseModality(entry, progress, salt, voiceReady || (!doc.settings.silent && hasShippedClip(id))),
      salt,
      meet: false,
    })
  }
  return {
    startedAt: now,
    level: 0,
    track,
    queue,
    cursor: 0,
    answered: 0,
    correct: 0,
    hold: null,
    review: true,
  }
}

export function normalizeSession(session: LiveSession): LiveSession {
  return {
    ...session,
    track: session.track ?? 'voice',
  }
}

function sittingOpen(session: LiveSession | null): session is LiveSession {
  if (!session) return false
  if (session.queue.length === 0 || session.cursor >= session.queue.length) return false
  return session.queue.every((q) => Boolean(getEntry(q.id)))
}

/** Unfinished sitting for this track and level, with every card still in the catalog. */
export function canContinue(session: LiveSession | null, track: TrackId, level: number): session is LiveSession {
  if (!sittingOpen(session) || session.review) return false
  if ((session.track ?? 'voice') !== track || session.level !== level) return false
  return true
}

/** Unfinished Already-yours sitting. Pause still goes home; resume lives on that page. */
export function canResumeReview(session: LiveSession | null): session is LiveSession {
  return sittingOpen(session) && Boolean(session.review)
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

/** After the teach face, the test waits later in the sitting so it is not an echo. */
export function afterMeet(session: LiveSession): LiveSession {
  const item = currentItem(session)
  if (!item?.meet) return session
  const tested = { ...item, meet: false }
  const rest = session.queue.slice(session.cursor + 1)
  if (rest.length === 0) return { ...session, queue: [tested] }
  return { ...session, queue: [...rest, tested], cursor: 0 }
}

export function markCorrect(session: LiveSession): LiveSession {
  return {
    ...session,
    cursor: session.cursor + 1,
    answered: session.answered + 1,
    correct: session.correct + 1,
    hold: null,
    pending: undefined,
  }
}

/** Persist the Check so a second Check is ignored and Pause can advance. */
export function markScored(session: LiveSession, pending: { ok: boolean; text: string }): LiveSession {
  const item = currentItem(session)
  if (!item || item.scored || session.pending) return session
  const queue = session.queue.map((q, i) => (i === session.cursor ? { ...q, scored: true } : q))
  return { ...session, queue, pending }
}

export function alreadyScored(session: LiveSession): boolean {
  const item = currentItem(session)
  return Boolean(item?.scored || session.pending)
}

/** Pause after a correct Check is Next, so resume is not the same card. */
export function pauseSession(session: LiveSession): LiveSession {
  if (!session.pending?.ok) return session
  return markCorrect({ ...session, pending: undefined })
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
  if (!item) return { ...session, hold: null, pending: undefined }
  const rest = session.queue.slice(session.cursor + 1)
  return {
    ...session,
    queue: [...rest, item],
    cursor: 0,
    hold: null,
    pending: undefined,
  }
}

export function clearHold(session: LiveSession): LiveSession {
  return { ...session, hold: null }
}

export function isFinished(session: LiveSession): boolean {
  return session.queue.length === 0 || session.cursor >= session.queue.length
}
