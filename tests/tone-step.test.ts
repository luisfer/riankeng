import { describe, expect, it } from 'vitest'
import { judgeTonePick, toneBareShow, toneSyllableShow } from '../src/engine/tone-step'

describe('tone steps', () => {
  it('walks every syllable then rights', () => {
    expect(judgeTonePick('sà-àat', 0, 'low')).toEqual({ kind: 'advance', next: 1 })
    expect(judgeTonePick('sà-àat', 1, 'low')).toEqual({ kind: 'right' })
    expect(toneSyllableShow('sà-àat', 0).length).toBeGreaterThan(0)
    expect(toneSyllableShow('sà-àat', 1).length).toBeGreaterThan(0)
  })

  it('names every syllable’s tone on a miss', () => {
    expect(judgeTonePick('sà-wàt-dii', 0, 'mid')).toEqual({ kind: 'miss', line: 'low, low, mid' })
  })

  it('keeps a single syllable as one pick', () => {
    expect(judgeTonePick('maa', 0, 'mid')).toEqual({ kind: 'right' })
    expect(judgeTonePick('máa', 0, 'low')).toEqual({ kind: 'miss', line: 'high' })
  })

  it('hides tone marks on the desk', () => {
    expect(toneBareShow('máa')).toBe('maa')
    expect(toneBareShow('sà-àat', 0)).not.toMatch(/[àâáǎèêéěìîíǐòôóǒùûúǔ]/)
    expect(toneBareShow('sà-àat', 0)).not.toBe(toneSyllableShow('sà-àat', 0))
  })
})
