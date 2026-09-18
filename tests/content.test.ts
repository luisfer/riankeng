import { describe, expect, it } from 'vitest'
import { ENTRIES, LEVELS, SCRIPT_LEVELS, entriesForLevel, getEntry } from '../content/index'
import { validateEntries } from '../content/validate'
import { gradeThai } from '../src/engine/grader-thai'
import { gradeEnglish } from '../src/engine/grader-en'
import { expandAlternatives } from '../src/engine/normalize'

describe('content', () => {
  it('validates', () => {
    const voice = validateEntries(ENTRIES, true)
    const script = validateEntries(ENTRIES, false, { track: 'script', levels: SCRIPT_LEVELS })
    const problems = [...voice.problems, ...script.problems]
    if (problems.length) {
      console.error(problems.map((p) => `${p.id}: ${p.message}`).join('\n'))
    }
    expect(problems).toEqual([])
  })

  it('has 22 levels', () => {
    expect(LEVELS).toHaveLength(22)
    LEVELS.forEach((l, i) => expect(l.n).toBe(i))
  })

  it('every entry grades itself as exact and its first gloss as correct', () => {
    for (const e of ENTRIES) {
      const t = gradeThai(e.rom, expandAlternatives(e.rom)[0]!)
      expect(t.verdict, e.id).toBe('exact')
      const g = gradeEnglish(e.en, e.en[0]!)
      expect(g.correct, `${e.id} gloss "${e.en[0]}"`).toBe(true)
    }
  })

  it('level 0 pairs point at each other', () => {
    const maa = getEntry('w:maa')!
    expect(maa.minimalPairOf).toContain('w:máa')
    expect(maa.minimalPairOf).toContain('w:mǎa')
  })

  it('every Voice level meets its minimum', () => {
    for (const lvl of LEVELS) {
      expect(entriesForLevel(lvl.n).length, `voice ${lvl.n}`).toBeGreaterThanOrEqual(lvl.min)
    }
  })

  it('script levels 0–8 are authored, มา is one id, and tone marks are not cards', () => {
    for (const n of [0, 1, 2, 3, 4, 5, 6, 7, 8]) {
      expect(entriesForLevel(n, 'script').length, `script ${n}`).toBeGreaterThanOrEqual(SCRIPT_LEVELS[n]!.min)
    }
    expect(entriesForLevel(9, 'script')).toHaveLength(0)
    expect(getEntry('s:maa')?.level).toBe(1)
    expect(getEntry('s:maa#2')).toBeUndefined()
    expect(getEntry('s:mɔɔ-máa')).toBeUndefined()
    expect(getEntry('s:mâi too')).toBeUndefined()
    expect(getEntry('s:mâi èek')).toBeUndefined()
    expect(getEntry('s:máa')?.compose).toEqual(['ม', '้', 'า'])
  })
})
