import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { LOCKUP } from '../src/brand/paths'

/* vitest runs from the repo root. */
const ROOT = process.cwd()
const read = (rel: string) => readFileSync(join(ROOT, rel), 'utf-8')

/** Width and height from a PNG's IHDR. */
function pngSize(rel: string): [number, number] {
  const b = readFileSync(join(ROOT, rel))
  return [b.readUInt32BE(16), b.readUInt32BE(20)]
}

describe('the mark', () => {
  it('ships every icon the pages and the manifest point at, at the size they declare', () => {
    const refs = [read('index.html'), read('learn/index.html'), read('vite.config.ts')]
      .join('\n')
      .matchAll(/["'](\/(?:favicon\.(?:svg|ico)|icons\/[\w-]+\.png))["'](?:,\s*sizes:\s*'(\d+)x\d+')?/g)
    const seen = new Set<string>()
    for (const [, src, size] of refs) {
      seen.add(src!)
      expect(existsSync(join(ROOT, 'public', src!)), src).toBe(true)
      if (size) expect(pngSize(join('public', src!)), src).toEqual([Number(size), Number(size)])
    }
    expect([...seen]).toEqual(
      expect.arrayContaining(['/favicon.svg', '/favicon.ico', '/icons/apple-touch-icon.png', '/icons/icon-maskable-512.png']),
    )
    expect(pngSize('public/icons/apple-touch-icon.png')).toEqual([180, 180])
  })

  it('is paper ก่ on a lacquer square', () => {
    const svg = read('public/favicon.svg')
    expect(svg).toContain('<rect width="1000" height="1000" fill="#9a2b1f"/>')
    expect(svg).toContain('fill="#f2ead8"')
    expect(svg).toContain('<title>rian gèng, เรียนเก่ง</title>')
  })

  it('keeps the lockup the course can draw in step with the master the generator writes', () => {
    const master = read('public/brand/lockup.svg')
    expect(master).toContain(`viewBox="0 0 ${LOCKUP.width} ${LOCKUP.height}"`)
    expect(master).toContain(`<path d="${LOCKUP.thaiMark + LOCKUP.romMark}" fill="#9a2b1f"/>`)
    expect(master).toContain(`<path d="${LOCKUP.thaiInk + LOCKUP.romInk}" fill="#1c1710"/>`)
  })

  it('draws both tone marks, and only the tone marks, in lacquer', () => {
    // One mai ek over ก, one grave over è: a single closed shape each.
    expect(LOCKUP.thaiMark.match(/M/g)).toHaveLength(1)
    expect(LOCKUP.romMark.match(/M/g)).toHaveLength(1)
  })
})
