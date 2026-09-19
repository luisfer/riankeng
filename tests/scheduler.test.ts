import { describe, expect, it } from 'vitest'
import { entriesForLevel, getEntry } from '../content/index'
import { allLevelStatus, chooseModality, hereLevel, pairRoms, pickChoices, seenEntries, type LevelStatus } from '../src/engine/scheduler'
import { newItemProgress, type ItemProgress } from '../src/engine/srs'
import { emptyDoc } from '../src/storage/progress-schema'

function withReps(id: string, reps = 1): ItemProgress {
  return { ...newItemProgress(id), reps, lastSeen: 1 }
}

describe('chooseModality', () => {
  it('keeps unseen Voice on recognition', () => {
    const entry = getEntry('w:maa')!
    for (let i = 0; i < 20; i++) {
      expect(chooseModality(entry, newItemProgress(entry.id), String(i))).toBe('th-en')
    }
  })

  it('lets Voice 0 listen and name tone after the word has been seen', () => {
    const entry = getEntry('w:maa')!
    const p = { ...newItemProgress(entry.id), reps: 2, stage: 2 }
    const seen = new Set<string>()
    for (let i = 0; i < 40; i++) {
      const m = chooseModality(entry, p, String(i))
      expect(['en-th', 'th-en', 'listen', 'tone']).toContain(m)
      seen.add(m)
    }
    expect(seen.has('listen') || seen.has('tone')).toBe(true)
  })

  it('keeps Script silk ไหม on pick', () => {
    const entry = getEntry('s:mǎi')!
    for (let i = 0; i < 12; i++) {
      expect(chooseModality(entry, { ...newItemProgress(entry.id), stage: i % 4 }, String(i))).toBe('pick')
    }
  })

  it('uses pick or writing for Script', () => {
    const entry = getEntry('s:mɔɔ')!
    const m = chooseModality(entry, newItemProgress(entry.id), '1')
    expect(['pick', 'th-en', 'en-th']).toContain(m)
  })

  it('does not pick listen when the page cannot hear', () => {
    const entry = getEntry('w:maa')!
    const p = { ...newItemProgress(entry.id), reps: 2, stage: 2 }
    for (let i = 0; i < 200; i++) {
      expect(chooseModality(entry, p, String(i), false)).not.toBe('listen')
    }
  })
})

describe('pairRoms', () => {
  it('puts máa and mǎa on the w:maa listen desk', () => {
    const entry = getEntry('w:maa')!
    const roms = pairRoms(entry)
    expect(roms).toContain('maa')
    expect(roms).toContain('máa')
    expect(roms).toContain('mǎa')
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

function status(partial: Partial<LevelStatus> & Pick<LevelStatus, 'n'>): LevelStatus {
  return {
    total: 0,
    seen: 0,
    mastered: 0,
    due: 0,
    unlocked: true,
    complete: false,
    progress: 0,
    ...partial,
  }
}

describe('hereLevel', () => {
  it('bookmarks Voice 0 on a fresh doc', () => {
    const voice = allLevelStatus(emptyDoc(), Date.now(), 'voice')
    expect(hereLevel(voice)).toBe(0)
  })

  it('skips empty soon levels and finished ones', () => {
    expect(
      hereLevel([
        status({ n: 0, total: 2, seen: 2, mastered: 2, complete: true, progress: 1 }),
        status({ n: 1, total: 0, unlocked: true }),
        status({ n: 2, total: 3, unlocked: true }),
      ]),
    ).toBe(2)
  })

  it('is null when every authored level is complete', () => {
    expect(
      hereLevel([
        status({ n: 0, total: 2, seen: 2, mastered: 2, complete: true, progress: 1 }),
        status({ n: 1, total: 2, seen: 2, mastered: 2, complete: true, progress: 1 }),
      ]),
    ).toBeNull()
  })
})
