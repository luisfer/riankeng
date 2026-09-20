import { writeFileSync } from 'node:fs'
import { LEVELS } from '../content/levels'
import { SCRIPT_LEVELS } from '../content/script/levels'
import { chrome } from '../src/ui/copy'

const lines = [
  '# Learner copy',
  '',
  '## Voice',
  ...LEVELS.flatMap((l) => [`### ${l.n} ${l.title}`, l.blurb, '']),
  '## Script',
  ...SCRIPT_LEVELS.flatMap((l) => [`### ${l.n} ${l.title}`, l.blurb, '']),
  '## Chrome',
  '',
  ...Object.values(chrome).flatMap((line) => [line, '']),
]

const out = new URL('../content/.learner-copy.md', import.meta.url)
writeFileSync(out, lines.join('\n'))
console.log(`wrote ${out.pathname}`)
