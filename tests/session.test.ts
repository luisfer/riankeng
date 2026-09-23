import { describe, expect, it } from 'vitest'
import { entriesForLevel, getEntry } from '../content/index'
import {
  afterHold,
  afterMeet,
  alreadyScored,
  canContinue,
  canResumeReview,
  currentItem,
  markCorrect,
  markMissMove,
  markMissStay,
  markScored,
  normalizeSession,
  pauseSession,
  requeueCurrent,
  REVIEW_TAIL,
  SESSION_SIZE,
  sittingModality,
  startReviewSession,
  startSession,
} from '../src/engine/session'
import { chooseModality } from '../src/engine/scheduler'
import { emptyDoc } from '../src/storage/progress-schema'
import { newItemProgress, type ItemProgress } from '../src/engine/srs'
import { pickPrompt } from '../src/ui/Session'

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

  it('can check a missed card when it comes back', () => {
    const s = startSession(emptyDoc(), 1, 0, 'voice')
    const id = currentItem(s)!.id
    const missed = markMissMove(markScored(s, { ok: false, text: 'No.' }))
    const back = requeueCurrent(missed)
    expect(currentItem(back)!.id).not.toBe(id)
    const again = back.queue.find((q) => q.id === id)
    expect(again?.scored).toBe(false)
    const current = { ...back, cursor: back.queue.findIndex((q) => q.id === id) }
    expect(alreadyScored(current)).toBe(false)
    const scored = markScored(current, { ok: true, text: 'Right.' })
    expect(scored.pending?.ok).toBe(true)
  })

  it('afterMeet keeps the cursor on a lone tested card', () => {
    const s = startSession(emptyDoc(), 1, 0, 'voice')
    const one = { ...s, queue: [{ ...currentItem(s)!, meet: true }], cursor: 0 }
    const next = afterMeet(one)
    expect(next.cursor).toBe(0)
    expect(currentItem(next)?.meet).toBe(false)
    expect(currentItem(next)?.id).toBe(currentItem(s)!.id)
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

describe('requeue after a Check', () => {
  it('lets the missed card be checked again', () => {
    const s = startSession(emptyDoc(), 1, 0, 'voice')
    const missed = markMissMove(markScored(s, { ok: false, text: 'No.' }))
    const back = requeueCurrent(missed)
    expect(alreadyScored(back)).toBe(false)
    expect(currentItem(back)!.scored).toBeFalsy()
    const again = markScored(back, { ok: true, text: 'Right.' })
    expect(again.pending?.ok).toBe(true)
  })

  it('clears a stale scored flag when pending is gone', () => {
    const s = startSession(emptyDoc(), 1, 0, 'voice')
    const stuck = { ...s, queue: s.queue.map((q, i) => (i === 0 ? { ...q, scored: true } : q)) }
    const next = normalizeSession(stuck)
    expect(currentItem(next)!.scored).toBe(false)
    expect(alreadyScored(next)).toBe(false)
  })
})

describe('check once', () => {
  it('ignores a second Check and Pause after a correct Check advances', () => {
    const s = startSession(emptyDoc(), 1, 0, 'voice')
    const scored = markScored(s, { ok: true, text: 'Right.' })
    expect(alreadyScored(scored)).toBe(true)
    expect(currentItem(scored)!.scored).toBe(true)
    const again = markScored(scored, { ok: false, text: 'again' })
    expect(again.pending).toEqual({ ok: true, text: 'Right.' })
    const paused = pauseSession(scored)
    expect(paused.cursor).toBe(s.cursor + 1)
    expect(paused.correct).toBe(1)
    expect(paused.pending).toBeUndefined()
    expect(currentItem(paused)?.id).not.toBe(currentItem(s)!.id)
  })

  it('does not apply a second miss on Pause after a wrong Check', () => {
    const s = startSession(emptyDoc(), 1, 0, 'voice')
    const missed = markMissMove(markScored(s, { ok: false, text: 'No.' }))
    expect(missed.answered).toBe(1)
    const paused = pauseSession(missed)
    expect(paused.answered).toBe(1)
    expect(paused.cursor).toBe(s.cursor)
    expect(paused.pending?.ok).toBe(false)
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
    expect(next.cursor).toBe(0)
  })

  it('keeps the cursor on a last-in-queue Look', () => {
    const s = startSession(emptyDoc(), 1, 0, 'voice')
    const last = { ...s, queue: [currentItem(s)!], cursor: 0 }
    const next = afterMeet(last)
    expect(next.cursor).toBe(0)
    expect(currentItem(next)?.meet).toBe(false)
    expect(next.queue).toHaveLength(1)
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

  it('rotates leftovers from that level by oldest lastSeen', () => {
    const now = 1_700_000_000_000
    const doc = emptyDoc(now)
    const level0 = entriesForLevel(0, 'voice')
    for (const [i, e] of level0.entries()) {
      doc.items[e.id] = {
        ...newItemProgress(e.id),
        reps: 2,
        stage: 1,
        lastSeen: now - (level0.length - i),
        due: now + 86_400_000,
      }
    }
    const s = startSession(doc, now, 0, 'voice')
    expect(s.queue).toHaveLength(SESSION_SIZE)
    expect(s.queue.map((q) => q.id)).toEqual(level0.slice(0, SESSION_SIZE).map((e) => e.id))
  })

  it('puts due reviews before new cards', () => {
    const now = 1_700_000_000_000
    const doc = emptyDoc(now)
    const level0 = entriesForLevel(0, 'voice')
    const due = level0.slice(0, 4)
    for (const e of due) doc.items[e.id] = dueItem(e.id, now - e.id.length)
    const s = startSession(doc, now, 0, 'voice')
    const dueIdsOnQ = s.queue.filter((q) => due.some((e) => e.id === q.id)).map((q) => q.id)
    expect(dueIdsOnQ.length).toBe(4)
    expect(s.queue.slice(0, 4).every((q) => due.some((e) => e.id === q.id))).toBe(true)
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

describe('sittingModality', () => {
  it('renders listen and tone as writing when the card cannot be heard', () => {
    const s = startSession(emptyDoc(), 1, 0, 'voice')
    expect(sittingModality({ ...currentItem(s)!, modality: 'listen' }, false)).toBe('th-en')
    expect(sittingModality({ ...currentItem(s)!, modality: 'tone' }, false)).toBe('th-en')
    expect(sittingModality({ ...currentItem(s)!, modality: 'tone' }, true)).toBe('tone')
  })
})

describe('pick prompt', () => {
  it('is the English gloss only, with no rom', () => {
    const silk = getEntry('s:mǎi')!
    const prompt = pickPrompt(silk)
    expect(prompt).toBe('silk')
    expect(prompt).not.toMatch(/mǎi/)
    expect(prompt).not.toMatch(silk.rom)
  })
})
