/**
 * The landing comic: eight slots, thirty-eight drawings. A load picks a shuffle.
 * Slot 0 is the 2×2 next to the title; the rest are the small cells.
 */
import { type DemoCard, sceneSrc, sceneSrcSet } from './demo'

export const COMIC_SLOTS = 8

const HERO_SIZES = '(max-width: 599px) calc(100vw - 40px), (max-width: 1199px) calc(25vw - 20px), 476px'
const PIC_SIZES = '(max-width: 599px) calc(50vw - 25px), (max-width: 1199px) calc(25vw - 20px), 232px'

/** Fisher–Yates, first n. rand is Math.random unless a test passes a seed. */
export function pickComic<T>(pool: readonly T[], n: number, rand: () => number = Math.random): T[] {
  const bag = pool.slice()
  for (let i = bag.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[bag[i], bag[j]] = [bag[j]!, bag[i]!]
  }
  return bag.slice(0, n)
}

/** How hard a phrase is to letter: wide line, or two lines in a short oval. */
export function tightness(card: DemoCard): number {
  return card.balloon.em * card.balloon.lines.length
}

/** Slot 0 is the 2×2. Give it the hardest lettering so the type stays readable. */
export function placeComic(cards: readonly DemoCard[]): DemoCard[] {
  const out = cards.slice()
  let at = 0
  for (let i = 1; i < out.length; i++) {
    if (tightness(out[i]!) > tightness(out[at]!)) at = i
  }
  if (at !== 0) {
    const hero = out[at]!
    out[at] = out[0]!
    out[0] = hero
  }
  return out
}

/**
 * A long line or two lines in a short oval need a full-width cell on a phone,
 * or the lettering drops below a readable size.
 */
export function balloonNeedsWidth(card: DemoCard): boolean {
  return card.balloon.lines.length > 1 || card.balloon.em >= 4.8
}

export function fillComic(root: ParentNode, cards: readonly DemoCard[]): void {
  const slots = [...root.querySelectorAll<HTMLElement>('.cell[data-slot]')]
  cards.forEach((card, i) => {
    const cell = slots[i]
    if (cell) paintPanel(cell, card, i === 0)
  })
}

function paintPanel(cell: HTMLElement, card: DemoCard, hero: boolean): void {
  const panel = cell.querySelector<HTMLAnchorElement>('a.panel')
  const img = panel?.querySelector('img')
  const balloon = panel?.querySelector<HTMLElement>('.balloon')
  const rom = panel?.querySelector('.rom')
  const en = panel?.querySelector('.en')
  if (!panel || !img || !balloon || !rom || !en) return

  panel.dataset.scene = card.stem
  panel.dataset.entry = card.id
  img.src = sceneSrc(card.stem)
  img.srcset = sceneSrcSet(card.stem)
  img.sizes = hero ? HERO_SIZES : PIC_SIZES
  img.alt = card.alt
  if (hero) img.setAttribute('fetchpriority', 'high')
  else img.removeAttribute('fetchpriority')

  balloon.style.setProperty('--em', String(card.balloon.em))
  balloon.style.setProperty('--lines', String(card.balloon.lines.length))
  balloon.replaceChildren(
    ...card.balloon.lines.flatMap((line, i) =>
      i === 0 ? [document.createTextNode(line)] : [document.createElement('br'), document.createTextNode(line)],
    ),
  )
  rom.textContent = card.rom
  en.textContent = card.en

  if (balloonNeedsWidth(card)) cell.dataset.wide = ''
  else delete cell.dataset.wide
}
