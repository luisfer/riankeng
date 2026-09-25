import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { slopHits } from './copy-rules'

/* vitest runs from the repo root. */
const ROOT = process.cwd()

function head(rel: string): Document {
  const html = readFileSync(join(ROOT, rel), 'utf-8')
  /* happy-dom would fetch stylesheets and fonts. Keep the canonical link, drop the rest. */
  const quiet = html.replace(/<link(?![^>]*rel="canonical")[^>]*>/g, '').replace(/<script[\s\S]*?<\/script>/g, '')
  return new DOMParser().parseFromString(quiet, 'text/html')
}

function meta(doc: Document, key: string): string {
  const el = doc.querySelector(`meta[property="${key}"], meta[name="${key}"]`)
  return el?.getAttribute('content') ?? ''
}

/** Width and height from a PNG's IHDR chunk. */
function pngSize(rel: string): [number, number] {
  const buf = readFileSync(join(ROOT, rel))
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)]
}

describe('link previews', () => {
  for (const [rel, url] of [
    ['index.html', 'https://riangeng.com/'],
    ['preview/index.html', 'https://riangeng.com/preview/'],
  ] as const) {
    it(`gives ${rel} a large card with an absolute image`, () => {
      const doc = head(rel)
      expect(doc.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(url)
      expect(meta(doc, 'og:url')).toBe(url)
      expect(meta(doc, 'og:type')).toBe('website')
      expect(meta(doc, 'og:title')).not.toBe('')
      expect(meta(doc, 'og:image')).toBe('https://riangeng.com/og.png')
      expect(meta(doc, 'og:image:width')).toBe('1200')
      expect(meta(doc, 'og:image:height')).toBe('630')
      expect(meta(doc, 'og:image:alt')).not.toBe('')
      expect(meta(doc, 'twitter:card')).toBe('summary_large_image')
      const copy = [meta(doc, 'og:title'), meta(doc, 'og:description'), meta(doc, 'description'), doc.title]
      expect(slopHits(copy)).toEqual([])
      // The clips are a neural voice. Nothing public calls them recorded.
      expect(copy.join(' ')).not.toMatch(/record/i)
    })
  }

  it('ships the share image at 1200 by 630, under a megabyte', () => {
    expect(pngSize('public/og.png')).toEqual([1200, 630])
    expect(readFileSync(join(ROOT, 'public/og.png')).length).toBeLessThan(1024 * 1024)
  })

  it('names the preview by what it holds', () => {
    expect(head('preview/index.html').title).toBe('Twenty-five words, rian gèng')
  })

  it('keeps the course and the gallery out of search', () => {
    expect(existsSync(join(ROOT, 'public/robots.txt'))).toBe(true)
    const robots = readFileSync(join(ROOT, 'public/robots.txt'), 'utf-8')
    expect(robots).toMatch(/^Disallow: \/learn\/$/m)
    expect(robots).toMatch(/^Disallow: \/gallery\/$/m)
  })
})
