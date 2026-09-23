import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getEntry } from '../content/index'
import { hasShippedClip } from '../src/audio/clips'
import { cleanGloss } from '../src/engine/grader-en'
import { DEMO, DEMO_IDS, QUIET, demoByStem } from '../src/landing/demo'
import { slopHits } from './copy-rules'

/* vitest runs from the repo root. import.meta.url is not a file URL under happy-dom. */
const ROOT = process.cwd()
const html = readFileSync(join(ROOT, 'index.html'), 'utf-8')
/* happy-dom would fetch the stylesheets and the module. The markup is what is under test. */
const doc = new DOMParser().parseFromString(html.replace(/<link[^>]*>/g, '').replace(/<script[\s\S]*?<\/script>/g, ''), 'text/html')

function text(el: Element | null): string {
  return (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
}

describe('the landing page', () => {
  it('leaves the comic slots empty so the script can paint once', () => {
    expect(text(doc.querySelector('.cell.title h1'))).toBe('Learn Thai as Thais speak it.')
    const slots = [...doc.querySelectorAll<HTMLElement>('.cell[data-slot]')]
    expect(slots).toHaveLength(8)
    for (const slot of slots) {
      expect(slot.querySelector('a.panel')?.getAttribute('data-entry')).toBeNull()
      expect(slot.querySelector('img')?.getAttribute('src')).toBeNull()
    }
    const waitlist = doc.querySelector('.cell.title form.waitlist')
    expect(text(waitlist?.querySelector('.waitlist-en') ?? null)).toBe('Join the waitlist')
    expect(text(waitlist?.querySelector('.waitlist-rom') ?? null)).toBe('long chụ̂ụ rɔɔ')
    expect(text(waitlist?.querySelector('.waitlist-th') ?? null)).toBe('ลงชื่อรอ')
    expect(waitlist?.querySelector('input[name="email"]')).not.toBeNull()
    expect(text(waitlist?.querySelector('button[type="submit"]') ?? null)).toBe('Join')
  })

  it('draws from the demo data, which itself matches the course', () => {
    for (const card of DEMO) {
      const entry = getEntry(card.id)
      expect(entry, card.stem).toBeDefined()
      expect(card.thai).toBe(entry!.thai)
      expect(card.rom).toBe(entry!.rom)
      expect(card.en).toBe(cleanGloss(entry!.en[0] ?? ''))
      expect(card.balloon.lines.join('')).toBe(card.thai)
      expect(hasShippedClip(card.id)).toBe(true)
      expect(existsSync(join(ROOT, 'art', 'scenes', `${card.stem}.png`)), card.stem).toBe(true)
      expect(existsSync(join(ROOT, 'public', 'scenes', `${card.stem}-980.webp`)), card.stem).toBe(true)
      expect(existsSync(join(ROOT, 'public', 'scenes', `${card.stem}-490.webp`)), card.stem).toBe(true)
    }
    expect(DEMO.length).toBe(38)
    expect(new Set(DEMO_IDS).size).toBe(DEMO.length)
  })

  it('ships every quiet drawing, none of them a lettered panel', () => {
    expect(QUIET.length).toBeGreaterThanOrEqual(8)
    expect(new Set(QUIET.map((q) => q.stem)).size).toBe(QUIET.length)
    for (const q of QUIET) {
      expect(demoByStem(q.stem), q.stem).toBeUndefined()
      expect(q.alt.length, q.stem).toBeGreaterThan(20)
      expect(existsSync(join(ROOT, 'art', 'scenes', `${q.stem}.png`)), q.stem).toBe(true)
      expect(existsSync(join(ROOT, 'public', 'scenes', `${q.stem}-980.webp`)), q.stem).toBe(true)
      expect(existsSync(join(ROOT, 'public', 'scenes', `${q.stem}-490.webp`)), q.stem).toBe(true)
    }
    expect(slopHits(QUIET.map((q) => q.alt))).toEqual([])
  })

  it('leaves the close drawing empty so the script can pick a quiet one', () => {
    const close = doc.querySelector<HTMLImageElement>('.night-art')
    expect(close).not.toBeNull()
    expect(close?.getAttribute('src')).toBeNull()
    expect(close?.getAttribute('alt')).toBe('')
  })

  it('ships every drawing it shows, square, with its size declared', () => {
    const imgs = [...doc.querySelectorAll('img')].filter((img) => img.getAttribute('src'))
    expect(imgs.length).toBeGreaterThanOrEqual(1)
    for (const img of imgs) {
      const sources = [img.getAttribute('src')!, ...(img.getAttribute('srcset') ?? '').split(',').map((s) => s.trim().split(' ')[0]!)].filter(Boolean)
      for (const src of sources) {
        expect(src.startsWith('/scenes/'), src).toBe(true)
        expect(existsSync(join(ROOT, 'public', src)), src).toBe(true)
      }
      expect(img.getAttribute('width')).toBe('980')
      expect(img.getAttribute('height')).toBe('980')
      expect(img.hasAttribute('alt')).toBe(true)
    }
  })

  it('does not coach, sell, or use a banned mark', () => {
    const lines = [...doc.querySelectorAll('h1, h2, h3, p, li, label, button, a, title')].map(text).filter(Boolean)
    lines.push(doc.querySelector('meta[name="description"]')?.getAttribute('content') ?? '')
    expect(slopHits(lines)).toEqual([])
    expect(html).not.toMatch(/[—·]/)
  })

  it('names the extra vowels on the try card, without coaching the sitting', () => {
    expect(text(doc.querySelector('#try .lede'))).toBe(
      'Thai has more vowels than English, and five tones. The keys write ε, ɔ, ə, ụ and the marks.',
    )
  })

  it('has one password form in the title panel, and a waitlist at the close', () => {
    expect(doc.querySelector('.cell.title form[data-signin]')?.id).toBe('gate')
    expect(doc.querySelector('.cell.title form[data-signin] input[name="password"]')?.id).toBe('password')
    expect(doc.querySelector('[data-nav-sign]')?.getAttribute('href')).toBe('#gate')
    expect(text(doc.querySelector('[data-nav-sign]'))).toBe('Log in')
    expect(doc.querySelectorAll('form[data-signin]')).toHaveLength(1)
    expect(doc.querySelector('.close form[data-signin]')).toBeNull()
    expect(doc.querySelector('#device')).toBeNull()
    expect(doc.querySelector('#tracks, a[href="#tracks"]')).toBeNull()
    expect(text(doc.querySelector('#close-h'))).toBe('Speak with Thainess.')
    const waitlist = doc.querySelector('.close-copy form.waitlist')
    expect(text(waitlist?.querySelector('.waitlist-en') ?? null)).toBe('Join the waitlist')
    expect(text(waitlist?.querySelector('.waitlist-rom') ?? null)).toBe('long chụ̂ụ rɔɔ')
    expect(text(waitlist?.querySelector('.waitlist-th') ?? null)).toBe('ลงชื่อรอ')
    expect(waitlist?.querySelector('input[name="email"]')).not.toBeNull()
  })

  it('keeps the English of the name under the wordmark', () => {
    expect(text(doc.querySelector('.nav .wordmark-en'))).toBe('learn well')
    expect(text(doc.querySelector('.nav .wordmark-rom'))).toBe('rian gèng')
    expect(text(doc.querySelector('.nav .wordmark-th'))).toBe('เรียนเก่ง')
  })

  it('credits the romanization in the footer', () => {
    expect(text(doc.querySelector('.footer .footer-note'))).toBe(
      'Romanization adapted from the Paiboon system of Benjawan Poomsan Becker.',
    )
  })
})
