import { normalizeSource } from '../waitlist-join'

const KEY = 'rk-ref'
/** The first tag a browser arrived with, and when, so a later visit from a new tab still counts. */
const FIRST_KEY = 'rk-ref-first'
const FIRST_DAYS = 30

/**
 * The tag on the link a visit came from (riangeng.com/?ref=x), kept for this tab so it survives a
 * trip through the preview and back to the waitlist, and kept for 30 days as the first tag this
 * browser saw, so it survives a new tab or a hop out of LINE's browser too. Storage may be off.
 */
export function rememberRef(search: string = location.search, now: number = Date.now()): void {
  const ref = normalizeSource(new URLSearchParams(search).get('ref'))
  if (!ref) return
  try {
    sessionStorage.setItem(KEY, ref)
  } catch {
    /* private mode: the tag is lost, the address is not */
  }
  try {
    if (!firstRef(now)) localStorage.setItem(FIRST_KEY, JSON.stringify({ ref, at: now }))
  } catch {
    /* as above */
  }
}

function firstRef(now: number): string | null {
  try {
    const raw = localStorage.getItem(FIRST_KEY)
    if (!raw) return null
    const v = JSON.parse(raw) as { ref?: unknown; at?: unknown }
    if (typeof v.at !== 'number' || now - v.at > FIRST_DAYS * 86_400_000) return null
    return normalizeSource(v.ref)
  } catch {
    return null
  }
}

/** This visit's own tag, else this tab's, else the first one this browser arrived with. */
export function currentRef(search: string = location.search, now: number = Date.now()): string | null {
  const here = normalizeSource(new URLSearchParams(search).get('ref'))
  if (here) return here
  try {
    const tab = normalizeSource(sessionStorage.getItem(KEY))
    if (tab) return tab
  } catch {
    /* fall through to the first tag */
  }
  return firstRef(now)
}
