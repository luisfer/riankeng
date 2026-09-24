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

  it('attaches a tone to the last vowel, including after a final', () => {
    expect(applyStripKey('ma', TONE_MARKS.low)).toBe('mà')
    expect(applyStripKey('mak', TONE_MARKS.low)).toBe('màk')
    expect(applyStripKey('kɔɔp', TONE_MARKS.falling)).toBe('kɔɔ̂p')
    expect(applyStripKey('sʉ', TONE_MARKS.high)).toBe('sʉ́')
  })

  it('replaces an existing tone on the last vowel', () => {
    expect(applyStripKey('màk', TONE_MARKS.high)).toBe('mák')
    expect(applyStripKey('mák', TONE_MARKS.rising)).toBe('mǎk')
  })

  it('tones the vowel at the caret, not the last vowel in the field', () => {
    expect(toneAt('maa', 2, TONE_MARKS.low)).toEqual({ value: 'màa', caret: 2 })
    expect(toneAt('maa', 3, TONE_MARKS.low)).toEqual({ value: 'maà', caret: 3 })
    expect(toneAt('maɔ', 2, TONE_MARKS.low)).toEqual({ value: 'màɔ', caret: 2 })
    expect(toneAt('kɔɔp', 2, TONE_MARKS.falling)).toEqual({ value: 'kɔ̂ɔp', caret: 3 })
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
