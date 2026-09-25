import { ENTRIES, SCRIPT_LEVELS } from '../content/index'
import { sharedPrompts, validateEntries } from '../content/validate'

const strict = process.argv.includes('--strict')
const voice = validateEntries(ENTRIES, strict)
const script = validateEntries(ENTRIES, strict, { track: 'script', levels: SCRIPT_LEVELS })

console.log(`voice: ${voice.counts.total}  script: ${script.counts.total}`)
console.log('voice per level:', voice.counts.perLevel.map((n, i) => `${i}:${n}`).join('  '))
console.log('script per level:', script.counts.perLevel.map((n, i) => `${i}:${n}`).join('  '))

const shared = sharedPrompts(ENTRIES)
if (shared.size) {
  console.warn(`\n${shared.size} English prompt(s) shared by different Voice answers (the sitting accepts either):`)
  for (const [prompt, roms] of shared) console.warn(`  "${prompt}": ${roms.join(', ')}`)
}

const problems = [...voice.problems, ...script.problems]
if (problems.length) {
  console.error(`\n${problems.length} problem(s):`)
  for (const p of problems) console.error(`  ${p.id}  —  ${p.message}`)
  process.exit(1)
}
console.log('content ok')
