import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { slopHits } from './copy-rules'

const ROOT = process.cwd()

function page(name: string): Document {
  const html = readFileSync(join(ROOT, name), 'utf-8')
  return new DOMParser().parseFromString(html.replace(/<link[^>]*>/g, ''), 'text/html')
}

function text(el: Element | null): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

describe('privacy and terms', () => {
  const landing = page('index.html')
  const privacy = page('privacy.html')
  const terms = page('terms.html')

  it('links both pages from the landing footer', () => {
    const links = [...landing.querySelectorAll('.footer-legal a')].map((a) => a.getAttribute('href'))
    expect(links).toEqual(['/privacy', '/terms'])
  })

  it('names the company, the office, and the contact', () => {
    for (const doc of [privacy, terms]) {
      const body = text(doc.body)
      expect(body).toContain('Pristine Mekong Pte. Ltd.')
      expect(body).toContain('202609906N')
      expect(body).toContain('160 Robinson Road, #14-04')
      expect(slopHits([body])).toEqual([])
    }
    expect(text(privacy.querySelector('h1'))).toBe('Privacy')
    expect(privacy.body.innerHTML).toContain('mailto:pristinemekong@mail.com')
    expect(text(terms.querySelector('h1'))).toBe('Terms')
  })
})

describe('footer links resolve on Vercel', () => {
  const vercel = JSON.parse(readFileSync(join(ROOT, 'vercel.json'), 'utf-8')) as {
    rewrites?: { source: string; destination: string }[]
  }
  const rewrites = new Map((vercel.rewrites ?? []).map((r) => [r.source, r.destination]))

  // A path works when a rewrite names it and its destination is a built page, or when it is a page itself.
  function served(href: string): boolean {
    const dest = rewrites.get(href) ?? href
    const file = dest.endsWith('/') ? `${dest}index.html` : dest
    return file.endsWith('.html') && existsSync(join(ROOT, file.replace(/^\//, '')))
  }

  for (const name of ['index.html', 'privacy.html', 'terms.html', '404.html']) {
    it(`serves every footer link on ${name}`, () => {
      const hrefs = [...page(name).querySelectorAll('.footer-legal a, .legal .meta a')]
        .map((a) => a.getAttribute('href') ?? '')
        .filter((h) => h.startsWith('/'))
      expect(hrefs.length).toBeGreaterThan(0)
      for (const href of hrefs) expect(served(href), href).toBe(true)
    })
  }

  it('has a not-found page with a way home', () => {
    const notFound = page('404.html')
    expect(text(notFound.querySelector('h1'))).toBe('No page here.')
    expect(notFound.querySelector('main a[href="/"]')).not.toBeNull()
    expect(slopHits([text(notFound.body)])).toEqual([])
  })
})

