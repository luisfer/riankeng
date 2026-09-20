import { describe, expect, it } from 'vitest'
import { entriesForLevel, getEntry } from '../content/index'
import {
  afterHold,
  afterMeet,
  canContinue,
  canResumeReview,
  currentItem,
  markCorrect,
  markMissMove,
  markMissStay,
  requeueCurrent,
  REVIEW_TAIL,
  SESSION_SIZE,
  startReviewSession,
  startSession,
} from '../src/engine/session'
import { chooseModality } from '../src/engine/scheduler'
import { emptyDoc } from '../src/storage/progress-schema'
import { newItemProgress, type ItemProgress } from '../src/engine/srs'

describe('session transitions', () => {
  it('markCorrect advances and scores', () => {
    const s = startSession(emptyDoc(), 1, 0, 'voice')
    expect(s.queue.length).toBeGreaterThan(1)
    const next = markCorrect(s)
    expect(next.cursor).toBe(1)
    expect(next.correct).toBe(1)
    expect(next.answered).toBe(1)
    expect(next.hold).toBeNull()
  })

  it('typed Thai miss stays on the same card through retype', () => {
    const s = startSession(emptyDoc(), 1, 0, 'voice')
    const id = currentItem(s)!.id
    const held = markMissStay(s, { kind: 'retype-th', id, target: 'maa' })
    expect(currentItem(held)!.id).toBe(id)
    expect(held.hold?.kind).toBe('retype-th')
    expect(held.answered).toBe(1)
    const after = afterHold(held)
    expect(after.hold).toBeNull()
    expect(after.queue.at(-1)?.id).toBe(id)
    expect(currentItem(after)!.id).not.toBe(id)
  })

  it('typed English miss waits, then requeues on Next', () => {
    const s = startSession(emptyDoc(), 1, 0, 'voice')
    const id = currentItem(s)!.id
    const missed = markMissMove(s)
    expect(currentItem(missed)!.id).toBe(id)
    expect(missed.hold).toBeNull()
    expect(missed.answered).toBe(1)
    const next = requeueCurrent(missed)
    expect(next.queue.at(-1)?.id).toBe(id)
  })

  it('pick miss waits, then requeues on Next', () => {
    const s = startSession(emptyDoc(), 1, 0, 'script')
    const id = currentItem(s)!.id
    const missed = markMissMove(s)
    expect(currentItem(missed)!.id).toBe(id)
    expect(missed.answered).toBe(1)
    const next = requeueCurrent(missed)
    expect(next.queue.at(-1)?.id).toBe(id)
  })
})

function dueItem(id: string, now: number): ItemProgress {
  return { ...newItemProgress(id), reps: 3, lastSeen: now - 1, due: now - 1, stage: 2 }
}

describe('startSession belongs to the opened level', () => {
  it('keeps level-4 cards when sixteen earlier dues are waiting', () => {
    const now = 1_700_000_000_000
    const doc = emptyDoc(now)
    const early = entriesForLevel(0, 'voice')
      .concat(entriesForLevel(1, 'voice'), entriesForLevel(2, 'voice'), entriesForLevel(3, 'voice'))
      .slice(0, 16)
    expect(early.length).toBe(16)
    for (const e of early) doc.items[e.id] = dueItem(e.id, now)
    const s = startSession(doc, now, 4, 'voice')
    const level4 = new Set(entriesForLevel(4, 'voice').map((e) => e.id))
    expect(s.queue.some((q) => level4.has(q.id))).toBe(true)
    expect(s.queue.filter((q) => level4.has(q.id)).length).toBeGreaterThan(0)
    expect(s.level).toBe(4)
    expect(s.queue.length).toBeLessThanOrEqual(SESSION_SIZE)
  })

  it('honors newPerSession for fresh cards on the opened level', () => {
    const now = 2
    const doc = emptyDoc(now)
    doc.settings.newPerSession = 3
    const s = startSession(doc, now, 0, 'voice')
    const fresh = s.queue.filter((q) => (doc.items[q.id]?.reps ?? 0) === 0)
    expect(fresh.length).toBeLessThanOrEqual(3)
  })

  it('offers Continue for the same track and level', () => {
    const s = startSession(emptyDoc(), 3, 0, 'voice')
    expect(canContinue(s, 'voice', 0)).toBe(true)
    expect(canContinue(s, 'voice', 4)).toBe(false)
    expect(canContinue(markCorrect({ ...s, queue: s.queue.slice(0, 1) }), 'voice', 0)).toBe(false)
  })
})

