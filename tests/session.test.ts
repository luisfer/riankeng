import { describe, expect, it } from 'vitest'
import { entriesForLevel, getEntry } from '../content/index'
import {
  afterHold,
  afterMeet,
  canContinue,
  currentItem,
  markCorrect,
  markMissMove,
  markMissStay,
  requeueCurrent,
  SESSION_SIZE,
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
  it('returns only th-en until the word has been seen', () => {
    const entry = getEntry('w:maa')!
    for (let i = 0; i < 40; i++) {
      expect(chooseModality(entry, newItemProgress(entry.id), String(i))).toBe('th-en')
    }
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

describe('meet then test', () => {
  it('marks fresh cards as meet and flips the same id', () => {
    const s = startSession(emptyDoc(), 1, 0, 'voice')
    const first = currentItem(s)!
    expect(first.meet).toBe(true)
    expect(first.modality).toBe('th-en')
    const next = afterMeet(s)
    const same = currentItem(next)!
    expect(same.id).toBe(first.id)
    expect(same.meet).toBe(false)
    expect(next.answered).toBe(0)
    expect(next.cursor).toBe(0)
  })
})
