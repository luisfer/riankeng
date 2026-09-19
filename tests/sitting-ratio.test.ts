import { describe, expect, it } from 'vitest'
import { entriesForLevel } from '../content/index'
import { levelStatus } from '../src/engine/scheduler'
import { remaining, startSession } from '../src/engine/session'
import { newItemProgress } from '../src/engine/srs'
import { emptyDoc } from '../src/storage/progress-schema'
import { lessonRatio, sittingRatio, startLabel, trailPie } from '../src/ui/bits'

describe('sittingRatio', () => {
  it('is correct over correct plus remaining', () => {
    expect(sittingRatio(0, 16)).toBe(0)
    expect(sittingRatio(4, 12)).toBe(0.25)
    expect(sittingRatio(8, 8)).toBe(0.5)
    expect(sittingRatio(16, 0)).toBe(1)
  })

  it('is 0 when nothing has been queued', () => {
    expect(sittingRatio(0, 0)).toBe(0)
  })
})

describe('one lesson pie', () => {
  it('does not drop the lesson ratio when a sitting starts at 0 correct', () => {
    const now = 1_700_000_000_000
    const doc = emptyDoc(now)
    const level0 = entriesForLevel(0, 'voice')
    expect(level0.length).toBe(50)
    for (const e of level0.slice(0, 17)) {
      doc.items[e.id] = { ...newItemProgress(e.id), reps: 2, stage: 1, lastSeen: now - 1, due: now + 86_400_000 }
    }
    const before = levelStatus(doc, 0, now, 'voice')
    expect(before.seen).toBe(17)
    const intro = trailPie({ lessonSeen: before.seen, lessonTotal: before.total })
    expect(intro?.kind).toBe('lesson')
    expect(intro?.value).toBe(17 / 50)

    const sit = startSession(doc, now, 0, 'voice')
    expect(sit.correct).toBe(0)
    const after = levelStatus(doc, 0, now, 'voice')
    expect(after.seen).toBe(17)
    const pie = trailPie({
      lessonSeen: after.seen,
      lessonTotal: after.total,
      remaining: remaining(sit),
      correct: sit.correct,
    })
    expect(pie?.kind).toBe('lesson')
    expect(pie?.value).toBe(lessonRatio(17, 50))
    expect(pie?.value).toBe(intro?.value)
  })

  it('keeps a sitting pie only when there is no lesson total', () => {
    const pie = trailPie({ remaining: 11, correct: 0 })
    expect(pie?.kind).toBe('sitting')
    expect(pie?.value).toBe(0)
  })

  it('says Sit again when 17 are seen and there is no live sitting', () => {
    expect(startLabel(17, false)).toBe('Sit again')
    expect(startLabel(0, false)).toBe('Begin')
    expect(startLabel(17, true)).toBe('Begin again')
  })
})
