import { describe, expect, it } from 'vitest'
import { LEVELS } from '../content/levels'
import { SCRIPT_LEVELS } from '../content/script/levels'
import { chrome } from '../src/ui/copy'

/** Patterns slopless misses that still read as a pitch, not a primer. */
const BANNED: Array<[RegExp, string]> = [
  [/\byou will\b/i, 'you will'],
  [/\bears first\b/i, 'ears first'],
  [/\bfor free\b/i, 'for free'],
  [/\bactually\b/i, 'actually'],
  [/hear,\s*say,\s*and name/i, 'hear, say, and name'],
  [/written so you can hear it/i, 'written so you can hear it'],
  [/journey 1 ends here/i, 'journey 1 ends here'],
  [/anywhere in Thailand tonight/i, 'anywhere in Thailand tonight'],
  [/—/, 'em dash'],
  [/·/, 'middot'],
]

function learnerLines(): string[] {
  return [
    ...LEVELS.map((l) => l.blurb),
    ...SCRIPT_LEVELS.map((l) => l.blurb),
    ...Object.values(chrome),
  ]
}

describe('learner copy', () => {
  it('does not coach, sell, or use a banned mark', () => {
    const hits: string[] = []
    for (const line of learnerLines()) {
      for (const [re, name] of BANNED) {
        if (re.test(line)) hits.push(`${name}: ${line}`)
      }
    }
    expect(hits).toEqual([])
  })

  it('keeps Voice 0 as the sounds, not a sitting slogan', () => {
    expect(LEVELS[0]!.blurb).toBe('Five tones. Long and short vowels. g/k, bp/p, dt/t.')
    expect(LEVELS[0]!.blurb).not.toMatch(/hear, then write/i)
  })
})
