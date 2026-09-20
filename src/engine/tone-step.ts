import { TONE_BY_MARK, TONE_LABEL, type Tone } from '@content/system'
import { analyseRom } from './normalize'

export type ToneStepResult = { kind: 'advance'; next: number } | { kind: 'right' } | { kind: 'miss'; line: string }

const TONE_MARKS = new Set(Object.keys(TONE_BY_MARK))

export function stripToneMarks(rom: string): string {
  let out = ''
  for (const ch of rom.normalize('NFD')) {
    if (TONE_MARKS.has(ch)) continue
    out += ch
  }
  return out
}

export function toneSyllableShow(rom: string, step: number): string {
  const a = analyseRom(rom)
  return a.syllables[step] ?? a.nuclei[step]?.letters ?? rom
}

/** Letters only. A tone desk that shows à/â/á/ǎ is reading, not listening. */
export function toneBareShow(rom: string, step?: number): string {
  if (step === undefined) return stripToneMarks(rom)
  return stripToneMarks(toneSyllableShow(rom, step))
}

export function judgeTonePick(rom: string, step: number, pick: Tone): ToneStepResult {
  const nuclei = analyseRom(rom).nuclei
  const expected = nuclei[step]?.tone ?? 'mid'
  if (pick !== expected) {
    return { kind: 'miss', line: nuclei.map((n) => TONE_LABEL[n.tone]).join(', ') }
  }
  if (step + 1 < nuclei.length) return { kind: 'advance', next: step + 1 }
  return { kind: 'right' }
}
