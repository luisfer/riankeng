import { describe, expect, it } from 'vitest'
import { gradeThai } from '../src/engine/grader-thai'
import { analyseRom, chunkSyllables, displayRom, expandAlternatives } from '../src/engine/normalize'

describe('analyseRom', () => {
  it('splits skeleton and tones', () => {
    const a = analyseRom('kɔ̀ɔp kun')
    expect(a.skeleton).toBe('kɔɔpkun')
    expect(a.nuclei.map((n) => n.tone)).toEqual(['low', 'mid'])
    expect(a.valid).toBe(true)
  })
  it('handles ụ as one vowel unit', () => {
    const a = analyseRom('sụ́ụ')
    expect(a.nuclei).toHaveLength(1)
    expect(a.nuclei[0]!.tone).toBe('high')
    expect(a.collapsed).toBe('su\u0323')
  })
  it('treats -ay / -aw as -ai / -ao', () => {
    expect(analyseRom('sǔay').skeleton).toBe(analyseRom('sǔai').skeleton)
    expect(analyseRom('kâaw').skeleton).toBe(analyseRom('kâao').skeleton)
    expect(analyseRom('yùu').skeleton).toBe('yuu')
  })
  it('keeps a glottal break between vowels', () => {
    expect(analyseRom('sà-àat').skeleton).toBe("sa'aat")
    expect(analyseRom("sà'àat").skeleton).toBe("sa'aat")
    expect(analyseRom('sà àat').skeleton).toBe("sa'aat")
    expect(analyseRom('saàat').nuclei).toHaveLength(1)
  })
  it('accepts alias glyphs', () => {
    expect(analyseRom('pɛɛng').skeleton).toBe('pεεng')
    expect(analyseRom('sʉ́ʉ').skeleton).toBe(analyseRom('sụ́ụ').skeleton)
    expect(analyseRom('lüüm').skeleton).toBe(analyseRom('lụụm').skeleton)
  })
  it('treats -iw as -iu', () => {
    expect(analyseRom('hǐw').skeleton).toBe(analyseRom('hǐu').skeleton)
  })
  it('flags two tone marks in one syllable', () => {
    expect(analyseRom('kâáo').valid).toBe(false)
  })
})

describe('chunkSyllables', () => {
  it('splits polysyllables sensibly', () => {
    expect(chunkSyllables('sawatdii', ['', '\u0300', ''])).toEqual(['sa', 'wàt', 'dii'])
    expect(chunkSyllables('aahaan', ['', '\u030C'])).toEqual(['aa', 'hǎan'])
    expect(chunkSyllables('yangngai', ['', ''])).toEqual(['yang', 'ngai'])
    expect(chunkSyllables('dtalaat', ['\u0300', '\u0300'])).toEqual(['dtà', 'làat'])
  })
})

describe('gradeThai', () => {
  it('exact match', () => {
    expect(gradeThai('kɔ̀ɔp kun', 'kɔ̀ɔp kun').verdict).toBe('exact')
    expect(gradeThai('kɔ̀ɔp kun', 'KƆ̀ƆP KUN').verdict).toBe('exact')
    expect(gradeThai('kɔ̀ɔp kun', 'kɔ̀ɔp-kun').verdict).toBe('exact')
    expect(gradeThai('kɔ̀ɔp kun', 'kɔɔ̀p kun').verdict).toBe('exact') // tone on second vowel letter
  })
  it('NFC and NFD inputs are the same', () => {
    expect(gradeThai('mâi', 'ma\u0302i').verdict).toBe('exact')
    expect(gradeThai('lέεo', 'l\u03B5\u0301\u03B5o').verdict).toBe('exact')
  })
  it('tone slips are reported per syllable', () => {
    const g = gradeThai('kâao', 'kǎao')
    expect(g.verdict).toBe('tone')
    expect(g.correct).toBe(false)
    expect(g.toneSlips[0]).toMatchObject({ syllable: 0, expected: 'falling', got: 'rising' })
    expect(g.message).toContain('falling')
  })
  it('missing tone is a tone slip', () => {
    expect(gradeThai('mâi', 'mai').verdict).toBe('tone')
  })
  it('vowel length slips', () => {
    const g = gradeThai('kâao', 'kâo')
    expect(g.verdict).toBe('length')
    expect(g.lengthSlip).toBe(true)
  })
  it('wrong letters', () => {
    expect(gradeThai('gài', 'kài').verdict).toBe('wrong')
    expect(gradeThai('bpai', 'pai').verdict).toBe('wrong')
  })
  it('empty and invalid', () => {
    expect(gradeThai('maa', '').verdict).toBe('empty')
    expect(gradeThai('maa', 'mâá').verdict).toBe('invalid')
  })
  it('alternatives with slash', () => {
    expect(expandAlternatives('sà-wàt-dii kráp/kâ')).toEqual(['sà-wàt-dii kráp', 'sà-wàt-dii kâ'])
    expect(gradeThai('sà-wàt-dii kráp/kâ', 'sawàtdii kâ').verdict).toBe('exact')
    expect(gradeThai('sà-wàt-dii kráp/kâ', 'sawàtdii kráp').verdict).toBe('exact')
    expect(gradeThai('sà-wàt-dii kráp/kâ', 'sà-wàt-dii kráp/kâ').verdict).toBe('exact')
    expect(gradeThai('lụụm', 'lüüm').verdict).toBe('exact')
    expect(gradeThai('hǐu', 'hǐw').verdict).toBe('exact')
  })
  it('syllable break mismatch', () => {
    expect(gradeThai('sà-àat', 'saàat').verdict).toBe('tone')
  })
  it('unstressed short a may be mid or low', () => {
    expect(gradeThai('sà-wàt-dii', 'sawàtdii').verdict).toBe('exact')
    expect(gradeThai('dtà-làat', 'dtalàat').verdict).toBe('exact')
    expect(gradeThai('à-rai', 'arai').verdict).toBe('exact')
    // but a final short a keeps its tone, and other tones still count
    expect(gradeThai('ká', 'ka').verdict).toBe('tone')
    expect(gradeThai('sà-wàt-dii', 'sáwàtdii').verdict).toBe('tone')
    expect(gradeThai('sà-wàt-dii', 'sawatdii').verdict).toBe('tone')
    expect(gradeThai('pàt tai', 'pat tai').verdict).toBe('tone')
  })
  it('displayRom is NFC', () => {
    expect(displayRom('ma\u0302i')).toBe('mâi')
  })
})
