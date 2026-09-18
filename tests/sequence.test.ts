import { describe, expect, it } from 'vitest'
import { words, phrases, idioms } from '../content/build'
import { checkSequence, decompose, buildLexicon, romTokens } from '../content/sequence'
import { validateEntries } from '../content/validate'

const base = [
  ...words(0, [
    ['maa', 'มา', ['come'], 'v'],
    ['mâi', 'ไม่', ['not'], 'adv'],
    ['kâo', 'เข้า', ['enter'], 'v'],
    ['jai', 'ใจ', ['heart'], 'n'],
  ]),
  ...words(1, [
    ['kâo jai', 'เข้าใจ', ['understand'], 'v'],
    ['kráp', 'ครับ', ['polite particle (male)'], 'particle'],
    ['kâ', 'ค่ะ', ['polite particle (female)'], 'particle'],
    ['nít-nɔ̀i', 'นิดหน่อย', ['a little'], 'adv'],
  ]),
  ...words(3, [['tam-mai', 'ทำไม', ['why'], 'q']]),
]

describe('romTokens', () => {
  it('splits on spaces and hyphens, drops punctuation', () => {
    expect(romTokens('kâo jai lέεo, nít-nɔ̀i …')).toEqual(['kâo', 'jai', 'lέεo', 'nít', 'nɔ̀i'].map((t) => t.normalize('NFD')))
  })
})

describe('decompose', () => {
  const lex = buildLexicon(base)
  it('prefers the longest word', () => {
    const d = decompose('mâi kâo jai', 1, lex)
    expect(d.parts.map((p) => p.entry.id)).toEqual(['w:mâi', 'w:kâo jai'])
    expect(d.misses).toEqual([])
  })
  it('falls back to the pieces when the compound is not yet taught', () => {
    const d = decompose('mâi kâo jai', 0, lex)
    expect(d.parts.map((p) => p.entry.id)).toEqual(['w:mâi', 'w:kâo', 'w:jai'])
  })
  it('matches hyphenated words against spaced tokens', () => {
    expect(decompose('nít nɔ̀i', 1, lex).misses).toEqual([])
  })
})

describe('checkSequence', () => {
  it('passes a phrase built from earlier words', () => {
    const entries = [...base, ...phrases(1, [['mâi kâo jai kráp/kâ', 'ไม่เข้าใจครับ/ค่ะ', ['I do not understand']]])]
    expect(checkSequence(entries)).toEqual([])
  })

  it('fails a phrase that uses a later word', () => {
    const entries = [...base, ...phrases(1, [['tam-mai maa', 'ทำไมมา', ['why did you come']]])]
    const p = checkSequence(entries)
    expect(p).toHaveLength(1)
    expect(p[0]!.message).toMatch(/introduced at level 3, after this level 1/)
  })

  it('fails a phrase with a word never introduced', () => {
    const entries = [...base, ...idioms(2, [['jai yen', 'ใจเย็น', ['calm']]])]
    const p = checkSequence(entries)
    expect(p.map((x) => x.message)).toEqual(['"yen" is never introduced as a word'])
  })

  it('fails when the same Thai carries two roms', () => {
    const entries = [...base, ...words(2, [['maa#2', 'มา', ['come (again)'], 'v']]), ...words(2, [['mǎa', 'มา', ['dog'], 'n']])]
    const p = checkSequence(entries)
    expect(p.some((x) => /one spelling, or tag homograph/.test(x.message))).toBe(true)
  })

  it('allows a tagged homograph', () => {
    const entries = [...base, ...words(2, [['mǎi', 'ไหม', ['silk'], 'n', ['homograph']], ['mái', 'ไหม', ['question particle'], 'particle']])]
    expect(checkSequence(entries)).toEqual([])
  })

  it('fails when the phrase Thai drifts from the word Thai', () => {
    const entries = [...base, ...phrases(1, [['mâi maa', 'ไม้มา', ['not coming']]])]
    const p = checkSequence(entries)
    expect(p.map((x) => x.message)).toEqual(['Thai does not contain "ไม่" (mâi) from w:mâi'])
  })

  it('accepts a repeated word written with ๆ', () => {
    const entries = [...base, ...phrases(1, [['maa maa', 'มาๆ', ['come come']]])]
    expect(checkSequence(entries)).toEqual([])
  })

  it('is wired into validateEntries for the voice track', () => {
    const entries = [...base, ...phrases(1, [['tam-mai maa', 'ทำไมมา', ['why did you come']]])]
    const r = validateEntries(entries, false)
    expect(r.problems.some((x) => /after this level/.test(x.message))).toBe(true)
    expect(validateEntries(entries, false, { sequence: false }).problems.some((x) => /after this level/.test(x.message))).toBe(false)
  })
})
