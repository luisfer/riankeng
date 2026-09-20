import { describe, expect, it } from 'vitest'
import { entriesForLevel } from '../content/index'
import { allLevelStatus, levelStatus } from '../src/engine/scheduler'
import { remaining, startSession } from '../src/engine/session'
import { applyMeet, newItemProgress } from '../src/engine/srs'
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
      doc.items[e.id] = {
        ...newItemProgress(e.id),
        reps: 5,
        stage: 3,
        lastSeen: now - 1,
        due: now + 86_400_000,
        days: ['2026-01-01', '2026-01-02', '2026-01-03'],
      }
    }
    const before = levelStatus(doc, 0, now, 'voice')
    expect(before.mastered).toBe(17)
    const intro = trailPie({ lessonSeen: before.mastered, lessonTotal: before.total })
    expect(intro?.kind).toBe('lesson')
    expect(intro?.value).toBe(17 / 50)

    const sit = startSession(doc, now, 0, 'voice')
    expect(sit.correct).toBe(0)
    const after = levelStatus(doc, 0, now, 'voice')
    expect(after.mastered).toBe(17)
    const pie = trailPie({
      lessonSeen: after.mastered,
      lessonTotal: after.total,
      remaining: remaining(sit),
      correct: sit.correct,
    })
    expect(pie?.kind).toBe('lesson')
    expect(pie?.value).toBe(lessonRatio(17, 50))
    expect(pie?.value).toBe(intro?.value)
  })

  it('stays empty after Look only, and Voice 1 stays locked', () => {
    const now = 1_700_000_000_000
    const doc = emptyDoc(now)
    for (const e of entriesForLevel(0, 'voice')) {
      doc.items[e.id] = applyMeet(newItemProgress(e.id), now)
    }
    const voice = allLevelStatus(doc, now, 'voice')
    expect(voice[0]!.seen).toBe(0)
    expect(trailPie({ lessonSeen: voice[0]!.mastered, lessonTotal: voice[0]!.total })?.value).toBe(0)
    expect(voice[1]!.unlocked).toBe(false)
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
