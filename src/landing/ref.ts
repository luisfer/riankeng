import { normalizeSource } from '../waitlist-join'

const KEY = 'rk-ref'

/**
 * The tag on the link a visit came from (riangeng.com/?ref=x), kept for this tab so it
 * survives a trip through the preview and back to the waitlist. Storage may be off.
 */
export function rememberRef(search: string = location.search): void {
  const ref = normalizeSource(new URLSearchParams(search).get('ref'))
  if (!ref) return
  try {
    sessionStorage.setItem(KEY, ref)
  } catch {
    /* private mode: the tag is lost, the address is not */
  }
}

export function currentRef(search: string = location.search): string | null {
  const here = normalizeSource(new URLSearchParams(search).get('ref'))
  if (here) return here
  try {
    return normalizeSource(sessionStorage.getItem(KEY))
  } catch {
    return null
  }
}
