import { describe, expect, it } from 'vitest'
import { ENTRIES } from '../content/index'
import { gradeThai } from '../src/engine/grader-thai'
import { analyseRom, displayRom, expandAlternatives } from '../src/engine/normalize'
import { chooseModality } from '../src/engine/scheduler'
import { sittingModality } from '../src/engine/session'
import { newItemProgress } from '../src/engine/srs'
import { getEntry } from '../content/index'

describe('syllables follow the written breaks', () => {
  it('never runs a syllable across a space or hyphen', () => {
    expect(analyseRom('sà-wàt-dii kráp').syllables).toEqual(['sà', 'wàt', 'dii', 'kráp'])
    expect(analyseRom('mâi bpen rai').syllables).toEqual(['mâi', 'bpen', 'rai'])
    expect(analyseRom('pǒm yùu tîi grung-têep').syllables).toEqual(['pǒm', 'yùu', 'tîi', 'grung', 'têep'])
    expect(analyseRom('kun tam à-rai').syllables).toEqual(['kun', 'tam', 'à', 'rai'])
  })

  it('still splits an unbroken answer', () => {
    expect(analyseRom('sawatdii').syllables).toEqual(['sa', 'wat', 'dii'])
  })

  it('names the syllable that slipped', () => {
    expect(gradeThai('pǒm yùu tîi grung-têep', 'pǒm yùu tîi grùng-têep').message).toContain('“grung”')
  })

  it('does not forgive a wrong tone on a closed syllable', () => {
    expect(gradeThai('kun tam à-rai', 'kun tàm à-rai').verdict).toBe('tone')
  })

  it('treats the unstressed a the same whatever word follows', () => {
    expect(gradeThai('jà bpai gìi moong', 'ja bpai gìi moong').verdict).toBe(gradeThai('wâa jà maa', 'wâa ja maa').verdict)
  })

  it('maps every syllable of every card back onto its written form', () => {
    const unmapped: string[] = []
    for (const e of ENTRIES) {
      for (const alt of expandAlternatives(displayRom(e.rom))) {
        let at = 0
        for (const s of analyseRom(alt).syllables) {
          const plain = s.replaceAll("'", '')
          const from = alt.indexOf(plain, at)
          if (from < 0) {
            unmapped.push(alt)
            break
          }
          at = from + plain.length
        }
      }
    }
    expect(unmapped).toEqual([])
  })

  it('grades every card exact against itself', () => {
    expect(ENTRIES.filter((e) => gradeThai(e.rom, e.rom).verdict !== 'exact').map((e) => e.id)).toEqual([])
  })
})

describe('alternatives in an answer', () => {
  it('holds a hedged answer to its weakest branch', () => {
    expect(gradeThai('kâao', 'kaao/kàao/kâao/káao/kǎao').verdict).not.toBe('exact')
    expect(gradeThai('kâao', 'kâao/kàao').verdict).toBe('tone')
  })

  it('still takes kráp/kâ written out', () => {
    expect(gradeThai('sà-wàt-dii kráp/kâ', 'sà-wàt-dii kráp/kâ').verdict).toBe('exact')
    expect(gradeThai('sà-wàt-dii kráp/kâ', 'sà-wàt-dii kâ').verdict).toBe('exact')
  })
})

describe('tone drills', () => {
  it('never drills the tones of a kráp/kâ card', () => {
    const slashed = ENTRIES.filter((e) => e.rom.includes('/'))
    expect(slashed.length).toBeGreaterThan(0)
    for (const e of slashed) {
      for (let i = 0; i < 40; i++) expect(chooseModality(e, newItemProgress(e.id), String(i))).not.toBe('tone')
    }
  })

  it('turns a saved tone drill on a kráp/kâ card into reading', () => {
    const e = getEntry('p:sà-wàt-dii kráp/kâ')!
    expect(sittingModality({ id: e.id, modality: 'tone', salt: '1' }, true)).toBe('th-en')
  })
})
