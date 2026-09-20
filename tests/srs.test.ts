import { describe, expect, it } from 'vitest'
import { DAY, HOUR, applyAttempt, applyMeet, isDue, isMastered, newItemProgress, stageName } from '../src/engine/srs'

const t0 = Date.UTC(2026, 8, 17, 12)

describe('srs', () => {
  it('grows one stage per correct answer and schedules the interval', () => {
    let p = newItemProgress('w:maa')
    p = applyAttempt(p, { t: t0, ok: true, v: 'exact', m: 'listen' })
    expect(p.stage).toBe(1)
    expect(p.due).toBe(t0 + 4 * HOUR)
    p = applyAttempt(p, { t: t0 + 5 * HOUR, ok: true, v: 'exact', m: 'en-th' })
    expect(p.stage).toBe(2)
    expect(p.due).toBe(t0 + 5 * HOUR + DAY)
  })

  it('drops two stages on a miss and is due immediately', () => {
    let p = { ...newItemProgress('x'), stage: 4, due: t0 + DAY }
    p = applyAttempt(p, { t: t0, ok: false, v: 'wrong', m: 'listen' })
    expect(p.stage).toBe(2)
    expect(p.due).toBe(t0)
    expect(p.lapses).toBe(1)
    expect(isDue(p, t0)).toBe(true)
  })

  it('drops one stage on a tone slip and does not count a lapse', () => {
    let p = { ...newItemProgress('x'), stage: 4, due: t0 + DAY, reps: 3 }
    p = applyAttempt(p, { t: t0, ok: false, v: 'tone', m: 'en-th' })
    expect(p.stage).toBe(3)
    expect(p.lapses).toBe(0)
    expect(p.due).toBe(t0)
  })

  it('marks a meet as seen without growing the stage', () => {
    const p = applyMeet(newItemProgress('w:maa'), t0)
    expect(p.reps).toBe(1)
    expect(p.stage).toBe(0)
    expect(p.days).toEqual([])
    expect(p.due).toBe(t0)
  })

  it('never goes below seed', () => {
    const p = applyAttempt(newItemProgress('x'), { t: t0, ok: false, v: 'wrong', m: 'en-th' })
    expect(p.stage).toBe(0)
  })

  it('mastery needs stage 3 and three distinct days', () => {
    let p = newItemProgress('x')
    p = applyAttempt(p, { t: t0, ok: true, v: 'exact', m: 'listen' })
    p = applyAttempt(p, { t: t0 + 1 * HOUR, ok: true, v: 'exact', m: 'listen' })
    p = applyAttempt(p, { t: t0 + 2 * HOUR, ok: true, v: 'exact', m: 'listen' })
    expect(p.stage).toBe(3)
    expect(isMastered(p)).toBe(false) // same day
    p = applyAttempt(p, { t: t0 + DAY, ok: true, v: 'exact', m: 'listen' })
    p = applyAttempt(p, { t: t0 + 2 * DAY, ok: true, v: 'exact', m: 'listen' })
    expect(isMastered(p)).toBe(true)
  })

  it('names stages', () => {
    expect(stageName(0)).toBe('seed')
    expect(stageName(2)).toBe('sprout')
    expect(stageName(4)).toBe('flower')
    expect(stageName(6)).toBe('ripe')
  })

  it('unseen items are not due', () => {
    expect(isDue(newItemProgress('x'), t0)).toBe(false)
  })
})
