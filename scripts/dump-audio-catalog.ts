import { writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { ENTRIES, entryTrack } from '../content/index.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const rows = ENTRIES.filter((e) => entryTrack(e) === 'voice').map((e) => ({
  id: e.id,
  thai: e.thai,
  level: e.level,
}))
const out = join(root, 'public', 'audio', 'catalog.json')
writeFileSync(out, JSON.stringify(rows, null, 0) + '\n')
process.stdout.write(`${rows.length}\n`)
