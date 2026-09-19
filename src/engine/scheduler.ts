import { ENTRIES, entryTrack, entriesForLevel, getEntry, levelsFor } from '@content/index'
import type { TrackId } from '@content/types'
import type { Entry } from '@content/types'
import type { ProgressDoc } from '@/storage/progress-schema'
import { isoDay, isDue, isMastered, newItemProgress, type ItemProgress, type Modality } from './srs'

export interface LevelStatus {
  n: number
  total: number
  seen: number
  mastered: number
  due: number
  /** Learner may work on this level. */
  unlocked: boolean
  /** Every item mastered. */
  complete: boolean
  /** Proportion 0–1 of items at stage ≥ 1. */
  progress: number
}

export function progressFor(doc: ProgressDoc, id: string): ItemProgress {
  return doc.items[id] ?? newItemProgress(id)
}

export function levelStatus(doc: ProgressDoc, n: number, now = Date.now(), track: TrackId = 'voice'): LevelStatus {
  const entries = entriesForLevel(n, track)
  let seen = 0
  let mastered = 0
  let due = 0
  for (const e of entries) {
    const p = progressFor(doc, e.id)
    if (p.reps > 0) seen++
    if (isMastered(p)) mastered++
    if (isDue(p, now)) due++
  }
  const complete = entries.length > 0 && mastered === entries.length
  const unlocked = n === 0 || scriptLevelOpened(levelStatus(doc, n - 1, now, track), track)
  return {
    n,
    total: entries.length,
    seen,
    mastered,
    due,
    unlocked,
    complete,
    progress: entries.length ? seen / entries.length : 0,
  }
}

export function allLevelStatus(doc: ProgressDoc, now = Date.now(), track: TrackId = 'voice'): LevelStatus[] {
  const out: LevelStatus[] = []
  let prevComplete = true
  for (const lvl of levelsFor(track)) {
    const s = levelStatus(doc, lvl.n, now, track)
    s.unlocked = prevComplete
    out.push(s)
    prevComplete = scriptLevelOpened(s, track)
  }
  return out
}

/** The lowest level that is not complete and has content. */
export function currentLevel(doc: ProgressDoc, now = Date.now(), track: TrackId = 'voice'): number {
  const statuses = allLevelStatus(doc, now, track)
  for (const s of statuses) {
    if (s.total === 0) continue
    if (!s.complete) return s.n
  }
  return levelsFor(track).length - 1
}

/** First unlocked, incomplete level that has cards. Null if the track is finished. */
export function hereLevel(statuses: LevelStatus[]): number | null {
  for (const s of statuses) {
    if (s.total === 0) continue
    if (s.unlocked && !s.complete) return s.n
  }
  return null
}

/** All due item ids on this track, most overdue first. */
export function dueIds(doc: ProgressDoc, now = Date.now(), track: TrackId = 'voice'): string[] {
  const due: ItemProgress[] = []
  for (const e of ENTRIES) {
    if (entryTrack(e) !== track) continue
    const p = doc.items[e.id]
    if (p && isDue(p, now)) due.push(p)
  }
  due.sort((a, b) => a.due - b.due)
  return due.map((p) => p.id)
}

/** Script opens the next level once every item has been seen. Voice still waits for mastery. */
export function scriptLevelOpened(s: LevelStatus, track: TrackId): boolean {
  if (s.total === 0) return s.complete
  if (track === 'script') return s.seen >= s.total
  return s.complete
}

/** Entries on a track the learner has answered at least once. */
export function seenEntries(doc: ProgressDoc, track: TrackId = 'voice'): Entry[] {
  const out: Entry[] = []
  for (const e of ENTRIES) {
    if (entryTrack(e) !== track) continue
    const p = doc.items[e.id]
    if (p && p.reps > 0) out.push(e)
  }
  return out
}

export function shuffleSeen<T extends { id: string }>(items: T[], salt: string, take: number): T[] {
  return [...items].sort((a, b) => hash(`${salt}:${a.id}`) - hash(`${salt}:${b.id}`)).slice(0, take)
}

