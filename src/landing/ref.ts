import { NO_TOUCH, cleanTouch, hasMarks, readTouch, touchParams, touchSource, type Touch } from '../attribution'
import { counting, forgetCounting } from '../consent'

/** The marks this tab arrived with most recently. Kept only with permission. */
const TAB_KEY = 'rk-touch'
/** The first marks this browser arrived with, and when. Kept only with permission. */
const FIRST_KEY = 'rk-touch-first'
const FIRST_DAYS = 30
const DAY = 86_400_000

/** This page load's own arrival. In memory only, so it needs no permission and ends with the page. */
let arrival: Touch = NO_TOUCH

function carries(touch: Touch | null): touch is Touch {
  return Boolean(touch && (hasMarks(touch) || touch.referrer))
}

function here(): { referrer: string; host: string; path: string } {
  if (typeof location === 'undefined') return { referrer: '', host: '', path: '/' }
  return { referrer: typeof document === 'undefined' ? '' : document.referrer, host: location.host, path: location.pathname }
}

/** A page load starts clean. Tests call this between cases. */
export function resetVisit(): void {
  arrival = NO_TOUCH
}

/**
 * Read the link this visit came from (riangeng.com/?ref=x, or utm_ tags, or the site that linked
 * here). With permission it is kept for the tab, so it survives a trip through the preview, and as
 * the first marks this browser saw, for 30 days, so it survives a new tab too. Without permission it
 * stays in this page's memory, and the keys earlier versions wrote are cleared.
 */
export function rememberRef(search: string = location.search, now: number = Date.now(), from = here()): void {
  const touch = readTouch(search, from.referrer, from.host, from.path)
  if (carries(touch) || !carries(arrival)) arrival = touch
  if (!counting(now)) {
    forgetCounting()
    return
  }
  if (!carries(arrival)) return
  try {
    sessionStorage.setItem(TAB_KEY, JSON.stringify(arrival))
  } catch {
    /* private mode: the marks are lost, the address is not */
  }
  try {
    if (!firstTouch(now)) localStorage.setItem(FIRST_KEY, JSON.stringify({ touch: arrival, at: now }))
  } catch {
    /* as above */
  }
}

function tabTouch(): Touch | null {
  try {
    const raw = sessionStorage.getItem(TAB_KEY)
    const touch = raw ? cleanTouch(JSON.parse(raw)) : null
    return carries(touch) ? touch : null
  } catch {
    return null
  }
}

function firstTouch(now: number): Touch | null {
  try {
    const raw = localStorage.getItem(FIRST_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as { touch?: unknown; at?: unknown }
    if (typeof v.at !== 'number' || now - v.at > FIRST_DAYS * DAY) return null
    const touch = cleanTouch(v.touch)
    return carries(touch) ? touch : null
  } catch {
    return null
  }
}

/** This visit's own marks, else this tab's, else the first ones this browser arrived with. */
export function currentTouch(search: string = location.search, now: number = Date.now()): Touch {
  const link = readTouch(search, '', '', arrival.landing ?? '')
  if (hasMarks(link)) return { ...link, referrer: arrival.referrer, landing: arrival.landing }
  if (carries(arrival)) return arrival
  if (counting(now)) {
    const kept = tabTouch() ?? firstTouch(now)
    if (kept) return kept
  }
  return arrival
}

/** The one short tag for the waitlist's source column: ?ref=, else a utm_source that fits. */
export function currentRef(search: string = location.search, now: number = Date.now()): string | null {
  return touchSource(currentTouch(search, now))
}

/**
 * A link to another page of this site, with this visit's marks on it. Without permission nothing
 * carries them across a page, so the address does. With permission the tab already holds them.
 */
export function withTouch(href: string, now: number = Date.now()): string {
  if (counting(now)) return href
  const params = touchParams(currentTouch(location.search, now))
  if (![...params.keys()].length) return href
  const url = new URL(href, location.origin)
  for (const [key, value] of params) if (!url.searchParams.has(key)) url.searchParams.set(key, value)
  return `${url.pathname}${url.search}${url.hash}`
}
