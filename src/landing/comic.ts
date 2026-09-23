/**
 * The landing comic: a square bento, title left or right, then a shuffle of
 * drawings. Slot 0 is the largest panel when the grid has a 2×2 for it. The
 * page paints once. Column count is CSS, from the comic's own width.
 */
import { type DemoCard, sceneSrc, sceneSrcSet } from './demo'

export const LAYOUTS = ['left', 'right'] as const
export type ComicLayout = (typeof LAYOUTS)[number]

export const PHONES = ['top', 'after'] as const
export type PhoneTitle = (typeof PHONES)[number]
export const COMIC_SLOTS = 8

const HERO_SIZES = '(max-width: 599px) calc(100vw - 40px), (max-width: 899px) calc(66vw - 40px), (max-width: 1199px) calc(25vw - 20px), calc((100vw - 112px) * 0.4 + 12px)'
const PIC_SIZES = '(max-width: 599px) calc(50vw - 25px), (max-width: 899px) calc(33vw - 28px), (max-width: 1199px) calc(25vw - 20px), calc((100vw - 112px) / 5)'

const SMALLS = ['1', '2', '3', '4', '5', '6', '7'] as const

export function pickLayout(rand: () => number = Math.random): ComicLayout {
  return LAYOUTS[Math.floor(rand() * LAYOUTS.length)]!
}

export function pickPhone(rand: () => number = Math.random): PhoneTitle {
  return PHONES[Math.floor(rand() * PHONES.length)]!
}

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

/** Slot 0 is the largest panel. Give it the hardest lettering so the type stays readable. */
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
 * or the lettering drops below a readable size. Used only as a last resort.
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

function inkOrder(layout: ComicLayout, phone: PhoneTitle): readonly string[] {
  if (phone === 'after' || layout === 'right') return ['0', 'title', ...SMALLS]
  return ['title', '0', ...SMALLS]
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

function makeSlot(card: DemoCard, i: number, hero: boolean): HTMLElement {
  const cell = document.createElement('div')
  cell.className = 'cell'
  cell.dataset.slot = String(i)

  const panel = document.createElement('a')
  panel.className = 'panel'
  panel.href = '#try'

  const img = document.createElement('img')
  img.width = 980
  img.height = 980

  const balloon = document.createElement('span')
  balloon.className = 'balloon'
  balloon.lang = 'th'

  const caption = document.createElement('span')
  caption.className = 'caption'
  const rom = document.createElement('span')
  rom.className = 'rom'
  rom.lang = 'th-Latn'
  const en = document.createElement('span')
  en.className = 'en'
  caption.append(rom, en)

  panel.append(img, balloon, caption)
  cell.append(panel)
  paintPanel(cell, card, hero)
  return cell
}

/** One quiet drawing for the close. Night is in the pool, not a fixed close. */
export function fillClose(root: ParentNode, scene: { stem: string; alt: string }): void {
  const img = root.querySelector<HTMLImageElement>('.night-art')
  if (!img) return
  img.src = sceneSrc(scene.stem)
  img.srcset = sceneSrcSet(scene.stem)
  img.alt = scene.alt
  img.dataset.scene = scene.stem
}

/** Replace any fallback slots, paint the picked day, then the page may reveal. */
export function mountComic(
  root: ParentNode,
  cards: readonly DemoCard[],
  layout: ComicLayout,
  phone: PhoneTitle,
): void {
  const comic = root.querySelector<HTMLElement>('.comic')
  const title = comic?.querySelector<HTMLElement>('.cell.title')
  if (!comic || !title) return

  comic.dataset.layout = layout
  comic.dataset.phone = phone
  for (const cell of [...comic.querySelectorAll('.cell[data-slot]')]) cell.remove()

  cards.slice(0, COMIC_SLOTS).forEach((card, i) => {
    const cell = makeSlot(card, i, i === 0)
    if (i === COMIC_SLOTS - 1) cell.dataset.endwide = ''
    comic.append(cell)
  })

  const order = inkOrder(layout, phone)
  title.style.setProperty('--i', String(Math.max(0, order.indexOf('title'))))
  for (const cell of comic.querySelectorAll<HTMLElement>('.cell[data-slot]')) {
    const i = cell.dataset.slot ?? ''
    cell.style.setProperty('--i', String(Math.max(0, order.indexOf(i))))
  }
}
