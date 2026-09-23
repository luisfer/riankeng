/**
 * The romanization system from "Getting to Know Thai, Level 1", as used in
 * Luis's notes: tones by diacritic, doubled letters for long vowels,
 * g/bp/dt for unaspirated stops, ε ɔ ə for the open/mid vowels and ụ for อึ/อือ.
 * That is the Paiboon system of Benjawan Poomsan Becker with ụ for its ʉ. Voice 0
 * (chrome.systemSource) and the landing footer credit it, so a further departure
 * from Paiboon has to change those lines too.
 *
 * Everything here works on NFD (decomposed) strings so that ǔ, έ, ụ̀ etc.
 * are always "base letter + combining marks".
 */

export const TONE_MARKS = {
  low: '\u0300', // grave  à
  falling: '\u0302', // circumflex  â
  high: '\u0301', // acute  á
  rising: '\u030C', // caron  ǎ
} as const

export type Tone = 'mid' | keyof typeof TONE_MARKS

export const TONES: Tone[] = ['mid', 'low', 'falling', 'high', 'rising']

export const TONE_BY_MARK: Record<string, Tone> = {
  [TONE_MARKS.low]: 'low',
  [TONE_MARKS.falling]: 'falling',
  [TONE_MARKS.high]: 'high',
  [TONE_MARKS.rising]: 'rising',
}

export const TONE_LABEL: Record<Tone, string> = {
  mid: 'mid',
  low: 'low',
  falling: 'falling',
  high: 'high',
  rising: 'rising',
}

/** Combining dot below: u + this = ụ (อึ / อือ). */
export const DOT_BELOW = '\u0323'

/** Base vowel letters (NFD). ụ is represented as 'u' + DOT_BELOW. */
export const VOWEL_BASES = new Set(['a', 'e', 'i', 'o', 'u', 'ε', 'ɔ', 'ə'])

/** Consonant letters that may appear in the skeleton. */
export const CONSONANT_LETTERS = new Set([
  'k', 'g', 'c', 'h', 'j', 'p', 'b', 't', 'd', 'm', 'n', 'l', 'r', 'y', 'w', 'f', 's', "'",
])

/** Separators between syllables/words. Ignored when grading. */
export const SEPARATORS = new Set([' ', '-', '.', '·', '\u00A0'])

/** All code points a canonical `rom` string may contain, after NFD. */
export const ALLOWED_CODEPOINTS = new Set<string>([
  ...VOWEL_BASES,
  ...CONSONANT_LETTERS,
  ...SEPARATORS,
  DOT_BELOW,
  ...Object.values(TONE_MARKS),
  '…', // ellipsis for "ao … nɔ̀i" style frames
  '/', // alternatives such as kráp/kâ
  ',',
  '?',
  '!',
])

/**
 * Characters learners (or other systems) might type that we accept as the same
 * letter. Applied after NFD, before anything else.
 */
export const CHAR_ALIASES: Record<string, string> = {
  'ɛ': 'ε', // IPA epsilon → Greek epsilon (the textbook's glyph)
  'ɒ': 'ɔ',
  'ʉ': 'u' + DOT_BELOW,
  'ɨ': 'u' + DOT_BELOW,
  'ɯ': 'u' + DOT_BELOW,
  'ü': 'u' + DOT_BELOW, // ü → ụ (typed with a Mac umlaut by habit)
  'ṳ': 'u' + DOT_BELOW,
  '\u0331': DOT_BELOW, // macron below → dot below (the textbook prints an underline)
  '\u0332': DOT_BELOW,
  '\u2019': "'", // curly apostrophe
  '\u2018': "'",
  '\u02BC': "'",
  '\u2011': '-',
  '\u2013': '-',
  '\u2014': '-',
}

/** Initial consonant spellings, longest first, for the syllable scanner. */
export const ONSETS = [
  'bpr', 'bpl', 'dtr',
  'bp', 'dt', 'ch', 'ng', 'kr', 'kl', 'kw', 'gr', 'gl', 'gw', 'pr', 'pl', 'tr', 'fr', 'fl', 'sr', 'hm', 'hn', 'hl', 'hy', 'hw',
  'k', 'g', 'j', 'p', 'b', 't', 'd', 'm', 'n', 'l', 'r', 'y', 'w', 'f', 's', 'h', "'",
]

/** Final consonant spellings. */
export const FINALS = ['ng', 'k', 'p', 't', 'm', 'n', 'w', 'y']

/** Special vowel choices offered by the RomanInput popover for each base vowel. */
export const VOWEL_VARIANTS: Record<string, string[]> = {
  e: ['ε', 'ə'],
  o: ['ɔ'],
  u: ['u' + DOT_BELOW],
}

/** Order the popover uses for tones: 1 low, 2 falling, 3 high, 4 rising. */
export const POPOVER_TONES: Array<{ key: string; tone: Exclude<Tone, 'mid'>; mark: string; label: string }> = [
  { key: '1', tone: 'low', mark: TONE_MARKS.low, label: 'low' },
  { key: '2', tone: 'falling', mark: TONE_MARKS.falling, label: 'falling' },
  { key: '3', tone: 'high', mark: TONE_MARKS.high, label: 'high' },
  { key: '4', tone: 'rising', mark: TONE_MARKS.rising, label: 'rising' },
]

export const SYSTEM_SUMMARY = {
  tones: [
    { mark: 'a', name: 'mid', hint: 'normal pitch' },
    { mark: 'à', name: 'low', hint: 'low, flat' },
    { mark: 'â', name: 'falling', hint: 'starts high, falls' },
    { mark: 'á', name: 'high', hint: 'high, tense' },
    { mark: 'ǎ', name: 'rising', hint: 'starts low, rises' },
  ],
  vowels: [
    { rom: 'a / aa', hint: 'cup / father' },
    { rom: 'i / ii', hint: 'sit / see' },
    { rom: 'u / uu', hint: 'put / food' },
    { rom: 'e / ee', hint: 'bet / made' },
    { rom: 'o / oo', hint: 'pot / go' },
    { rom: 'ε / εε', hint: 'cat (open e)' },
    { rom: 'ɔ / ɔɔ', hint: 'or (open o)' },
    { rom: 'ə / əə', hint: 'ago / fur' },
    { rom: 'ụ / ụụ', hint: 'between i and u, lips flat' },
  ],
  consonants: [
    { rom: 'g', hint: 'unaspirated k, as in skin' },
    { rom: 'k', hint: 'aspirated k, as in kin' },
    { rom: 'bp', hint: 'unaspirated p, as in spin' },
    { rom: 'p', hint: 'aspirated p, as in pin' },
    { rom: 'dt', hint: 'unaspirated t, as in still' },
    { rom: 't', hint: 'aspirated t, as in till' },
    { rom: 'j', hint: 'unaspirated ch, as in UK stew' },
    { rom: 'ch', hint: 'aspirated ch, as in chew' },
    { rom: 'ng', hint: 'as in singing, also at the start' },
    { rom: "'", hint: 'glottal stop, a break between syllables' },
  ],
}
