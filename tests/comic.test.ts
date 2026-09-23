import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { Window } from 'happy-dom'
import { describe, expect, it } from 'vitest'
import {
  COMIC_SLOTS,
  LAYOUTS,
  balloonNeedsWidth,
  fillClose,
  fillComic,
  mountComic,
  pickComic,
  pickLayout,
  placeComic,
} from '../src/landing/comic'
import { DEMO, QUIET, demoByStem } from '../src/landing/demo'

function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0x100000000
  }
}

function slotDoc(n = 8) {
  const window = new Window()
  const document = window.document as unknown as Document
  document.body.innerHTML = `<div class="comic"><div class="cell title"><h1>Learn Thai as Thais speak it.</h1></div>${Array.from(
    { length: n },
    (_, i) => {
      const card = DEMO[i]!
      return `<div class="cell" data-slot="${i}">
      <a class="panel" data-scene="${card.stem}" data-entry="${card.id}">
        <img src="/scenes/${card.stem}-980.webp" alt="${card.alt}" />
        <span class="balloon" lang="th"></span>
        <span class="caption"><span class="rom"></span><span class="en"></span></span>
      </a>
    </div>`
    },
  ).join('')}</div>`
  return { document, close: () => void window.happyDOM.close() }
}

describe('pickComic', () => {
  it('draws n unique cards from the pool', () => {
    const got = pickComic(DEMO, 8, lcg(1))
    expect(got).toHaveLength(8)
    expect(new Set(got.map((c) => c.stem)).size).toBe(8)
    for (const card of got) expect(DEMO).toContain(card)
  })

  it('shuffles: two seeds do not lay the same day', () => {
    const a = pickComic(DEMO, 8, lcg(1)).map((c) => c.stem).join()
    const b = pickComic(DEMO, 8, lcg(2)).map((c) => c.stem).join()
    expect(a).not.toBe(b)
  })
})

describe('layouts', () => {
  it('picks a side and paints eight unique cards once', () => {
    const layout = pickLayout(lcg(3))
    expect(LAYOUTS).toContain(layout)
    const { document, close } = slotDoc(COMIC_SLOTS)
    const cards = placeComic(pickComic(DEMO, COMIC_SLOTS, lcg(3)))
    mountComic(document, cards, layout, 'top')
    const comic = document.querySelector('.comic')!
    expect(comic.getAttribute('data-layout')).toBe(layout)
    const slots = [...document.querySelectorAll<HTMLElement>('.cell[data-slot]')]
    expect(slots).toHaveLength(COMIC_SLOTS)
    expect(new Set(slots.map((s) => s.querySelector('a.panel')?.getAttribute('data-scene')))).toHaveLength(COMIC_SLOTS)
    expect(document.querySelector('.cell.title')).not.toBeNull()
    close()
  })

  it('only flips the title to the left or the right', () => {
    expect([...LAYOUTS]).toEqual(['left', 'right'])
  })
})

describe('fillComic', () => {
  it('paints each slot from the drawn cards, including bike and stall', () => {
    const { document, close } = slotDoc()
    const cards = ['bike', 'stall', 'laugh', 'door', 'tea', 'mango', 'umbrella', 'coffee'].map((s) => demoByStem(s)!)
    fillComic(document, cards)
    const panels = [...document.querySelectorAll<HTMLElement>('a.panel')]
    expect(panels.map((p) => p.dataset.scene)).toEqual(cards.map((c) => c.stem))
    const hero = document.querySelector('[data-slot="0"]')!
    expect(hero.querySelector('img')?.getAttribute('fetchpriority')).toBe('high')
    const balloon = hero.querySelector<HTMLElement>('.balloon')!
    expect(balloon.style.getPropertyValue('--em')).toBe('3.68')
    expect(balloon.textContent).toBe('มอเตอร์ไซค์')
    expect(hero.querySelector('.rom')?.textContent).toBe('mɔɔ-dtəə-sai')
    close()
  })
})

describe('placeComic', () => {
  it('puts the tightest balloon in the largest cell', () => {
    const cards = ['door', 'tea', 'coffee', 'mango'].map((s) => demoByStem(s)!)
    expect(placeComic(cards).map((c) => c.stem)).toEqual(['coffee', 'tea', 'door', 'mango'])
  })
})

