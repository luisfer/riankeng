import { ALLOWED_CODEPOINTS } from './system'
import { LEVELS } from './levels'
import type { Entry, LevelMeta, TrackId } from './types'
import { analyseRom } from '../src/engine/normalize'
import { cleanGloss, parseGloss } from '../src/engine/grader-en'
import { checkSequence } from './sequence'

/** Thai that asks. A woman ends a question with ká (คะ), a statement with kâ (ค่ะ). */
const ASKS = /ไหม|อะไร|ที่ไหน|เท่าไร|กี่|ยังไง|ใคร|เมื่อไร|หรือ/

export interface Problem {
  id: string
  message: string
}

export interface ValidationReport {
  problems: Problem[]
  counts: { total: number; words: number; phrases: number; idioms: number; perLevel: number[] }
}

/**
 * Validate the whole dictionary. `strict` also enforces per-level minimums
 * for every level (used once the content is complete).
 */
export function validateEntries(
  entries: Entry[],
  strict: boolean,
  opts: { levels?: LevelMeta[]; track?: TrackId; sequence?: boolean } = {},
): ValidationReport {
  const levels = opts.levels ?? LEVELS
  const track = opts.track ?? 'voice'
  const problems: Problem[] = []
  const seenIds = new Set<string>()
  const seenRomKind = new Set<string>()
  const perLevel = new Array<number>(levels.length).fill(0)
  const scoped = entries.filter((e) => (e.track ?? 'voice') === track)

  for (const e of scoped) {
    if (seenIds.has(e.id)) problems.push({ id: e.id, message: 'duplicate id' })
    seenIds.add(e.id)

    const romKey = `${track}|${e.kind}|${e.rom.normalize('NFD')}`
    if (seenRomKind.has(romKey) && !/#\d+$/.test(e.id)) {
      problems.push({ id: e.id, message: `duplicate rom for kind ${e.kind} (add a #n suffix if this is a homophone)` })
    }
    seenRomKind.add(romKey)

    if (!e.thai.trim()) problems.push({ id: e.id, message: 'missing Thai script' })
    if (!e.rom.trim()) problems.push({ id: e.id, message: 'missing rom' })
    if (!e.en.length) problems.push({ id: e.id, message: 'no English gloss' })
    for (const g of e.en) {
      if (!parseGloss(g).required.length) problems.push({ id: e.id, message: `gloss "${g}" has no required words` })
    }

    const nfd = e.rom.normalize('NFD')
    for (const ch of nfd) {
      if (!ALLOWED_CODEPOINTS.has(ch)) {
        problems.push({ id: e.id, message: `character U+${ch.codePointAt(0)!.toString(16).toUpperCase().padStart(4, '0')} "${ch}" not in the system` })
      }
    }
    if (/[A-Z]/.test(e.rom)) problems.push({ id: e.id, message: 'uppercase in rom' })
    if (/kráp\/kâ$/.test(e.rom.normalize('NFC')) && ASKS.test(e.thai)) {
      problems.push({ id: e.id, message: 'a question ends in kráp/ká (ครับ/คะ), not kráp/kâ' })
    }

    const a = analyseRom(e.rom)
    if (!a.valid) problems.push({ id: e.id, message: 'rom does not parse: tone mark off a vowel or two tone marks in one syllable' })
    if (!a.nuclei.length) problems.push({ id: e.id, message: 'rom has no vowel' })

    if (e.level < 0 || e.level >= levels.length) problems.push({ id: e.id, message: `level ${e.level} out of range` })
    else perLevel[e.level]!++

    if (e.minimalPairOf) {
      for (const other of e.minimalPairOf) {
        if (!entries.some((x) => x.id === other)) problems.push({ id: e.id, message: `minimalPairOf points to missing ${other}` })
      }
    }
  }

  for (const lvl of levels) {
    const n = perLevel[lvl.n] ?? 0
    if ((strict || n > 0) && n < lvl.min) {
      problems.push({ id: `level-${lvl.n}`, message: `level ${lvl.n} has ${n} entries, needs ${lvl.min}` })
    }
  }

  if (track === 'voice' && opts.sequence !== false) problems.push(...checkSequence(entries))

  return {
    problems,
    counts: {
      total: scoped.length,
      words: scoped.filter((e) => e.kind === 'word').length,
      phrases: scoped.filter((e) => e.kind === 'phrase').length,
      idioms: scoped.filter((e) => e.kind === 'idiom').length,
      perLevel,
    },
  }
}

/**
 * English prompts that more than one Voice card shows with a different answer. The sitting
 * accepts the twin's answer, but a prompt that tells them apart reads better. Warnings only.
 */
export function sharedPrompts(entries: Entry[]): Map<string, string[]> {
  const byPrompt = new Map<string, Set<string>>()
  for (const e of entries) {
    if ((e.track ?? 'voice') !== 'voice') continue
    const prompt = cleanGloss(e.en[0] ?? '').toLowerCase()
    // kráp/kâ on the end is politeness, not a different answer.
    const rom = e.rom.normalize('NFC').replace(/ kráp\/k[âá]$/, '')
    const roms = byPrompt.get(prompt) ?? new Set<string>()
    roms.add(rom)
    byPrompt.set(prompt, roms)
  }
  const shared = new Map<string, string[]>()
  for (const [prompt, roms] of byPrompt) if (roms.size > 1) shared.set(prompt, [...roms])
  return shared
}

