import { TONE_LABEL, type Tone } from '@content/system'
import { analyseRom } from './normalize'

export type ToneStepResult = { kind: 'advance'; next: number } | { kind: 'right' } | { kind: 'miss'; line: string }

export function toneSyllableShow(rom: string, step: number): string {
  const a = analyseRom(rom)
  return a.syllables[step] ?? a.nuclei[step]?.letters ?? rom
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
