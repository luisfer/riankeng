import type { Tone } from '@content/system'

/**
 * Textbook Bangkok contours: mid level, low falling-to-low, falling from high, high tense, rising
 * from low. Drawn in an 80 by 50 box; pitch runs from 12 (high) to 39 (low). The tone chart on
 * Voice 0 and the line over each syllable use the same strokes.
 */
export const CONTOUR: Record<Tone, string> = {
  mid: 'M 14 25 L 66 25',
  low: 'M 14 29 C 28 36 42 39 66 39',
  falling: 'M 14 12 C 26 10 40 24 66 39',
  high: 'M 14 18 C 32 14 48 12 66 12',
  rising: 'M 14 39 C 28 40 44 20 66 13',
}

/** The strokes' own box, for a mark that is only the line. */
export const CONTOUR_BOX = '10 8 60 35'
