import { ENTRIES, entryTrack, entriesForLevel, getEntry, levelsFor } from '@content/index'
import type { TrackId } from '@content/types'
import type { Entry } from '@content/types'
import type { ProgressDoc } from '@/storage/progress-schema'
import { cleanGloss } from './grader-en'
import { isoDay, isDue, isMastered, newItemProgress, type ItemProgress, type Modality } from './srs'

export interface LevelStatus {
  n: number
  total: number
  seen: number
  /** At least one correct answer. Script unlocks on this, not a miss. */
  passed: number
  mastered: number
  due: number
  /** Learner may work on this level. */
  unlocked: boolean
  /** Every item mastered. */
  complete: boolean
  /** Proportion 0–1 of scored items. Look does not count. */
  progress: number
}

/** The count that unlocks the next level: mastery on Voice, one correct on Script. */
export function unlockCount(s: LevelStatus, track: TrackId): number {
  return track === 'script' ? s.passed : s.mastered
}

export function progressFor(doc: ProgressDoc, id: string): ItemProgress {
  return doc.items[id] ?? newItemProgress(id)
}

export function levelStatus(doc: ProgressDoc, n: number, now = Date.now(), track: TrackId = 'voice'): LevelStatus {
  const entries = entriesForLevel(n, track)
  let seen = 0
  let passed = 0
  let mastered = 0
  let due = 0
  for (const e of entries) {
    const p = progressFor(doc, e.id)
    if (p.reps > 0) seen++
    if (hasPassed(p)) passed++
    if (isMastered(p)) mastered++
    if (isDue(p, now)) due++
  }
  const complete = entries.length > 0 && mastered === entries.length
  const unlocked = n === 0 || scriptLevelOpened(levelStatus(doc, n - 1, now, track), track)
  return {
    n,
    total: entries.length,
    seen,
    passed,
    mastered,
    due,
    unlocked,
    complete,
    progress: entries.length ? seen / entries.length : 0,
  }
}

export function openedFloor(doc: ProgressDoc, track: TrackId): number {
  return doc.opened?.[track] ?? 0
}

export function withOpened(doc: ProgressDoc, track: TrackId, n: number): ProgressDoc {
  const have = openedFloor(doc, track)
  if (n <= have) return doc
  return {
    ...doc,
    opened: { voice: doc.opened?.voice ?? 0, script: doc.opened?.script ?? 0, [track]: n },
  }
}

/** Remember every level that has opened, so a later miss cannot lock it again. */
export function stampOpened(doc: ProgressDoc, now = Date.now()): ProgressDoc {
  let next = doc
  for (const track of ['voice', 'script'] as const) {
    for (const lvl of levelsFor(track)) {
      const s = levelStatus(doc, lvl.n, now, track)
      if (scriptLevelOpened(s, track)) next = withOpened(next, track, lvl.n + 1)
    }
  }
  return next
}

