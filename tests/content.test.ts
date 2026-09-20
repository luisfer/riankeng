import { describe, expect, it } from 'vitest'
import { ENTRIES, LEVELS, SCRIPT_LEVELS, entriesForLevel, getEntry } from '../content/index'
import { validateEntries } from '../content/validate'
import { CONSONANTS, DIGITS, OTHER_SIGNS, TONE_MARKS, VOWELS } from '../content/script/alphabet'
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

  it('script levels 0–27 are authored, มา is one id, and tone marks are not cards', () => {
    expect(SCRIPT_LEVELS).toHaveLength(28)
    for (const lvl of SCRIPT_LEVELS) {
      expect(entriesForLevel(lvl.n, 'script').length, `script ${lvl.n}`).toBeGreaterThanOrEqual(lvl.min)
    }
    expect(getEntry('s:maa')?.level).toBe(1)
    expect(getEntry('s:maa#2')?.level).toBe(17)
    expect(getEntry('s:mɔɔ-máa')).toBeUndefined()
    expect(getEntry('s:mâi too')).toBeUndefined()
    expect(getEntry('s:mâi èek')).toBeUndefined()
    expect(getEntry('s:máa')?.compose).toEqual(['ม', '้', 'า'])
    const cards = ENTRIES.filter((e) => e.track === 'script' && e.tags.includes('letter'))
    for (const mark of TONE_MARKS) expect(cards.some((c) => c.thai === mark), `tone mark ${mark}`).toBe(false)
  })

  it('script teaches every consonant, vowel sign, other sign and digit', () => {
    const script = ENTRIES.filter((e) => e.track === 'script')
    const cards = new Set(script.filter((e) => e.tags.includes('letter')).map((e) => e.thai))
    for (const c of CONSONANTS) expect(cards.has(c.char), `consonant ${c.char} (${c.name})`).toBe(true)
    for (const v of VOWELS) expect(cards.has(v.char), `vowel ${v.char}`).toBe(true)
    for (const s of OTHER_SIGNS) expect(cards.has(s.char), `sign ${s.char}`).toBe(true)
    for (const d of DIGITS) expect(cards.has(d), `digit ${d}`).toBe(true)
    expect(CONSONANTS).toHaveLength(44)
    // Every letter card is taught before it is used in a bridge word's parts.
    const taughtAt = new Map<string, number>()
    for (const e of script) if (e.tags.includes('letter')) taughtAt.set(e.thai, Math.min(e.level, taughtAt.get(e.thai) ?? Infinity))
    const toneMarks = new Set<string>(TONE_MARKS)
    for (const e of script) {
      for (const part of e.compose ?? []) {
        if (toneMarks.has(part)) continue
        const at = taughtAt.get(part)
        expect(at, `${e.id} uses ${part} which has no card`).toBeDefined()
        expect(at!, `${e.id} at ${e.level} uses ${part} taught at ${at}`).toBeLessThanOrEqual(e.level)
      }
    }
  })

  it('teaches กิน as live mid, อีเมล as ii-meen, and Script 0 as nâa', () => {
    const gin = getEntry('s:gin#3')!
    expect(gin.rom).toBe('gin')
    expect(gin.note ?? '').toMatch(/live/i)
    expect(gin.note ?? '').not.toMatch(/dead/i)
    expect(gradeThai(gin.rom, 'gìn').verdict).not.toBe('exact')
    expect(getEntry('w:ii-meen')?.thai).toBe('อีเมล')
    expect(getEntry('p:sòng ii-meen nɔ̀i')).toBeDefined()
    expect(getEntry('p:kǐan ii-meen')).toBeDefined()
    expect(SCRIPT_LEVELS[0]!.rom).toBe('nâa')
    expect(SCRIPT_LEVELS[0]!.thai).toBe('หน้า')
    const pet = getEntry('p:pèt mâak')!
    expect(pet.en[0]).toBe('very spicy')
    expect(pet.en).not.toContain('too spicy')
  })

  it('writes ย่า with mai tho on Voice 0 and Script 6', () => {
    const voice = getEntry('w:yâa')!
    const script = getEntry('s:yâa')!
    const maiTho = '\u0E49'
    const maiEk = '\u0E48'
    expect(voice.thai).toBe(`ย${maiTho}า`)
    expect(script.thai).toBe(`ย${maiTho}า`)
    expect(script.compose).toEqual(['ย', maiTho, 'า'])
    expect(script.compose?.join('')).not.toContain(maiEk)
    expect(gradeThai(voice.rom, 'yâa').verdict).toBe('exact')
  })

  it('every script bridge points at a voice word and spells it the same', () => {
    for (const e of ENTRIES.filter((e) => e.track === 'script')) {
      const link = e.tags.find((t) => t.startsWith('voice:'))
      if (!link) continue
      const target = getEntry(link.slice('voice:'.length))
      expect(target, `${e.id} -> ${link}`).toBeDefined()
      expect(target!.track ?? 'voice').toBe('voice')
      if (e.compose) expect(e.compose.join(''), `${e.id} parts`).toBe(e.thai)
      if (!e.tags.includes('digit')) expect(target!.thai, `${e.id} thai`).toBe(e.thai)
    }
  })
})
