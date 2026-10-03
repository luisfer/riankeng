/**
 * The marks a link carries: our own short tag (?ref=x), the five utm_ tags that ad platforms and
 * link builders add, the site the visit came from, and the page it arrived on. The browser reads
 * them, the server checks them again before anything is stored. Never a name or an address.
 */

export const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'] as const
export type UtmKey = (typeof UTM_KEYS)[number]

export type Touch = { ref: string | null } & Record<UtmKey, string | null> & {
    /** The host of the page that linked here, www. dropped. */
    referrer: string | null
    /** The path the visit arrived on, such as / or /preview/. */
    landing: string | null
  }

export const NO_TOUCH: Touch = {
  ref: null,
  utm_source: null,
  utm_medium: null,
  utm_campaign: null,
  utm_content: null,
  utm_term: null,
  referrer: null,
  landing: null,
}

/** The short tag on the link a visit came from, ?ref=x. Anything else is dropped. */
export function normalizeSource(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const source = raw.trim().toLowerCase()
  return /^[a-z0-9_-]{1,32}$/.test(source) ? source : null
}

/** A utm_ value, lowercased, spaces as hyphens. Anything with other marks is dropped, not cleaned. */
export function normalizeUtm(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const value = raw.trim().toLowerCase().replace(/\s+/g, '-')
  return /^[a-z0-9._+-]{1,64}$/.test(value) ? value : null
}

/** A host name, from a full referrer URL or a bare host. An app's referrer (android-app://…) keeps its id. */
export function normalizeHost(raw: unknown): string | null {
  if (typeof raw !== 'string' || !raw.trim()) return null
  let host = raw.trim().toLowerCase()
  if (host.includes('://')) {
    try {
      host = new URL(host).hostname
    } catch {
      return null
    }
  }
  host = host.replace(/^www\./, '')
  return /^[a-z0-9.-]{1,128}$/.test(host) && host.includes('.') ? host : null
}

/** A path on this site. Query and fragment are left out; they are not the page. */
export function normalizePath(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const path = raw.split(/[?#]/)[0]!.toLowerCase()
  return /^\/[a-z0-9/._-]{0,63}$/.test(path) ? path : null
}

/** True when the link itself named where it was posted. A referrer alone is a weaker mark. */
export function hasMarks(touch: Touch): boolean {
  return Boolean(touch.ref || UTM_KEYS.some((k) => touch[k]))
}

/**
 * What this arrival carries. A referrer from this site is no referrer: moving from the preview to
 * the waitlist is the same visit.
 */
export function readTouch(search: string, referrer: string, ownHost: string, path: string): Touch {
  const params = new URLSearchParams(search)
  const from = normalizeHost(referrer)
  const own = normalizeHost(ownHost)
  const touch: Touch = {
    ...NO_TOUCH,
    ref: normalizeSource(params.get('ref')),
    referrer: from && from !== own ? from : null,
    landing: normalizePath(path),
  }
  for (const key of UTM_KEYS) touch[key] = normalizeUtm(params.get(key))
  return touch
}

/** A touch posted by a browser, checked field by field. Unknown fields are ignored. */
export function cleanTouch(raw: unknown): Touch {
  const v = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const touch: Touch = {
    ...NO_TOUCH,
    ref: normalizeSource(v.ref),
    referrer: normalizeHost(v.referrer),
    landing: normalizePath(v.landing),
  }
  for (const key of UTM_KEYS) touch[key] = normalizeUtm(v[key])
  return touch
}

/** The one short tag the waitlist keeps in its source column: our own tag, else the utm source if it fits. */
export function touchSource(touch: Touch): string | null {
  return touch.ref ?? normalizeSource(touch.utm_source)
}

/** The link's own marks as query parameters, to carry them across this site's pages without storage. */
export function touchParams(touch: Touch): URLSearchParams {
  const params = new URLSearchParams()
  if (touch.ref) params.set('ref', touch.ref)
  for (const key of UTM_KEYS) {
    const value = touch[key]
    if (value) params.set(key, value)
  }
  return params
}