/** Total items answered today and correct today. History for counts; `days` so a capped history cannot hide today. */
export function todayStats(doc: ProgressDoc, now = Date.now()): { answered: number; correct: number } {
  const today = isoDay(now)
  const start = new Date(now)
  start.setHours(0, 0, 0, 0)
  const startMs = start.getTime()
  let answered = 0
  let correct = 0
  for (const p of Object.values(doc.items)) {
    let fromHistory = 0
    for (const h of p.history) {
      if (h.t >= startMs) {
        answered++
        fromHistory++
        if (h.ok) correct++
      }
    }
    if (fromHistory === 0 && p.days.includes(today)) {
      answered++
      correct++
    }
  }
  return { answered, correct }
}

/** Days with at least one answer. Union durable `days` with history so the grid cannot forget a mastered day. */
export function activeDays(doc: ProgressDoc): Map<string, number> {
  const m = new Map<string, number>()
  for (const p of Object.values(doc.items)) {
    for (const key of p.days) {
      if (!m.has(key)) m.set(key, 0)
    }
    for (const h of p.history) {
      const key = isoDay(h.t)
      m.set(key, (m.get(key) ?? 0) + 1)
    }
    for (const key of p.days) {
      if ((m.get(key) ?? 0) === 0) m.set(key, 1)
    }
  }
  return m
}

export function streak(doc: ProgressDoc, now = Date.now()): number {
  const days = activeDays(doc)
  let n = 0
  const d = new Date(now)
  for (;;) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    if (days.has(key)) n++
    else if (n > 0 || key !== todayKey(now)) break
    d.setDate(d.getDate() - 1)
    if (n > 3650) break
  }
  return n
}

function todayKey(now: number): string {
  const d = new Date(now)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Small deterministic hash for modality choice. */
export function hash(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967296
}

/** Another catalog entry shares this romanization (Voice) or this Thai spelling (Script). */
export function sittingSense(entry: Entry, modality: Modality): string | null {
  if (modality !== 'th-en') return null
  const track = entryTrack(entry)
  if (track === 'script') {
    const twin = ENTRIES.some((e) => entryTrack(e) === 'script' && e.id !== entry.id && e.thai === entry.thai)
    return twin ? (entry.en[0] ?? null) : null
  }
  const twin = ENTRIES.some((e) => entryTrack(e) === 'voice' && e.id !== entry.id && e.rom === entry.rom)
  if (!twin) return null
  return entry.note || entry.thai
}

/**
 * Pick the exercise for an item given its stage. Seeds first meet the learner
 * in recognition, sprouts are forced to produce, flowers and ripe items get
 * everything, weighted towards production and dictation.
 */
export function chooseModality(entry: Entry, p: ItemProgress, salt: string): Modality {
  const r = hash(entry.id + salt)
  if (entryTrack(entry) === 'script') {
    if (entry.thai === 'ไหม' && /silk/i.test(entry.en[0] ?? '')) return 'pick'
    if (p.stage <= 0) return r < 0.55 ? 'pick' : 'th-en'
    if (r < 0.35) return 'pick'
    if (r < 0.7) return 'th-en'
    return 'en-th'
  }
  if (p.reps === 0 || p.stage <= 0) return 'th-en'
  if (entry.level === 0) {
    if (r < 0.3) return 'th-en'
    if (r < 0.55) return 'en-th'
    if (r < 0.8) return 'listen'
    return 'tone'
  }
  if (r < 0.35) return 'th-en'
  if (r < 0.7) return 'en-th'
  if (r < 0.85) return 'listen'
  return 'tone'
}

export function entryOrThrow(id: string): Entry {
  const e = getEntry(id)
  if (!e) throw new Error(`Unknown entry ${id}`)
  return e
}

const LONE_TONE_MARK = /^[่้๊๋]$/

/** Four Thai spellings: the right one plus three from this Script level and earlier ones. */
export function pickChoices(entry: Entry): string[] {
  const seenThai = new Set<string>([entry.thai])
  const others: string[] = []
  for (const e of ENTRIES) {
    if (entryTrack(e) !== 'script') continue
    if (e.level > entry.level) continue
    if (e.id === entry.id || e.thai === entry.thai) continue
    if (LONE_TONE_MARK.test(e.thai)) continue
    if (seenThai.has(e.thai)) continue
    seenThai.add(e.thai)
    others.push(e.thai)
  }
  const extra = others.sort((a, b) => hash(entry.id + a) - hash(entry.id + b)).slice(0, 3)
  return [entry.thai, ...extra].sort((a, b) => hash(entry.id + ':p:' + a) - hash(entry.id + ':p:' + b))
}
