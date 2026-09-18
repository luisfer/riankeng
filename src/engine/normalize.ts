import {
  CHAR_ALIASES,
  DOT_BELOW,
  SEPARATORS,
  TONE_BY_MARK,
  VOWEL_BASES,
  type Tone,
} from '@content/system'

/** Lowercase, NFD, apply character aliases, collapse whitespace. */
export function canonicalRom(input: string): string {
  let s = input.normalize('NFD').toLowerCase()
  let out = ''
  for (const ch of s) out += CHAR_ALIASES[ch] ?? ch
  // A learner might type the dot-below after a tone mark; canonical order is dot first.
  out = out.normalize('NFD')
  return out.replace(/\s+/g, ' ').trim()
}

export interface Nucleus {
  /** Index of this nucleus among all nuclei (0-based). Doubles as syllable index. */
  index: number
  /** Vowel letters without tone marks, e.g. "aao", "u\u0323\u0323"? no: "u̥u̥" kept as "u\u0323u\u0323" */
  letters: string
  tone: Tone
  /** Number of distinct tone marks seen; >1 is invalid input. */
  markCount: number
}

export interface RomAnalysis {
  /** Canonical input with separators removed and tone marks stripped. */
  skeleton: string
  /** Skeleton with long vowels collapsed to short (aa → a, ɔɔ → ɔ). */
  collapsed: string
  nuclei: Nucleus[]
  /** Syllable chunks for display, derived from the skeleton with tone marks re-attached. */
  syllables: string[]
  valid: boolean
}

const TONE_MARK_SET = new Set(Object.keys(TONE_BY_MARK))

function isVowelBase(ch: string): boolean {
  return VOWEL_BASES.has(ch)
}

/**
 * Analyse a romanized string: strip separators, split tone from skeleton,
 * find vowel nuclei and their tones.
 */
export function analyseRom(input: string): RomAnalysis {
  const s = canonicalRom(input)
  let skeleton = ''
  const nuclei: Nucleus[] = []
  let current: { letters: string; marks: Set<string> } | null = null
  const syllableToneMarks: string[] = [] // tone mark per nucleus, in order
  let valid = true

  const closeNucleus = () => {
    if (!current) return
    const marks = [...current.marks]
    const tone: Tone = marks.length === 1 ? TONE_BY_MARK[marks[0]!]! : 'mid'
    if (marks.length > 1) valid = false
    nuclei.push({ index: nuclei.length, letters: current.letters, tone, markCount: marks.length })
    syllableToneMarks.push(marks.length === 1 ? marks[0]! : '')
    current = null
  }

  const chars = [...s]
  for (let idx = 0; idx < chars.length; idx++) {
    const ch = chars[idx]!
    if (SEPARATORS.has(ch) || ch === '…' || ch === ',' || ch === '?' || ch === '!' || ch === "'") {
      // A break between two vowels is a glottal stop and part of the skeleton
      // ("sà-àat" = "sà'àat"). Elsewhere separators and apostrophes are ignored.
      const prevIsVowel = current !== null
      let k = idx + 1
      while (k < chars.length && (SEPARATORS.has(chars[k]!) || chars[k] === "'")) k++
      const nextIsVowel = k < chars.length && isVowelBase(chars[k]!)
      closeNucleus()
      if (prevIsVowel && nextIsVowel) skeleton += "'"
      continue
    }
    if (TONE_MARK_SET.has(ch)) {
      if (current) current.marks.add(ch)
      else valid = false // tone mark not on a vowel
      continue
    }
    if (ch === DOT_BELOW) {
      if (current && current.letters.endsWith('u')) {
        current.letters += ch
        skeleton += ch
      } else {
        valid = false
      }
      continue
    }
    if (isVowelBase(ch)) {
      if (!current) current = { letters: '', marks: new Set() }
      current.letters += ch
      skeleton += ch
      continue
    }
    // "-ay" / "-aw" after a vowel are the same glides as "-ai" / "-ao"
    if ((ch === 'y' || ch === 'w') && current) {
      const next = chars[idx + 1]
      const nextIsVowel = next !== undefined && isVowelBase(next)
      if (!nextIsVowel) {
        const glide = ch === 'y' ? 'i' : 'o'
        current.letters += glide
        skeleton += glide
        continue
      }
    }
    // consonant or anything else
    closeNucleus()
    skeleton += ch
  }
  closeNucleus()

  return {
    skeleton,
    collapsed: collapseLength(skeleton),
    nuclei,
    syllables: chunkSyllables(skeleton, syllableToneMarks),
    valid,
  }
}