export function allLevelStatus(doc: ProgressDoc, now = Date.now(), track: TrackId = 'voice'): LevelStatus[] {
  const out: LevelStatus[] = []
  let prevComplete = true
  const floor = openedFloor(doc, track)
  for (const lvl of levelsFor(track)) {
    const s = levelStatus(doc, lvl.n, now, track)
    s.unlocked = lvl.n === 0 || lvl.n <= floor || prevComplete
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

/** First unlocked level that is not yet finished. Script finishes on passed, Voice on mastery. */
export function hereLevel(statuses: LevelStatus[], track: TrackId = 'voice'): number | null {
  for (const s of statuses) {
    if (s.total === 0) continue
    if (!s.unlocked) continue
    const done = track === 'script' ? s.passed >= s.total : s.complete
    if (!done) return s.n
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

export function hasPassed(p: ItemProgress): boolean {
  if (p.days.length > 0) return true
  return p.history.some((h) => h.ok)
}

/** Script opens the next level once every item has been right once. Voice still waits for mastery. */
export function scriptLevelOpened(s: LevelStatus, track: TrackId): boolean {
  if (s.total === 0) return s.complete
  if (track === 'script') return s.passed >= s.total
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

/** Seen cards on every track, overdue first. */
export function reviewEntries(doc: ProgressDoc, now = Date.now()): Entry[] {
  const rows: { e: Entry; due: number; overdue: boolean }[] = []
  for (const e of ENTRIES) {
    const p = doc.items[e.id]
    if (!p || p.reps === 0) continue
    rows.push({ e, due: p.due, overdue: isDue(p, now) })
  }
  rows.sort((a, b) => {
    if (a.overdue !== b.overdue) return a.overdue ? -1 : 1
    if (a.overdue && b.overdue) return a.due - b.due
    return a.e.id.localeCompare(b.e.id)
  })
  return rows.map((r) => r.e)
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
 * Pick the exercise for an item given its stage. Voice 0 asks the ear from the
 * first sitting. A lapse can listen or produce; it is not stuck on recognition.
 * Flowers and ripe items get everything, weighted towards production and dictation.
 */
export function chooseModality(entry: Entry, p: ItemProgress, salt: string, canHear = true): Modality {
  const r = hash(entry.id + salt)
  if (entryTrack(entry) === 'script') {
    if (entry.thai === 'ไหม' && /silk/i.test(entry.en[0] ?? '')) return 'pick'
    if (p.stage <= 0) return r < 0.55 ? 'pick' : 'th-en'
    if (r < 0.35) return 'pick'
    if (r < 0.7) return 'th-en'
    return 'en-th'
  }
  let next: Modality
  if (entry.level === 0) {
    if (canHear && entry.minimalPairOf?.length) {
      if (r < 0.5) next = 'listen'
      else if (r < 0.65) next = 'th-en'
      else if (r < 0.8) next = 'en-th'
      else next = 'tone'
    } else if (r < 0.3) next = 'th-en'
    else if (r < 0.55) next = 'en-th'
    else if (r < 0.8) next = 'listen'
    else next = 'tone'
  } else if (p.stage <= 0) {
    if (r < 0.4) next = 'en-th'
    else if (r < 0.7) next = 'th-en'
    else if (r < 0.85) next = 'listen'
    else next = 'tone'
  } else if (r < 0.35) next = 'th-en'
  else if (r < 0.7) next = 'en-th'
  else if (r < 0.85) next = 'listen'
  else next = 'tone'
  // A tone drill on "sà-wàt-dii kráp/kâ" would ask for both particles' tones at once.
  if (next === 'tone' && entry.rom.includes('/')) next = 'th-en'
  if ((next === 'listen' || next === 'tone') && !canHear) return 'th-en'
  return next
}

/** This word’s rom plus the authored siblings, shuffled so the answer is not first. */
export function pairRoms(entry: Entry): string[] {
  const roms = [entry.rom]
  for (const id of entry.minimalPairOf ?? []) {
    const other = getEntry(id)
    if (other && !roms.includes(other.rom)) roms.push(other.rom)
  }
  return roms.sort((a, b) => hash(entry.id + ':pair:' + a) - hash(entry.id + ':pair:' + b))
}

export function entryOrThrow(id: string): Entry {
  const e = getEntry(id)
  if (!e) throw new Error(`Unknown entry ${id}`)
  return e
}

/** Script “from Voice” only after a scored attempt on the linked Voice card. */
export function fromVoiceKnown(doc: ProgressDoc, entry: Entry): boolean {
  for (const tag of entry.tags) {
    if (!tag.startsWith('voice:')) continue
    const id = tag.slice('voice:'.length)
    if ((doc.items[id]?.reps ?? 0) > 0) return true
  }
  return false
}

const LONE_TONE_MARK = /^[่้๊๋]$/

/**
 * Four Thai spellings: the right one plus three from this Script level and earlier ones.
 * Never one the prompt fits as well, such as ฆ beside ค (both low-class k) or ใ beside ไ.
 */
export function pickChoices(entry: Entry): string[] {
  const prompt = cleanGloss(entry.en[0] ?? '').toLowerCase()
  const seenThai = new Set<string>([entry.thai])
  for (const e of ENTRIES) {
    if (entryTrack(e) === 'script' && cleanGloss(e.en[0] ?? '').toLowerCase() === prompt) seenThai.add(e.thai)
  }
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
