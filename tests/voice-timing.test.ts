import { describe, expect, it } from 'vitest'
import { evenSpans, spansFrom, syllableWeight } from '../src/audio/voice-timing'

/** A clip's loudness, 10 ms a frame: silence, then one loud stretch per syllable with a dip between. */
function envelope(syllableFrames: number[], lead = 8, dip = 4, tail = 12): Float32Array {
  const out: number[] = Array(lead).fill(0.001)
  syllableFrames.forEach((n, k) => {
    if (k > 0) out.push(...Array(dip).fill(0.02))
    out.push(...Array(n).fill(0.5))
  })
  out.push(...Array(tail).fill(0.001))
  return Float32Array.from(out)
}

describe('where each syllable sits in a clip', () => {
  it('weighs a long vowel longer and a stopped final shorter', () => {
    expect(syllableWeight('gaa')).toBeGreaterThan(syllableWeight('ga'))
    expect(syllableWeight('kráp')).toBeLessThan(syllableWeight('krá'))
    expect(syllableWeight('ʉ̌a')).toBeGreaterThan(1)
  })

  it('trims the silence and moves each boundary to the dip between syllables', () => {
    // Three syllables of 30, 10 and 20 frames: the weights alone would put the boundaries elsewhere.
    const spans = spansFrom(envelope([30, 10, 20]), [1, 1, 1])
    expect(spans).toHaveLength(3)
    expect(spans[0]!.start).toBeCloseTo(0.08, 2)
    expect(spans[0]!.end).toBeGreaterThan(0.37)
    expect(spans[0]!.end).toBeLessThan(0.43)
    expect(spans[1]!.end).toBeGreaterThan(0.51)
    expect(spans[1]!.end).toBeLessThan(0.57)
    expect(spans[2]!.end).toBeCloseTo(0.75, 2)
  })

  it('shares a clip out by weight when there is no audio to read', () => {
    const spans = evenSpans(2, [1, 1.5])
    expect(spans[0]!.start).toBeGreaterThan(0)
    expect(spans[1]!.end).toBeLessThan(2)
    expect(spans[1]!.end - spans[1]!.start).toBeGreaterThan(spans[0]!.end - spans[0]!.start)
  })
})
