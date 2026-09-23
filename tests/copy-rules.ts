/** Patterns slopless misses that still read as a pitch, not a primer. Shared by the copy tests. */
export const BANNED: Array<[RegExp, string]> = [
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

/** Every banned pattern a line trips, named. */
export function slopHits(lines: string[]): string[] {
  const hits: string[] = []
  for (const line of lines) {
    for (const [re, name] of BANNED) {
      if (re.test(line)) hits.push(`${name}: ${line}`)
    }
  }
  return hits
}
