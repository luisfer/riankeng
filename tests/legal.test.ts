import { readFileSync } from 'node:fs'
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
