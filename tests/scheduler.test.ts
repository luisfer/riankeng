import { describe, expect, it } from 'vitest'
import { entriesForLevel, getEntry } from '../content/index'
import { allLevelStatus, chooseModality, pickChoices, seenEntries } from '../src/engine/scheduler'
import { newItemProgress, type ItemProgress } from '../src/engine/srs'
import { emptyDoc } from '../src/storage/progress-schema'

function withReps(id: string, reps = 1): ItemProgress {
  return { ...newItemProgress(id), reps, lastSeen: 1 }
}

describe('chooseModality', () => {
  it('keeps Voice on translation', () => {
    const entry = getEntry('w:maa')!
    const p = newItemProgress(entry.id)
    for (let i = 0; i < 20; i++) {
      const m = chooseModality(entry, { ...p, stage: i % 5 }, String(i))
      expect(['en-th', 'th-en']).toContain(m)
    }
  })

  it('uses pick or writing for Script', () => {
    const entry = getEntry('s:mɔɔ')!
    const m = chooseModality(entry, newItemProgress(entry.id), '1')
    expect(['pick', 'th-en', 'en-th']).toContain(m)
  })
})

describe('seenEntries', () => {
  it('returns Voice items with reps, not unseen ones', () => {
    const doc = emptyDoc()
    doc.items['w:maa'] = withReps('w:maa')
    doc.items['s:maa'] = withReps('s:maa')
    const seen = seenEntries(doc, 'voice')
    expect(seen.map((e) => e.id)).toEqual(['w:maa'])
  })
})

describe('pickChoices', () => {
  it('draws distractors from earlier Script levels and never a lone tone mark', () => {
    const entry = getEntry('s:máa')!
    const choices = pickChoices(entry)
    expect(choices).toContain('ม้า')
    expect(choices.length).toBeGreaterThan(1)
    expect(choices.every((t) => !/^[่้๊๋]$/.test(t))).toBe(true)
    const earlier = entriesForLevel(0, 'script').map((e) => e.thai)
    expect(choices.some((t) => t === 'ม้า' || earlier.includes(t))).toBe(true)
  })
})

describe('script unlock', () => {
  it('opens Script 1 after every Script 0 item has been seen, without mastery', () => {
    const doc = emptyDoc()
    for (const e of entriesForLevel(0, 'script')) {
      doc.items[e.id] = withReps(e.id)
    }
    const script = allLevelStatus(doc, Date.now(), 'script')
    expect(script[0]!.seen).toBe(script[0]!.total)
    expect(script[0]!.complete).toBe(false)
    expect(script[1]!.unlocked).toBe(true)
  })

  it('keeps Voice 1 locked until Voice 0 is mastered', () => {
    const doc = emptyDoc()
    for (const e of entriesForLevel(0, 'voice')) {
      doc.items[e.id] = withReps(e.id)
    }
    const voice = allLevelStatus(doc, Date.now(), 'voice')
    expect(voice[1]!.unlocked).toBe(false)
  })
})
