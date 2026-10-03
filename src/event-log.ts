/** One thing a visitor did on the demo card or the preview, counted. The service role stays on the server. */

import { cleanTouch, type Touch } from './attribution.js'
import { DEMO_IDS } from './landing/demo.js'
import { PREVIEW_IDS } from './preview/catalog.js'
import { refusal } from './waitlist-join.js'

export type EventEnv = {
  url?: string
  key?: string
}

/** The same lists as src/landing/events.ts and the table's checks. Anything else is refused. */
const NAMES = new Set(['view', 'check', 'hear', 'cta', 'join', 'done', 'consent', 'price_click', 'error'])
const PAGES = new Set(['landing', 'preview', 'course'])
/** Only the public cards. A card id is a romanization, so this also keeps free text out of the column. */
const CARDS = new Set([...DEMO_IDS, ...PREVIEW_IDS])
/** A check's verdict whose typed text is worth keeping. An exact answer is the card itself; empty is nothing. */
const MISSES = new Set(['tone', 'length', 'wrong', 'invalid'])

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
const DETAIL = /^[a-z0-9_.-]{1,24}$/
const DAY_SHAPE = /^\d{4}-\d{2}-\d{2}$/
/** Romanization only: Latin letters, the four extra vowels, tone marks, space, hyphen, apostrophe. No digit, no @. */
const TYPED = /^[A-Za-zεɛɔəʉ̀-ͯ' -]{1,60}$/u

export type EventRow = {
  name: string
  page: string
  visit: string
  device: string | null
  day: string
  card: string | null
  detail: string | null
  typed: string | null
} & Touch

/** What was typed on a missed card, if it is romanization and nothing else. Stored composed. */
export function cleanTyped(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const text = raw.normalize('NFD').trim().replace(/\s+/g, ' ')
  return TYPED.test(text) ? text.normalize('NFC') : null
}

/** The visitor's own date, which may run a day ahead of or behind the server's. Nothing older or later. */
function cleanDay(raw: unknown, now: number): string | null {
  if (typeof raw !== 'string' || !DAY_SHAPE.test(raw)) return null
  const noon = Date.parse(`${raw}T12:00:00Z`)
  if (Number.isNaN(noon) || Math.abs(noon - now) > 2 * 86_400_000) return null
  return raw
}

/** A posted event, checked field by field, or null when it is not one of ours. */
export function eventRow(body: unknown, now: number = Date.now()): EventRow | null {
  if (!body || typeof body !== 'object') return null
  const v = body as Record<string, unknown>
  if (typeof v.name !== 'string' || !NAMES.has(v.name)) return null
  if (typeof v.page !== 'string' || !PAGES.has(v.page)) return null
  if (typeof v.visit !== 'string' || !UUID.test(v.visit)) return null
  const day = cleanDay(v.day, now)
  if (!day) return null
  const detail = typeof v.detail === 'string' && DETAIL.test(v.detail) ? v.detail : null
  return {
    name: v.name,
    page: v.page,
    visit: v.visit,
    device: typeof v.device === 'string' && UUID.test(v.device) ? v.device : null,
    day,
    card: typeof v.card === 'string' && CARDS.has(v.card) ? v.card : null,
    detail,
    typed: v.name === 'check' && detail && MISSES.has(detail) ? cleanTyped(v.typed) : null,
    ...cleanTouch(v),
  }
}

async function errorCode(res: Response): Promise<string | undefined> {
  const body = (await res.clone().json().catch(() => null)) as { code?: unknown } | null
  return typeof body?.code === 'string' ? body.code : undefined
}

/** POST /api/event. 204 when counted. The page never waits on it, so failures only reach the log. */
export async function handleEvent(
  request: Request,
  env: EventEnv,
  fetchImpl: typeof fetch = fetch,
  now: number = Date.now(),
): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store' }
  const refused = refusal(request)
  if (refused) return Response.json({ ok: false, error: refused.error }, { status: refused.status, headers })
  const text = await request.text().catch(() => '')
  if (text.length > 4096) return Response.json({ ok: false, error: 'size' }, { status: 413, headers })
  let body: unknown = null
  try {
    body = JSON.parse(text)
  } catch {
    body = null
  }
  const row = eventRow(body, now)
  if (!row) return Response.json({ ok: false, error: 'event' }, { status: 400, headers })

  const url = env.url?.trim().replace(/\/$/, '')
  const key = env.key?.trim()
  if (!url || !key) {
    console.error('event: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set')
    return new Response(null, { status: 503, headers })
  }
  try {
    const res = await fetchImpl(`${url}/rest/v1/events`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(row),
    })
    if (res.ok) return new Response(null, { status: 204, headers })
    console.error('event: the insert was refused', res.status, ...[await errorCode(res)].filter(Boolean))
    return new Response(null, { status: 502, headers })
  } catch (err) {
    console.error(`event: the insert did not reach Supabase (${err instanceof Error ? err.name : 'error'})`)
    return new Response(null, { status: 502, headers })
  }
}
