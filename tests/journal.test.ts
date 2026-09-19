import { describe, expect, it } from 'vitest'
import { activeDays, sittingSense, streak, todayStats } from '../src/engine/scheduler'
import { getEntry } from '../content/index'
import { emptyDoc } from '../src/storage/progress-schema'
import { newItemProgress } from '../src/engine/srs'
import { heatMonthMarks, lastWeeks, localDayKey } from '../src/ui/Account'

describe('journal from days', () => {
  it('keeps a mastered day after history has forgotten it', () => {
    const doc = emptyDoc()
    doc.items['w:maa'] = {
      ...newItemProgress('w:maa'),
      reps: 20,
      days: ['2026-01-02'],
      history: [{ t: Date.UTC(2026, 2, 1, 12), ok: true, v: 'exact', m: 'th-en' }],
    }
    const days = activeDays(doc)
    expect(days.get('2026-01-02')).toBeGreaterThan(0)
    expect(days.get('2026-03-01')).toBeGreaterThan(0)
  })

  it('counts today from days when history was capped away', () => {
    const now = Date.UTC(2026, 8, 18, 15)
    const today = '2026-09-18'
    const doc = emptyDoc(now)
    doc.items['w:maa'] = {
      ...newItemProgress('w:maa'),
      reps: 40,
      days: [today],
      history: [{ t: Date.UTC(2026, 0, 1), ok: true, v: 'exact', m: 'th-en' }],
    }
    const stats = todayStats(doc, now)
    expect(stats.answered).toBeGreaterThan(0)
    expect(stats.correct).toBeGreaterThan(0)
    expect(streak(doc, now)).toBeGreaterThan(0)
  })
})

describe('heatmap weeks', () => {
  it('lays out twelve Sunday-first weeks', () => {
    const now = new Date(2026, 8, 18, 12).getTime()
    const cells = lastWeeks(12, now)
    expect(cells).toHaveLength(84)
    const first = new Date(`${cells[0]}T00:00:00`)
    expect(first.getDay()).toBe(0)
    expect(cells).toContain(localDayKey(now))
  })

  it('marks the first Sunday column of each month', () => {
    const now = new Date(2026, 8, 18, 12).getTime()
    const marks = heatMonthMarks(lastWeeks(12, now))
    expect(marks).toHaveLength(12)
    expect(marks.filter(Boolean).length).toBeGreaterThanOrEqual(2)
    expect(marks.some((m) => m === 'Sep')).toBe(true)
  })
})

describe('sittingSense', () => {
  it('shows a sense for Voice dtii', () => {
    const hit = getEntry('w:dtii')!
    const clock = getEntry('w:dtii#2')!
    expect(sittingSense(hit, 'th-en')).toBeTruthy()
    expect(sittingSense(clock, 'th-en')).toBeTruthy()
    expect(sittingSense(hit, 'en-th')).toBeNull()
  })
})
