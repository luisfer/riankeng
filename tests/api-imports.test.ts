import { readdirSync, readFileSync } from 'node:fs'
import { dirname, join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

/* Vercel runs api/ as plain Node ESM, one transpiled file per module, and Node
   resolves a relative import only when it names the file, extension and all. */
const ROOT = process.cwd()
const RELATIVE = /(?:import|export)[^'"]*?from\s*['"](\.{1,2}\/[^'"]+)['"]/g

function reachable(entry: string, seen = new Map<string, string[]>()): Map<string, string[]> {
  if (seen.has(entry)) return seen
  const specs = [...readFileSync(entry, 'utf-8').matchAll(RELATIVE)].map((m) => m[1]!)
  seen.set(entry, specs)
  for (const spec of specs.filter((s) => s.endsWith('.js'))) {
    reachable(join(dirname(entry), spec.replace(/\.js$/, '.ts')), seen)
  }
  return seen
}

describe('the serverless functions', () => {
  it('name every relative import with its .js extension, all the way down', () => {
    const entries = readdirSync(join(ROOT, 'api')).filter((f) => f.endsWith('.ts'))
    expect(entries.length).toBeGreaterThan(0)
    for (const entry of entries) {
      for (const [file, specs] of reachable(join(ROOT, 'api', entry))) {
        for (const spec of specs) expect(spec, `${relative(ROOT, file)} imports ${spec}`).toMatch(/\.js$/)
      }
    }
  })
})
