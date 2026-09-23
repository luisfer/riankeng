/**
 * Spaced repetition. Memrise-shaped: items grow through stages
 * seed → sprout → flower → ripe, each stage with a fixed interval.
 * A miss drops two stages and comes back in the same session.
 */

export const HOUR = 60 * 60 * 1000
export const DAY = 24 * HOUR

/** Interval to wait after a correct answer at the *new* stage. */
export const STAGE_INTERVALS_MS: readonly number[] = [
  0, // 0 seed: unseen / just missed
  4 * HOUR, // 1
  1 * DAY, // 2
  3 * DAY, // 3
  7 * DAY, // 4
  16 * DAY, // 5
  35 * DAY, // 6 ripe
]

export const MAX_STAGE = STAGE_INTERVALS_MS.length - 1

export type StageName = 'seed' | 'sprout' | 'flower' | 'ripe'

export function stageName(stage: number): StageName {
  if (stage <= 0) return 'seed'
  if (stage <= 2) return 'sprout'
  if (stage <= 4) return 'flower'
  return 'ripe'
}

export interface Attempt {
  /** epoch ms */
  t: number
  ok: boolean
  /** 'exact' | 'tone' | 'length' | 'wrong' | 'en-wrong' | 'en-ok' */
  v: string
  /** exercise modality */
  m: Modality
  /** Which device answered. Absent on attempts written before devices had ids. */
  d?: string
}

export type Modality = 'listen' | 'en-th' | 'th-en' | 'tone' | 'pick'

export interface ItemProgress {
  id: string
  stage: number
  /** epoch ms when the item is next due; 0 = now */
  due: number
  reps: number
  lapses: number
  lastSeen: number
  /** ISO dates (YYYY-MM-DD) on which the item was answered correctly */
  days: string[]
  history: Attempt[]
}

export function newItemProgress(id: string): ItemProgress {
  return { id, stage: 0, due: 0, reps: 0, lapses: 0, lastSeen: 0, days: [], history: [] }
}

export function isoDay(t: number): string {
  const d = new Date(t)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const HISTORY_CAP = 40

/** Apply one attempt and return the updated progress (pure). */
export function applyAttempt(
  p: ItemProgress,
  attempt: Attempt,
  opts?: { practice?: boolean },
): ItemProgress {
  const history = [...p.history, attempt].slice(-HISTORY_CAP)
  if (attempt.ok) {
    const day = isoDay(attempt.t)
    const days = p.days.includes(day) ? p.days : [...p.days, day]
    const dueNow = p.due === 0 || p.due <= attempt.t
    if (!dueNow) {
      return { ...p, reps: p.reps + 1, lastSeen: attempt.t, days, history }
    }
    const stage = Math.min(MAX_STAGE, p.stage + 1)
    return {
      ...p,
      stage,
      due: attempt.t + STAGE_INTERVALS_MS[stage]!,
      reps: p.reps + 1,
      lastSeen: attempt.t,
      days,
      history,
    }
  }
  if (opts?.practice) {
    return { ...p, reps: p.reps + 1, lastSeen: attempt.t, history }
  }
  const slip = attempt.v === 'tone' || attempt.v === 'length'
  return {
    ...p,
    stage: Math.max(0, p.stage - (slip ? 1 : 2)),
    due: attempt.t, // back into the session
    reps: p.reps + 1,
    lapses: slip ? p.lapses : p.lapses + 1,
    lastSeen: attempt.t,
    history,
  }
}

/** Teach face: remember the Look. This is not a scored rep. */
export function applyMeet(p: ItemProgress, t: number): ItemProgress {
  return { ...p, lastSeen: t }
}

export function isDue(p: ItemProgress, now: number): boolean {
  return p.reps > 0 && p.due <= now
}

/** An item counts as mastered when it has flowered and has been right on three separate days. */
export function isMastered(p: ItemProgress): boolean {
  return p.stage >= 3 && p.days.length >= 3
}

export function accuracy(p: ItemProgress): number {
  if (!p.history.length) return 0
  const ok = p.history.filter((h) => h.ok).length
  return ok / p.history.length
}
