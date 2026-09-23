/**
 * Brick-by-brick checks for the Voice dictionary.
 *
 * 1. Sequencing: every phrase and idiom at level N must decompose into word
 *    entries introduced at level <= N. A word entry is a lexical unit, even
 *    when it has a space in it ("kâo jai", "rót fai fáa"), so phrases are
 *    matched longest-first against the word list.
 * 2. Spelling: one Thai string, one rom, across all word entries. Homographs
 *    that are really said differently (ไหม mái / mǎi) carry the `homograph`
 *    tag on at least one side.
 * 3. Containment: the Thai of every word a phrase is built from must appear
 *    inside the phrase's Thai, so phrase spellings cannot drift from word
 *    spellings.
 */
import type { Entry } from './types'
import type { Problem } from './validate'
import { canonicalRom, expandAlternatives } from '../src/engine/normalize'

const MAX_WORD_TOKENS = 4
const PUNCT = new Set(['…', ',', '?', '!', '-', '.'])

/** Split a rom string into comparable tokens: hyphens count as spaces. */
export function romTokens(rom: string): string[] {
  return canonicalRom(rom)
    .replace(/-/g, ' ')
    .split(' ')
    .map((t) => t.replace(/[…,?!.]/g, ''))
    .filter((t) => t && !PUNCT.has(t))
}

export interface Lexeme {
  key: string
  level: number
  entry: Entry
}

export function buildLexicon(words: Entry[]): Map<string, Lexeme> {
  const lex = new Map<string, Lexeme>()
  for (const e of words) {
    const key = romTokens(e.rom).join(' ')
    const prev = lex.get(key)
    if (!prev || e.level < prev.level) lex.set(key, { key, level: e.level, entry: e })
  }
  return lex
}

export interface Decomposition {
  parts: Lexeme[]
  /** Tokens that matched nothing, or matched a word from a later level. */
  misses: Array<{ token: string; firstLevel: number | null }>
}

/** Greedy longest-match decomposition of one alternative of a phrase. */
export function decompose(rom: string, level: number, lex: Map<string, Lexeme>): Decomposition {
  const tokens = romTokens(rom)
  const parts: Lexeme[] = []
  const misses: Decomposition['misses'] = []
  let i = 0
  while (i < tokens.length) {
    let matched: Lexeme | null = null
    let late: { lex: Lexeme; n: number } | null = null
    let used = 1
    for (let n = Math.min(MAX_WORD_TOKENS, tokens.length - i); n >= 1; n--) {
      const key = tokens.slice(i, i + n).join(' ')
      const hit = lex.get(key)
      if (!hit) continue
      if (hit.level <= level) {
        matched = hit
        used = n
        break
      }
      if (!late) late = { lex: hit, n }
    }
    if (matched) {
      parts.push(matched)
      i += used
      continue
    }
    if (late) {
      misses.push({ token: tokens.slice(i, i + late.n).join(' '), firstLevel: late.lex.level })
      i += late.n
      continue
    }
    misses.push({ token: tokens[i]!, firstLevel: null })
    i += 1
  }
  return { parts, misses }
}

function stripThai(s: string): string {
  return s.replace(/[\s/]/g, '')
}

export function checkSequence(entries: Entry[]): Problem[] {
  const problems: Problem[] = []
  const voice = entries.filter((e) => (e.track ?? 'voice') === 'voice')
  const words = voice.filter((e) => e.kind === 'word')
  const lex = buildLexicon(words)

  // 2. one Thai, one rom
  const byThai = new Map<string, Entry>()
  for (const w of words) {
    const prev = byThai.get(w.thai)
    if (!prev) {
      byThai.set(w.thai, w)
      continue
    }
    const same = canonicalRom(prev.rom) === canonicalRom(w.rom)
    const allowed = prev.tags.includes('homograph') || w.tags.includes('homograph')
    if (!same && !allowed) {
      problems.push({ id: w.id, message: `Thai "${w.thai}" is also "${prev.rom}" in ${prev.id}; one spelling, or tag homograph` })
    }
  }

  // 1 + 3. phrases decompose into earlier words, and carry their Thai
  for (const e of voice) {
    if (e.kind === 'word') continue
    for (const alt of expandAlternatives(e.rom)) {
      const d = decompose(alt, e.level, lex)
      for (const m of d.misses) {
        problems.push({
          id: e.id,
          message:
            m.firstLevel === null
              ? `"${m.token}" is never introduced as a word`
              : `"${m.token}" is introduced at level ${m.firstLevel}, after this level ${e.level}`,
        })
      }
      const thai = stripThai(e.thai)
      let lastThai = ''
      for (const p of d.parts) {
        const t = stripThai(p.entry.thai)
        if (t === lastThai) continue // repeated word: ช้าๆ
        lastThai = t
        if (!thai.includes(t)) {
          problems.push({ id: e.id, message: `Thai does not contain "${p.entry.thai}" (${p.entry.rom}) from ${p.entry.id}` })
        }
      }
    }
  }
  return problems
}
