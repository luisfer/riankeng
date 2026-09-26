import { entriesForLevel, entryTrack, getEntry } from '@content/index'
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
  /** A miss in this sitting already dropped the stage. */
  penalized?: boolean
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
  /** 2 for a sitting started after the Voice reorder. An older one names a level by its old number. */
  voiceOrder?: 2
  /**
   * Cards finished in this sitting, a Look included. The queue turns and its cursor goes back to 0,
   * so the number in the margin is this plus one. Older sittings count from their answers.
   */
  step?: number
}

function stepped(session: LiveSession): number {
  return (session.step ?? session.answered) + 1
}

export const SESSION_SIZE = 16
/**
 * Seats kept in every sitting for cards from earlier levels that are due. Without them a big level
 * (Voice 4 has 110 cards) fills every sitting for weeks, and the words learned before it go stale.
 */
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
    const entry = getEntry(id)
    if (!entry || entry.level >= target) continue
    tailIds.push(id)
  }

  const introducing = fresh.slice(0, newCap)
  const dueSorted = dueHere.slice().sort((a, b) => progressFor(doc, a.id).due - progressFor(doc, b.id).due)
  const leftoverSorted = leftover
    .filter((e) => !isDue(progressFor(doc, e.id), now))
    .slice()
    .sort((a, b) => progressFor(doc, a.id).lastSeen - progressFor(doc, b.id).lastSeen)
  const onLevelIds = new Set(onLevel.map((e) => e.id))

  // The level fills the sitting up to the seats kept for earlier levels' due cards.
  const levelCap = SESSION_SIZE - Math.min(REVIEW_TAIL, tailIds.length)
  for (const e of dueSorted) push(e.id, levelCap)
  for (const e of introducing) push(e.id, levelCap)
  const hasLevel = queue.some((q) => onLevelIds.has(q.id))
  if (fresh.length <= newCap || !hasLevel) {
    for (const e of leftoverSorted) push(e.id, levelCap)
  }
  // Then those due cards, most overdue first, in the kept seats and any the level left empty.
  for (const id of tailIds) push(id)

  return {
    startedAt: now,
    level: target,
    track,
    queue,
    cursor: 0,
    answered: 0,
    correct: 0,
    hold: null,
    voiceOrder: 2,
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
    voiceOrder: 2,
  }
}

export function normalizeSession(session: LiveSession): LiveSession {
  const queue = session.queue.map((q, i) => {
    if (i === session.cursor && q.scored && !session.pending) return { ...q, scored: false }
    return q
  })
  return {
    ...session,
    track: session.track ?? 'voice',
    queue,
  }
}

/** Listen and tone become writing when the card cannot be heard. */
export function sittingModality(item: QueueItem, canHear: boolean): QueueItem['modality'] {
  if ((item.modality === 'listen' || item.modality === 'tone') && !canHear) return 'th-en'
  // A sitting saved before tone drills skipped kráp/kâ cards still holds one.
  if (item.modality === 'tone' && getEntry(item.id)?.rom.includes('/')) return 'th-en'
  // A Script sitting saved before English to romanization became a pick still holds one.
  if (item.modality === 'en-th') {
    const entry = getEntry(item.id)
    if (entry && entryTrack(entry) === 'script') return 'pick'
  }
  return item.modality
}

function sittingOpen(session: LiveSession | null): session is LiveSession {
  if (!session) return false
  // A Voice sitting saved before the reorder names its level by the old number. Start afresh.
  if ((session.track ?? 'voice') === 'voice' && session.voiceOrder !== 2) return false
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
  if (rest.length === 0) return { ...session, queue: [tested], cursor: 0, step: stepped(session) }
  return { ...session, queue: [...rest, tested], cursor: 0, step: stepped(session) }
}

export function markCorrect(session: LiveSession): LiveSession {
  return {
    ...session,
    cursor: session.cursor + 1,
    answered: session.answered + 1,
    correct: session.correct + 1,
    hold: null,
    pending: undefined,
    step: stepped(session),
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
function withPenalized(session: LiveSession): LiveSession {
  const queue = session.queue.map((q, i) => (i === session.cursor ? { ...q, penalized: true } : q))
  return { ...session, queue }
}

export function markMissStay(session: LiveSession, hold: Hold): LiveSession {
  return {
    ...withPenalized(session),
    answered: session.answered + 1,
    hold,
  }
}

/** Missed a pick/tone card: count the attempt, wait for Next, then requeue. */
export function markMissMove(session: LiveSession): LiveSession {
  return {
    ...withPenalized(session),
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
    queue: [...rest, { ...item, scored: false }],
    cursor: 0,
    hold: null,
    pending: undefined,
    step: stepped(session),
  }
}

export function clearHold(session: LiveSession): LiveSession {
  return { ...session, hold: null }
}

export function isFinished(session: LiveSession): boolean {
  return session.queue.length === 0 || session.cursor >= session.queue.length
}