describe('Voice 0 can listen and name tone', () => {
  it('can listen or name tone on the first sitting', () => {
    const entry = getEntry('w:maa')!
    const seen = new Set<string>()
    for (let i = 0; i < 80; i++) seen.add(chooseModality(entry, newItemProgress(entry.id), String(i)))
    expect(seen.has('listen') || seen.has('tone')).toBe(true)
  })

  it('returns listen or tone for some Voice 0 salts after reps', () => {
    const entry = getEntry('w:maa')!
    const seen = new Set<string>()
    const p = { ...newItemProgress(entry.id), reps: 2, stage: 2 }
    for (let i = 0; i < 200; i++) seen.add(chooseModality(entry, p, String(i)))
    expect(seen.has('listen')).toBe(true)
    expect(seen.has('tone')).toBe(true)
    expect(seen.has('th-en')).toBe(true)
  })
})

describe('review sitting', () => {
  it('sits at most sixteen seen cards without a meet', () => {
    const now = 9
    const doc = emptyDoc(now)
    const ids = entriesForLevel(0, 'voice').slice(0, 20).map((e) => e.id)
    expect(ids.length).toBe(20)
    for (const id of ids) doc.items[id] = dueItem(id, now)
    const s = startReviewSession(doc, now, ids, 'voice')
    expect(s.queue.length).toBe(SESSION_SIZE)
    expect(s.queue.every((q) => q.meet === false)).toBe(true)
    expect(s.review).toBe(true)
    expect(canContinue(s, 'voice', 0)).toBe(false)
    expect(canResumeReview(s)).toBe(true)
  })
})

describe('meet then test', () => {
  it('sends the test later in the sitting so it is not an echo', () => {
    const s = startSession(emptyDoc(), 1, 0, 'voice')
    expect(s.queue.length).toBeGreaterThan(1)
    const first = currentItem(s)!
    expect(first.meet).toBe(true)
    const next = afterMeet(s)
    expect(currentItem(next)!.id).not.toBe(first.id)
    expect(next.queue.at(-1)?.id).toBe(first.id)
    expect(next.queue.at(-1)?.meet).toBe(false)
    expect(next.answered).toBe(0)
  })
})

describe('startSession leftover', () => {
  it('does not fill a half-done level with not-due leftovers', () => {
    const now = 1_700_000_000_000
    const doc = emptyDoc(now)
    const level0 = entriesForLevel(0, 'voice')
    for (const e of level0.slice(0, 17)) {
      doc.items[e.id] = { ...newItemProgress(e.id), reps: 2, stage: 1, lastSeen: now - 1, due: now + 86_400_000 }
    }
    const s = startSession(doc, now, 0, 'voice')
    const leftoverIds = new Set(level0.slice(0, 17).map((e) => e.id))
    expect(s.queue.some((q) => leftoverIds.has(q.id))).toBe(false)
    expect(s.queue.length).toBeLessThanOrEqual(doc.settings.newPerSession)
  })

  it('reserves earlier dues instead of stuffing leftovers', () => {
    const now = 1_700_000_000_000
    const doc = emptyDoc(now)
    const early = entriesForLevel(0, 'voice').slice(0, REVIEW_TAIL)
    for (const e of early) doc.items[e.id] = dueItem(e.id, now)
    const s = startSession(doc, now, 4, 'voice')
    const earlyIds = new Set(early.map((e) => e.id))
    expect(s.queue.filter((q) => earlyIds.has(q.id)).length).toBe(REVIEW_TAIL)
  })
})
