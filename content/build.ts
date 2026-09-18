import type { Entry, Kind, PhraseRow, WordRow } from './types'

const PREFIX: Record<Kind, string> = { word: 'w', phrase: 'p', idiom: 'i' }

export function scriptWords(level: number, rows: WordRow[]): Entry[] {
  return words(level, rows, ['script']).map((e) => ({
    ...e,
    id: e.id.replace(/^w:/, 's:'),
    track: 'script' as const,
  }))
}

/**
 * Ids are `${prefix}:${rom}`. Homophones in the same kind must be
 * disambiguated in the data with a trailing `#n` on the rom, which is stripped
 * from the displayed rom but kept in the id.
 */
function splitId(rom: string): { rom: string; suffix: string } {
  const m = /^(.*?)(#\d+)$/.exec(rom)
  if (!m) return { rom, suffix: '' }
  return { rom: m[1]!, suffix: m[2]! }
}

export function words(level: number, rows: WordRow[], extraTags: string[] = []): Entry[] {
  return rows.map((r) => {
    const [rawRom, thai, en, pos, tags, note] = r
    const { rom, suffix } = splitId(rawRom)
    const e: Entry = {
      id: `${PREFIX.word}:${rom}${suffix}`,
      thai,
      rom,
      en,
      kind: 'word',
      level,
      tags: [...extraTags, ...(tags ?? [])],
    }
    if (pos) e.pos = pos
    if (note) e.note = note
    const parts = e.tags.find((t) => t.startsWith('parts:'))
    if (parts) e.compose = parts.slice(6).split('+').filter(Boolean)
    return e
  })
}

export function phrases(level: number, rows: PhraseRow[], extraTags: string[] = []): Entry[] {
  return rows.map((r) => {
    const [rawRom, thai, en, note, literal] = r
    const { rom, suffix } = splitId(rawRom)
    const e: Entry = {
      id: `${PREFIX.phrase}:${rom}${suffix}`,
      thai,
      rom,
      en,
      kind: 'phrase',
      level,
      tags: [...extraTags],
    }
    if (note) e.note = note
    if (literal) e.literal = literal
    return e
  })
}

export function idioms(level: number, rows: PhraseRow[], extraTags: string[] = []): Entry[] {
  return phrases(level, rows, extraTags).map((e) => ({ ...e, id: e.id.replace(/^p:/, 'i:'), kind: 'idiom' as const }))
}
