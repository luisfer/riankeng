/**
 * Permission to keep counting state in this browser: a random number for the browser, and the link
 * that first brought it. Without permission nothing is kept, and each visit is counted on its own.
 * The same rule holds in every country. The choice itself is kept, so the question is not asked on
 * every page.
 */

export const CONSENT_KEY = 'rk-consent'
/** Fired on window when the choice changes. detail is true for yes. */
export const CONSENT_EVENT = 'riankeng:consent'

/** Everything kept only with permission, including the keys earlier versions wrote. */
const LOCAL_KEYS = ['rk-device', 'rk-touch-first', 'rk-ref-first']
const SESSION_KEYS = ['rk-touch', 'rk-ref']

/** A yes holds for about 13 months, a no for about 6. Then the question comes back once. */
const YES_DAYS = 395
const NO_DAYS = 183
const DAY = 86_400_000

export type Consent = 'yes' | 'no' | 'unset'

function globalPrivacyControl(): boolean {
  if (typeof navigator === 'undefined') return false
  return (navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true
}

/** Can this browser keep anything at all? In some private modes it cannot, and then nothing is asked. */
export function storageWorks(): boolean {
  try {
    const probe = 'rk-probe'
    localStorage.setItem(probe, '1')
    localStorage.removeItem(probe)
    return true
  } catch {
    return false
  }
}

export function readConsent(now: number = Date.now()): Consent {
  try {
    const raw = localStorage.getItem(CONSENT_KEY)
    if (raw) {
      const v = JSON.parse(raw) as { v?: unknown; yes?: unknown; at?: unknown }
      if (v.v === 1 && typeof v.yes === 'boolean' && typeof v.at === 'number') {
        const age = (now - v.at) / DAY
        if (age >= 0 && age <= (v.yes ? YES_DAYS : NO_DAYS)) return v.yes ? 'yes' : 'no'
      }
    }
  } catch {
    /* storage off: nothing was kept, and nothing will be */
  }
  // Global Privacy Control is a standing no. The question is not put to that browser.
  return globalPrivacyControl() ? 'no' : 'unset'
}

/** True only after a yes that still holds. */
export function counting(now?: number): boolean {
  return readConsent(now) === 'yes'
}

/** Clear everything kept for counting. The choice itself stays. */
export function forgetCounting(): void {
  for (const key of LOCAL_KEYS) {
    try {
      localStorage.removeItem(key)
    } catch {
      /* storage off */
    }
  }
  for (const key of SESSION_KEYS) {
    try {
      sessionStorage.removeItem(key)
    } catch {
      /* storage off */
    }
  }
}

export function saveConsent(yes: boolean, now: number = Date.now()): void {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify({ v: 1, yes, at: now }))
  } catch {
    /* storage off: the choice cannot be kept, so neither can anything else */
  }
  if (!yes) forgetCounting()
  if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent(CONSENT_EVENT, { detail: yes }))
}
