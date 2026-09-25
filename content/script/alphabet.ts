/**
 * The whole Thai alphabet as a checklist. Every consonant, vowel sign, tone
 * mark and other sign the Script track must teach. Tests hold the Script
 * levels to this list, so the course cannot quietly stop short of the full
 * script.
 */

export type ConsonantClass = 'mid' | 'high' | 'low'

export interface Consonant {
  char: string
  /** Traditional name, e.g. "gɔɔ gài". */
  name: string
  cls: ConsonantClass
  /** Sound at the start of a syllable in the app's romanization. */
  initial: string
  /** Sound at the end of a syllable, or '' if it never ends one. */
  final: string
  /** No longer used in modern words. Still part of the forty-four. */
  retired?: boolean
}

export const CONSONANTS: Consonant[] = [
  { char: 'ก', name: 'gɔɔ gài', cls: 'mid', initial: 'g', final: 'k' },
  { char: 'ข', name: 'kɔ̌ɔ kài', cls: 'high', initial: 'k', final: 'k' },
  { char: 'ฃ', name: 'kɔ̌ɔ kùat', cls: 'high', initial: 'k', final: 'k', retired: true },
  { char: 'ค', name: 'kɔɔ kwaai', cls: 'low', initial: 'k', final: 'k' },
  { char: 'ฅ', name: 'kɔɔ kon', cls: 'low', initial: 'k', final: 'k', retired: true },
  { char: 'ฆ', name: 'kɔɔ rá-kang', cls: 'low', initial: 'k', final: 'k' },
  { char: 'ง', name: 'ngɔɔ nguu', cls: 'low', initial: 'ng', final: 'ng' },
  { char: 'จ', name: 'jɔɔ jaan', cls: 'mid', initial: 'j', final: 't' },
  { char: 'ฉ', name: 'chɔ̌ɔ chìng', cls: 'high', initial: 'ch', final: '' },
  { char: 'ช', name: 'chɔɔ cháang', cls: 'low', initial: 'ch', final: 't' },
  { char: 'ซ', name: 'sɔɔ sôo', cls: 'low', initial: 's', final: 't' },
  { char: 'ฌ', name: 'chɔɔ chəə', cls: 'low', initial: 'ch', final: '' },
  { char: 'ญ', name: 'yɔɔ yǐng', cls: 'low', initial: 'y', final: 'n' },
  { char: 'ฎ', name: 'dɔɔ chá-daa', cls: 'mid', initial: 'd', final: 't' },
  { char: 'ฏ', name: 'dtɔɔ bpà-dtàk', cls: 'mid', initial: 'dt', final: 't' },
  { char: 'ฐ', name: 'tɔ̌ɔ tǎan', cls: 'high', initial: 't', final: 't' },
  { char: 'ฑ', name: 'tɔɔ mon-too', cls: 'low', initial: 't', final: 't' },
  { char: 'ฒ', name: 'tɔɔ pûu-tâo', cls: 'low', initial: 't', final: 't' },
  { char: 'ณ', name: 'nɔɔ neen', cls: 'low', initial: 'n', final: 'n' },
  { char: 'ด', name: 'dɔɔ dèk', cls: 'mid', initial: 'd', final: 't' },
  { char: 'ต', name: 'dtɔɔ dtào', cls: 'mid', initial: 'dt', final: 't' },
  { char: 'ถ', name: 'tɔ̌ɔ tǔng', cls: 'high', initial: 't', final: 't' },
  { char: 'ท', name: 'tɔɔ tá-hǎan', cls: 'low', initial: 't', final: 't' },
  { char: 'ธ', name: 'tɔɔ tong', cls: 'low', initial: 't', final: 't' },
  { char: 'น', name: 'nɔɔ nǔu', cls: 'low', initial: 'n', final: 'n' },
  { char: 'บ', name: 'bɔɔ bai-mái', cls: 'mid', initial: 'b', final: 'p' },
  { char: 'ป', name: 'bpɔɔ bplaa', cls: 'mid', initial: 'bp', final: 'p' },
  { char: 'ผ', name: 'pɔ̌ɔ pʉ̂ng', cls: 'high', initial: 'p', final: '' },
  { char: 'ฝ', name: 'fɔ̌ɔ fǎa', cls: 'high', initial: 'f', final: '' },
  { char: 'พ', name: 'pɔɔ paan', cls: 'low', initial: 'p', final: 'p' },
  { char: 'ฟ', name: 'fɔɔ fan', cls: 'low', initial: 'f', final: 'p' },
  { char: 'ภ', name: 'pɔɔ sǎm-pao', cls: 'low', initial: 'p', final: 'p' },
  { char: 'ม', name: 'mɔɔ máa', cls: 'low', initial: 'm', final: 'm' },
  { char: 'ย', name: 'yɔɔ yák', cls: 'low', initial: 'y', final: 'i' },
  { char: 'ร', name: 'rɔɔ rʉa', cls: 'low', initial: 'r', final: 'n' },
  { char: 'ล', name: 'lɔɔ ling', cls: 'low', initial: 'l', final: 'n' },
  { char: 'ว', name: 'wɔɔ wε̌εn', cls: 'low', initial: 'w', final: 'o' },
  { char: 'ศ', name: 'sɔ̌ɔ sǎa-laa', cls: 'high', initial: 's', final: 't' },
  { char: 'ษ', name: 'sɔ̌ɔ rʉʉ-sǐi', cls: 'high', initial: 's', final: 't' },
  { char: 'ส', name: 'sɔ̌ɔ sʉ̌a', cls: 'high', initial: 's', final: 't' },
  { char: 'ห', name: 'hɔ̌ɔ hìip', cls: 'high', initial: 'h', final: '' },
  { char: 'ฬ', name: 'lɔɔ jù-laa', cls: 'low', initial: 'l', final: 'n' },
  { char: 'อ', name: 'ɔɔ àang', cls: 'mid', initial: '', final: '' },
  { char: 'ฮ', name: 'hɔɔ nók-hûuk', cls: 'low', initial: 'h', final: '' },
]

