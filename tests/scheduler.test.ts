import { describe, expect, it } from 'vitest'
import { ENTRIES, entriesForLevel, getEntry } from '../content/index'
import { allLevelStatus, chooseModality, fromVoiceKnown, hereLevel, pairRoms, pickChoices, reviewEntries, seenEntries, unlockCount, type LevelStatus } from '../src/engine/scheduler'
import { applyMeet, newItemProgress, type ItemProgress } from '../src/engine/srs'
import { emptyDoc } from '../src/storage/progress-schema'

function withReps(id: string, reps = 1): ItemProgress {
  return { ...newItemProgress(id), reps, lastSeen: 1 }
}

describe('chooseModality', () => {
  it('lets unseen Voice 0 listen or name tone, not only recognition', () => {
    const entry = getEntry('w:maa')!
    const seen = new Set<string>()
    for (let i = 0; i < 80; i++) {
      const m = chooseModality(entry, newItemProgress(entry.id), String(i))
      expect(['en-th', 'th-en', 'listen', 'tone']).toContain(m)
      seen.add(m)
    }
    expect(seen.has('listen') || seen.has('tone')).toBe(true)
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

  it('does not pick listen or tone when the page cannot hear', () => {
    const entry = getEntry('w:maa')!
    const p = { ...newItemProgress(entry.id), reps: 2, stage: 2 }
    for (let i = 0; i < 200; i++) {
      const m = chooseModality(entry, p, String(i), false)
      expect(m).not.toBe('listen')
      expect(m).not.toBe('tone')
    }
  })

  it('keeps a Voice lapse on produce or ear, not only th-en', () => {
    const entry = getEntry('w:dâi')!
    const p = { ...newItemProgress(entry.id), reps: 3, stage: 0 }
    const seen = new Set<string>()
    for (let i = 0; i < 80; i++) seen.add(chooseModality(entry, p, String(i)))
    expect(seen.has('en-th') || seen.has('listen') || seen.has('tone')).toBe(true)
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

describe('reviewEntries', () => {
  it('puts overdue cards first and includes Script', () => {
    const now = 1_700_000_000_000
    const doc = emptyDoc(now)
    doc.items['w:maa'] = { ...withReps('w:maa'), due: now + 86_400_000 }
    doc.items['s:maa'] = { ...withReps('s:maa'), due: now - 1 }
    const rows = reviewEntries(doc, now)
    expect(rows.map((e) => e.id)).toEqual(['s:maa', 'w:maa'])
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

  it('never offers a second letter the prompt fits', () => {
    expect(getEntry('s:kɔɔ#2')!.en[0]).toBe(getEntry('s:kɔɔ')!.en[0])
    expect(pickChoices(getEntry('s:kɔɔ#2')!)).not.toContain('ค')
    expect(pickChoices(getEntry('s:ai#2')!)).not.toContain('ไ')
    for (const id of ['s:sɔ̌ɔ#3', 's:tɔɔ#4', 's:kɔ̌ɔ#2', 's:chɔɔ#2']) {
      const entry = getEntry(id)!
      const twins = ENTRIES.filter((e) => e.track === 'script' && e.thai !== entry.thai && e.en[0] === entry.en[0])
      expect(twins.length, id).toBeGreaterThan(0)
      for (const t of twins) expect(pickChoices(entry), id).not.toContain(t.thai)
    }
  })
})

describe('script unlock', () => {
  it('keeps Script 1 locked when every Script 0 item was only missed', () => {
    const doc = emptyDoc()
    for (const e of entriesForLevel(0, 'script')) {
      doc.items[e.id] = withReps(e.id)
    }
    const script = allLevelStatus(doc, Date.now(), 'script')
    expect(script[0]!.seen).toBe(script[0]!.total)
    expect(script[0]!.passed).toBe(0)
    expect(script[1]!.unlocked).toBe(false)
  })

  it('opens Script 1 after every Script 0 item has been right once, without mastery', () => {
    const doc = emptyDoc()
    for (const e of entriesForLevel(0, 'script')) {
      doc.items[e.id] = { ...withReps(e.id), days: ['2026-01-01'] }
    }
    const script = allLevelStatus(doc, Date.now(), 'script')
    expect(script[0]!.passed).toBe(script[0]!.total)
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

  it('keeps Voice 1 locked and the pie at 0 after fifty Looks and no correct answers', () => {
    const now = 1_700_000_000_000
    const doc = emptyDoc(now)
    const level0 = entriesForLevel(0, 'voice')
    expect(level0.length).toBe(50)
    for (const e of level0) doc.items[e.id] = applyMeet(newItemProgress(e.id), now)
    const voice = allLevelStatus(doc, now, 'voice')
    expect(voice[0]!.seen).toBe(0)
    expect(voice[0]!.mastered).toBe(0)
    expect(unlockCount(voice[0]!, 'voice')).toBe(0)
    expect(voice[1]!.unlocked).toBe(false)
  })
})

describe('fromVoiceKnown', () => {
  it('is false until the Voice twin has a scored rep', () => {
    const entry = getEntry('s:yâa')!
    const doc = emptyDoc()
    expect(fromVoiceKnown(doc, entry)).toBe(false)
    doc.items['w:yâa'] = { ...newItemProgress('w:yâa'), lastSeen: 1 }
    expect(fromVoiceKnown(doc, entry)).toBe(false)
    doc.items['w:yâa'] = withReps('w:yâa')
    expect(fromVoiceKnown(doc, entry)).toBe(true)
  })
})

function status(partial: Partial<LevelStatus> & Pick<LevelStatus, 'n'>): LevelStatus {
  return {
    total: 0,
    seen: 0,
    passed: 0,
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

  it('on Script, a passed level is no longer here', () => {
    expect(
      hereLevel(
        [
          status({ n: 0, total: 3, seen: 3, passed: 3, mastered: 0, unlocked: true, complete: false }),
          status({ n: 1, total: 4, unlocked: true, passed: 0 }),
        ],
        'script',
      ),
    ).toBe(1)
  })

  it('moves Script on when every card has been right once', () => {
    const doc = emptyDoc()
    for (const e of entriesForLevel(0, 'script')) {
      doc.items[e.id] = { ...newItemProgress(e.id), reps: 1, stage: 1, days: ['2026-01-01'] }
    }
    const script = allLevelStatus(doc, Date.now(), 'script')
    expect(hereLevel(script, 'script')).toBe(1)
  })

  it('keeps Voice open after a later miss on a mastered level', () => {
    const now = 1_700_000_000_000
    const doc = emptyDoc(now)
    doc.opened = { voice: 1, script: 0 }
    for (const e of entriesForLevel(0, 'voice')) {
      doc.items[e.id] = { ...newItemProgress(e.id), reps: 3, stage: 3, days: ['2026-01-01', '2026-01-02', '2026-01-03'] }
    }
    const one = entriesForLevel(0, 'voice')[0]!
    doc.items[one.id] = { ...doc.items[one.id]!, stage: 1, days: ['2026-01-01'] }
    const voice = allLevelStatus(doc, now, 'voice')
    expect(voice[1]!.unlocked).toBe(true)
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
