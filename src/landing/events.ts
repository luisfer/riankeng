import { counting } from '../consent'
import { currentTouch } from './ref'

/** What a visitor did. The server keeps the same list (src/event-log.ts). */
export type EventName = 'view' | 'check' | 'hear' | 'cta' | 'join' | 'done' | 'consent' | 'price_click' | 'error'
export type EventPage = 'landing' | 'preview' | 'course'
export type EventFields = { card?: string; detail?: string; typed?: string }
export type Track = (name: EventName, fields?: EventFields) => void

const DEVICE_KEY = 'rk-device'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

function uuid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6]! & 0x0f) | 0x40
  b[8] = (b[8]! & 0x3f) | 0x80
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

/** One page load. Never stored, so it needs no permission: it ties a visit's checks together, no more. */
const VISIT = uuid()
let page: EventPage = 'landing'

export function setEventPage(next: EventPage): void {
  page = next
}

/** The browser's random number, only with permission. It joins a visit to the same browser's later ones. */
function device(): string | null {
  if (!counting()) return null
  try {
    let id = localStorage.getItem(DEVICE_KEY)
    if (!id || !UUID.test(id)) {
      id = uuid()
      localStorage.setItem(DEVICE_KEY, id)
    }
    return id
  } catch {
    return null
  }
}

/** The visitor's own calendar day, so a return the next morning is a new day wherever they are. */
function localDay(now: Date = new Date()): string {
  const m = String(now.getMonth() + 1).padStart(2, '0')
  const d = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${m}-${d}`
}

/** Count one thing on /api/event. Never throws, never waits, never sends an address. */
export const track: Track = (name, fields = {}) => {
  try {
    const body = JSON.stringify({ name, page, visit: VISIT, device: device(), day: localDay(), ...fields, ...currentTouch() })
    void fetch('/api/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
    }).catch(() => undefined)
  } catch {
    /* counting is never worth a broken page */
  }
}