describe('mountComic', () => {
  it('paints one layout once, unique cards, title kept', () => {
    const window = new Window()
    const document = window.document as unknown as Document
    document.body.innerHTML = `<div class="comic"><div class="cell title"><h1>Learn Thai as Thais speak it.</h1></div></div>`
    const layout = pickLayout(lcg(3))
    const cards = placeComic(pickComic(DEMO, COMIC_SLOTS, lcg(3)))
    mountComic(document, cards, layout, 'top')
    const comic = document.querySelector('.comic')!
    expect(comic.getAttribute('data-layout')).toBe(layout)
    const slots = [...document.querySelectorAll<HTMLElement>('.cell[data-slot]')]
    expect(slots).toHaveLength(COMIC_SLOTS)
    expect(new Set(slots.map((s) => s.querySelector<HTMLElement>('a.panel')?.dataset.scene)).size).toBe(slots.length)
    expect(document.querySelector('.cell.title h1')?.textContent).toContain('Learn Thai')
    expect(slots.every((s) => s.querySelector('img')?.getAttribute('src')?.startsWith('/scenes/'))).toBe(true)
    window.happyDOM.close()
  })

  it('always paints eight slots, last marked to fill a short phone row', () => {
    expect(COMIC_SLOTS).toBe(8)
    const { document, close } = slotDoc()
    mountComic(document, placeComic(pickComic(DEMO, COMIC_SLOTS, lcg(1))), 'left', 'top')
    const last = document.querySelector<HTMLElement>('.cell[data-slot="7"]')
    expect(last?.hasAttribute('data-endwide')).toBe(true)
    close()
  })
})

describe('bento packing', () => {
  const css = readFileSync(join(process.cwd(), 'src/landing/landing.css'), 'utf-8')

  it('lets the comic width pick 2–5 equal columns, no named holes', () => {
    expect(css).toContain('container-name: comic;')
    expect(css).toContain('grid-auto-flow: dense;')
    expect(css).toContain('repeat(2, minmax(0, 1fr))')
    expect(css).toContain('repeat(3, minmax(0, 1fr))')
    expect(css).toContain('repeat(4, minmax(0, 1fr))')
    expect(css).toContain('repeat(5, minmax(0, 1fr))')
    expect(css).not.toContain('grid-template-areas')
  })

  it('keeps title and the largest drawing as 2×2 squares, title left or right', () => {
    expect(css).toContain('.cell.title,\n.cell[data-slot="0"] {\n  grid-column: span 2;\n  grid-row: span 2;')
    expect(css).toContain('.comic[data-layout="right"] .cell.title { grid-column: -3 / -1; }')
    expect(css).toContain('aspect-ratio: 1;')
  })

  it('keeps the title on the first phone screen, top or after one panel', () => {
    expect(css).toContain('html:not([data-comic]) .comic { visibility: hidden; }')
    expect(css).toContain('.comic[data-phone="after"] .cell[data-slot="0"] { order: 0; }')
    expect(css).toContain('.comic[data-phone="after"] .cell.title { order: 1; }')
    expect(css).toContain('.cell[data-slot="1"] { display: none; }')
  })

  it('shows two pictures below four columns, and one on a phone', () => {
    expect(css).toContain('@container comic (max-width: 915px)')
    expect(css).toContain('.cell[data-slot="2"],\n  .cell[data-slot="3"],\n  .cell[data-slot="4"],\n  .cell[data-slot="5"],\n  .cell[data-slot="6"],\n  .cell[data-slot="7"] { display: none; }')
  })
})

describe('fillClose', () => {
  it('paints one quiet drawing, with no balloon', () => {
    const window = new Window()
    const document = window.document as unknown as Document
    document.body.innerHTML = `<img class="night-art" width="980" height="980" alt="" />`
    const a = pickComic(QUIET, 1, lcg(4))[0]!
    const b = pickComic(QUIET, 1, lcg(9))[0]!
    expect(QUIET).toContain(a)
    expect(a.stem).not.toBe(b.stem)
    fillClose(document, a)
    const img = document.querySelector<HTMLImageElement>('.night-art')!
    expect(img.getAttribute('src')).toBe(`/scenes/${a.stem}-980.webp`)
    expect(img.getAttribute('alt')).toBe(a.alt)
    expect(img.dataset.scene).toBe(a.stem)
    expect(demoByStem(a.stem)).toBeUndefined()
    window.happyDOM.close()
  })
})

describe('balloonNeedsWidth', () => {
  it('is the two-line balloons and the long one-line ovals', () => {
    expect(balloonNeedsWidth(demoByStem('coffee')!)).toBe(true)
    expect(balloonNeedsWidth(demoByStem('stairs')!)).toBe(true)
    expect(balloonNeedsWidth(demoByStem('umbrella')!)).toBe(true)
    expect(balloonNeedsWidth(demoByStem('door')!)).toBe(false)
    expect(balloonNeedsWidth(demoByStem('jasmine')!)).toBe(false)
  })
})