/** aa → a, ɔɔ → ɔ, ụụ → ụ. Keeps diphthongs (ia, ua, ao...) intact. */
export function collapseLength(skeleton: string): string {
  const units = toUnits(skeleton)
  const out: string[] = []
  for (const u of units) {
    if (out.length && out[out.length - 1] === u && isVowelBase(u[0]!)) continue
    out.push(u)
  }
  return out.join('')
}

/** Split into letter units where ụ (u + dot) is one unit. */
export function toUnits(skeleton: string): string[] {
  const units: string[] = []
  for (const ch of skeleton) {
    if (ch === DOT_BELOW && units.length) units[units.length - 1] += ch
    else units.push(ch)
  }
  return units
}

const ONSET_SET = new Set([
  'bpr', 'bpl', 'dtr', 'bp', 'dt', 'ch', 'ng', 'kr', 'kl', 'kw', 'gr', 'gl', 'gw', 'pr', 'pl', 'tr', 'fr', 'fl', 'sr',
  'k', 'g', 'j', 'p', 'b', 't', 'd', 'm', 'n', 'l', 'r', 'y', 'w', 'f', 's', 'h', "'",
])
const FINAL_SET = new Set(['ng', 'k', 'p', 't', 'm', 'n', 'w', 'y', 'b', 'd', 'g', 'l', 'r', 's'])

/**
 * Chunk a skeleton into syllables and re-attach tone marks to the first vowel
 * letter of each nucleus. Ambiguous consonant clusters between nuclei are split
 * preferring the longest final that leaves a valid onset.
 */
export function chunkSyllables(skeleton: string, toneMarks: string[]): string[] {
  const units = toUnits(skeleton)
  const syllables: string[] = []
  let i = 0
  let n = 0
  while (i < units.length) {
    // onset: consonants until a vowel
    let onset = ''
    while (i < units.length && !isVowelBase(units[i]![0]!)) {
      onset += units[i]
      i++
    }
    // nucleus
    let nucleus = ''
    while (i < units.length && isVowelBase(units[i]![0]!)) {
      nucleus += units[i]
      i++
    }
    // following consonants
    let cons = ''
    let j = i
    while (j < units.length && !isVowelBase(units[j]![0]!)) {
      cons += units[j]
      j++
    }
    let final = ''
    if (j >= units.length) {
      final = cons // word ends here
    } else {
      // choose longest final such that remainder is a valid onset
      let chosen = ''
      for (let len = Math.min(2, cons.length); len >= 0; len--) {
        const f = cons.slice(0, len)
        const rest = cons.slice(len)
        if ((len === 0 || FINAL_SET.has(f)) && ONSET_SET.has(rest)) {
          chosen = f
          break
        }
      }
      final = chosen
    }
    i += toUnits(final).length
    if (!nucleus) {
      // trailing consonants with no vowel: attach to previous syllable
      if (syllables.length) syllables[syllables.length - 1] += onset + final
      else syllables.push(onset + final)
      continue
    }
    const mark = toneMarks[n] ?? ''
    n++
    const nUnits = toUnits(nucleus)
    const marked = nUnits[0]! + mark + nUnits.slice(1).join('')
    syllables.push((onset + marked + final).normalize('NFC'))
  }
  return syllables
}

/** Display form: NFC, first-vowel tone placement, single spaces. */
export function displayRom(rom: string): string {
  return canonicalRom(rom).normalize('NFC')
}

/**
 * Expand "kráp/kâ" style alternatives into separate full strings.
 * Only whitespace-delimited tokens containing "/" branch.
 */
export function expandAlternatives(rom: string): string[] {
  const tokens = rom.split(' ')
  let results: string[][] = [[]]
  for (const tok of tokens) {
    const options = tok.includes('/') ? tok.split('/').filter(Boolean) : [tok]
    const next: string[][] = []
    for (const r of results) for (const o of options) next.push([...r, o])
    results = next
  }
  return results.map((r) => r.join(' '))
}
