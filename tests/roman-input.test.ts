import { describe, expect, it } from 'vitest'
import { TONE_MARKS } from '@content/system'
import { applyStripKey } from '../src/input/RomanInput'

describe('applyStripKey', () => {
  it('appends special vowels', () => {
    expect(applyStripKey('', 'ε')).toBe('ε')
    expect(applyStripKey('k', 'ɔ')).toBe('kɔ')
    expect(applyStripKey('s', 'ə')).toBe('sə')
    expect(applyStripKey('s', 'ụ')).toBe('sụ')
  })

  it('attaches a tone to the last vowel, including after a final', () => {
    expect(applyStripKey('ma', TONE_MARKS.low)).toBe('mà')
    expect(applyStripKey('mak', TONE_MARKS.low)).toBe('màk')
    expect(applyStripKey('kɔɔp', TONE_MARKS.falling)).toBe('kɔɔ̂p')
    expect(applyStripKey('sụ', TONE_MARKS.high)).toBe('sụ́')
  })

  it('replaces an existing tone on the last vowel', () => {
    expect(applyStripKey('màk', TONE_MARKS.high)).toBe('mák')
    expect(applyStripKey('mák', TONE_MARKS.rising)).toBe('mǎk')
  })

  it('inserts the labelled glyph when there is no vowel', () => {
    expect(applyStripKey('', TONE_MARKS.low)).toBe('à')
    expect(applyStripKey('', TONE_MARKS.falling)).toBe('â')
    expect(applyStripKey('', TONE_MARKS.high)).toBe('á')
    expect(applyStripKey('', TONE_MARKS.rising)).toBe('ǎ')
    expect(applyStripKey('k', TONE_MARKS.low)).toBe('kà')
  })
})
