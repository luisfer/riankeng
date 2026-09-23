import { Window } from 'happy-dom'
import { describe, expect, it } from 'vitest'
import { COMIC_SLOTS, balloonNeedsWidth, fillComic, pickComic, placeComic } from '../src/landing/comic'
import { DEMO, demoByStem } from '../src/landing/demo'

function lcg(seed: number): () => number {
  let s = seed >>> 0
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0x100000000
  }
}

function slotDoc() {
  const window = new Window()
  const document = window.document as unknown as Document
  document.body.innerHTML = Array.from({ length: COMIC_SLOTS }, (_, i) => {
    const card = DEMO[i]!
    return `<div class="cell" data-slot="${i}">
      <a class="panel" data-scene="${card.stem}" data-entry="${card.id}">
        <img src="/scenes/${card.stem}-980.webp" alt="${card.alt}" />
        <span class="balloon" lang="th"></span>
        <span class="caption"><span class="rom"></span><span class="en"></span></span>
      </a>
    </div>`
  }).join('')
  return { document, close: () => void window.happyDOM.close() }
}

describe('pickComic', () => {
  it('draws n unique cards from the pool', () => {
    const got = pickComic(DEMO, COMIC_SLOTS, lcg(1))
    expect(got).toHaveLength(COMIC_SLOTS)
    expect(new Set(got.map((c) => c.stem)).size).toBe(COMIC_SLOTS)
    for (const card of got) expect(DEMO).toContain(card)
  })

  it('shuffles: two seeds do not lay the same day', () => {
    const a = pickComic(DEMO, COMIC_SLOTS, lcg(1)).map((c) => c.stem).join()
    const b = pickComic(DEMO, COMIC_SLOTS, lcg(2)).map((c) => c.stem).join()
    expect(a).not.toBe(b)
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
    expect(hero.hasAttribute('data-wide')).toBe(true)
    expect(document.querySelector('[data-slot="1"]')?.hasAttribute('data-wide')).toBe(false)
    const balloon = hero.querySelector<HTMLElement>('.balloon')!
    expect(balloon.style.getPropertyValue('--em')).toBe('3.68')
    expect(balloon.textContent).toBe('มอเตอร์ไซค์')
    expect(hero.querySelector('.rom')?.textContent).toBe('mɔɔ-dtəə-sai')
    close()
  })
})

describe('placeComic', () => {
  it('puts the tightest balloon in the 2×2', () => {
    const cards = ['door', 'tea', 'coffee', 'mango'].map((s) => demoByStem(s)!)
    expect(placeComic(cards).map((c) => c.stem)).toEqual(['coffee', 'tea', 'door', 'mango'])
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
