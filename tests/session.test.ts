import { describe, expect, it } from 'vitest'
import {
  afterHold,
  currentItem,
  markCorrect,
  markMissMove,
  markMissStay,
  requeueCurrent,
  startSession,
} from '../src/engine/session'
import { emptyDoc } from '../src/storage/progress-schema'

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

  it('typed miss stays on the same card through retype', () => {
    const s = startSession(emptyDoc(), 1, 0, 'voice')
    const id = currentItem(s)!.id
    const held = markMissStay(s, { kind: 'retype-en', id, target: 'come' })
    expect(currentItem(held)!.id).toBe(id)
    expect(held.hold?.kind).toBe('retype-en')
    expect(held.answered).toBe(1)
    const after = afterHold(held)
    expect(after.hold).toBeNull()
    expect(after.queue.at(-1)?.id).toBe(id)
    expect(currentItem(after)!.id).not.toBe(id)
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
