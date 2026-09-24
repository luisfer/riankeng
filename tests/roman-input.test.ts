import { describe, expect, it } from 'vitest'
import { TONE_MARKS } from '@content/system'
import { applyStripKey, toneAt } from '../src/input/RomanInput'

describe('applyStripKey', () => {
  it('appends special vowels', () => {
    expect(applyStripKey('', 'ε')).toBe('ε')
    expect(applyStripKey('k', 'ɔ')).toBe('kɔ')
    expect(applyStripKey('s', 'ə')).toBe('sə')
    expect(applyStripKey('s', 'ʉ')).toBe('sʉ')
  })

  it('marks the first letter of the last syllable, including after a final', () => {
    expect(applyStripKey('ma', TONE_MARKS.low)).toBe('mà')
    expect(applyStripKey('mak', TONE_MARKS.low)).toBe('màk')
    expect(applyStripKey('maa', TONE_MARKS.high)).toBe('máa')
    expect(applyStripKey('kɔɔp', TONE_MARKS.low)).toBe('kɔ̀ɔp')
    expect(applyStripKey('kaao', TONE_MARKS.falling)).toBe('kâao')
    expect(applyStripKey('guai', TONE_MARKS.rising)).toBe('gǔai')
    expect(applyStripKey('nʉai', TONE_MARKS.low)).toBe('nʉ̀ai')
    expect(applyStripKey('sʉ', TONE_MARKS.high)).toBe('sʉ́')
  })

  it('replaces the tone already on that syllable, wherever it sat', () => {
    expect(applyStripKey('màk', TONE_MARKS.high)).toBe('mák')
    expect(applyStripKey('mák', TONE_MARKS.rising)).toBe('mǎk')
    expect(applyStripKey('máa', TONE_MARKS.falling)).toBe('mâa')
    expect(applyStripKey('maá', TONE_MARKS.high)).toBe('máa')
  })

  it('keeps the caret where it was in the text', () => {
    expect(toneAt('maa', 3, TONE_MARKS.high)).toEqual({ value: 'máa', caret: 3 })
    expect(toneAt('maa', 2, TONE_MARKS.low)).toEqual({ value: 'màa', caret: 2 })
    expect(toneAt('maa', 0, TONE_MARKS.low)).toEqual({ value: 'màa', caret: 0 })
    expect(toneAt('pεεng', 5, TONE_MARKS.low)).toEqual({ value: 'pὲεng', caret: 'pὲεng'.length })
    expect(toneAt('pεεng', 5, TONE_MARKS.falling)).toEqual({ value: 'pε̂εng', caret: 'pε̂εng'.length })
    expect(toneAt('kɔɔp', 4, TONE_MARKS.low)).toEqual({ value: 'kɔ̀ɔp', caret: 5 })
    expect(toneAt('kɔɔp', 2, TONE_MARKS.falling)).toEqual({ value: 'kɔ̂ɔp', caret: 3 })
  })

  it('tones the syllable at the caret, not the last one in the field', () => {
    expect(toneAt('sa-wat', 2, TONE_MARKS.low)).toEqual({ value: 'sà-wat', caret: 2 })
    expect(toneAt('sa-wat', 6, TONE_MARKS.low)).toEqual({ value: 'sa-wàt', caret: 6 })
    expect(toneAt('maɔ', 2, TONE_MARKS.low)).toEqual({ value: 'màɔ', caret: 2 })
    expect(applyStripKey('maa', 'ɔ', 2)).toBe('maɔa')
  })

  it('inserts the labelled glyph when there is no vowel', () => {
    expect(applyStripKey('', TONE_MARKS.low)).toBe('à')
    expect(applyStripKey('', TONE_MARKS.falling)).toBe('â')
    expect(applyStripKey('', TONE_MARKS.high)).toBe('á')
    expect(applyStripKey('', TONE_MARKS.rising)).toBe('ǎ')
    expect(applyStripKey('k', TONE_MARKS.low)).toBe('kà')
  })
})
