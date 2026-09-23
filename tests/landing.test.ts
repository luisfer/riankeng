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
  it('letters every panel with a real entry, as stored', () => {
    const panels = [...doc.querySelectorAll<HTMLElement>('[data-entry]')]
    expect(panels.length).toBeGreaterThanOrEqual(8)
    for (const panel of panels) {
      const id = panel.dataset.entry!
      const entry = getEntry(id)
      expect(entry, id).toBeDefined()
      expect(id).toBe(id.normalize('NFC'))
      expect(text(panel.querySelector('[lang="th"]')), id).toBe(entry!.thai)
      expect(text(panel.querySelector('[lang="th-Latn"]')), id).toBe(entry!.rom)
      expect(text(panel.querySelector('.en')), id).toBe(cleanGloss(entry!.en[0] ?? ''))
      expect(hasShippedClip(id), id).toBe(true)

      const card = demoByStem(panel.dataset.scene!)
      expect(card?.id, panel.dataset.scene).toBe(id)
      const balloon = panel.querySelector<HTMLElement>('.balloon')!
      expect(balloon.style.getPropertyValue('--em').trim()).toBe(String(card!.balloon.em))
      expect(balloon.style.getPropertyValue('--lines').trim()).toBe(String(card!.balloon.lines.length))
      expect(panel.querySelector('img')?.getAttribute('alt')).toBe(card!.alt)
    }
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

  it('ships every drawing it shows, square, with its size declared', () => {
    const imgs = [...doc.querySelectorAll('img')]
    expect(imgs.length).toBeGreaterThan(8)
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

  it('has one password form in the title panel, and a waitlist at the close', () => {
    expect(doc.querySelectorAll('.cell[data-slot]')).toHaveLength(8)
    expect(doc.querySelector('.cell.title form[data-signin]')?.id).toBe('gate')
    expect(doc.querySelector('.cell.title form[data-signin] input[name="password"]')?.id).toBe('password')
    expect(doc.querySelector('[data-nav-sign]')?.getAttribute('href')).toBe('#gate')
    expect(doc.querySelectorAll('form[data-signin]')).toHaveLength(1)
    expect(doc.querySelector('.close form[data-signin]')).toBeNull()
    expect(doc.querySelector('#device')).toBeNull()
    expect(doc.querySelector('#tracks, a[href="#tracks"]')).toBeNull()
    expect(text(doc.querySelector('#close-h'))).toBe('Speak with Thainess.')
    const waitlist = doc.querySelector('.close-copy a.btn')
    expect(text(waitlist)).toBe('Join the waitlist')
    expect(waitlist?.getAttribute('href')).toBe(
      'mailto:luisfer.romero.calero@gmail.com?subject=riian%20g%C3%A8ng%20waitlist',
    )
  })

  it('credits the romanization in the footer', () => {
    expect(text(doc.querySelector('.footer .footer-note'))).toBe(
      'Romanization adapted from the Paiboon system of Benjawan Poomsan Becker.',
    )
  })
})
