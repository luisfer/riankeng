import { describe, expect, it } from 'vitest'
import { ENTRIES } from '../content/index'
import { LEVELS } from '../content/levels'
import { SCRIPT_LEVELS } from '../content/script/levels'
import { landing } from '../src/landing/copy'
import { chrome } from '../src/ui/copy'
import { slopHits } from './copy-rules'

function learnerLines(): string[] {
  return [
    ...LEVELS.map((l) => l.blurb),
    ...SCRIPT_LEVELS.map((l) => l.blurb),
    ...Object.values(chrome),
    ...Object.values(landing),
    // Notes and word-for-word readings show on the card when it is met.
    ...ENTRIES.flatMap((e) => [e.note ?? '', e.literal ?? '']).filter(Boolean),
  ]
}

describe('learner copy', () => {
  it('does not coach, sell, or use a banned mark', () => {
    expect(slopHits(learnerLines())).toEqual([])
  })

  it('keeps Voice 0 as the sounds, not a sitting slogan', () => {
    expect(LEVELS[0]!.blurb).toBe('Five tones. Long and short vowels. g/k, bp/p, dt/t.')
    expect(LEVELS[0]!.blurb).not.toMatch(/hear, then write/i)
  })
})