export interface Sign {
  /** The sign as it appears on a card. ◌ marks the consonant's place. */
  char: string
  /** What it sounds like or does, in the app's romanization. */
  reads: string
  /** Where it sits relative to the consonant. */
  where: 'before' | 'after' | 'above' | 'below' | 'around' | 'alone'
}

/** Vowel signs and the marks that change a vowel. One card each in Script. */
export const VOWELS: Sign[] = [
  { char: 'า', reads: 'aa', where: 'after' },
  { char: 'ะ', reads: 'a, stops short', where: 'after' },
  { char: 'ั', reads: 'a, before a final', where: 'above' },
  { char: 'ำ', reads: 'am', where: 'after' },
  { char: 'ิ', reads: 'i', where: 'above' },
  { char: 'ี', reads: 'ii', where: 'above' },
  { char: 'ึ', reads: 'ʉ', where: 'above' },
  { char: 'ื', reads: 'ʉʉ', where: 'above' },
  { char: 'ุ', reads: 'u', where: 'below' },
  { char: 'ู', reads: 'uu', where: 'below' },
  { char: 'เ', reads: 'ee', where: 'before' },
  { char: 'แ', reads: 'εε', where: 'before' },
  { char: 'โ', reads: 'oo', where: 'before' },
  { char: 'ไ', reads: 'ai', where: 'before' },
  { char: 'ใ', reads: 'ai', where: 'before' },
  { char: '็', reads: 'shortens the vowel', where: 'above' },
  { char: 'เ◌อ', reads: 'əə', where: 'around' },
  { char: 'เ◌ีย', reads: 'ia', where: 'around' },
  { char: 'เ◌ือ', reads: 'ʉa', where: 'around' },
  { char: '◌ัว', reads: 'ua', where: 'around' },
  { char: 'เ◌ิ◌', reads: 'əə, before a final', where: 'around' },
  { char: 'เ◌ย', reads: 'əəi', where: 'around' },
  { char: '◌ว◌', reads: 'ua, before a final', where: 'around' },
  { char: 'เ◌าะ', reads: 'ɔ, stops short', where: 'around' },
  { char: 'ฤ', reads: 'rʉ́', where: 'alone' },
]

/** Tone marks are learned on words, never as cards of their own. */
export const TONE_MARKS = ['่', '้', '๊', '๋'] as const

/** Other marks that get a card. */
export const OTHER_SIGNS: Sign[] = [
  { char: '์', reads: 'silences the letter', where: 'above' },
  { char: 'ๆ', reads: 'repeat the word', where: 'after' },
  { char: 'ฯ', reads: 'shortened name', where: 'after' },
]

export const DIGITS = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'] as const
