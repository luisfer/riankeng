import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanTyped, eventRow, handleEvent } from '../src/event-log'
import { DEMO_IDS } from '../src/landing/demo'
import { PREVIEW_IDS } from '../src/preview/catalog'

const NOW = Date.parse('2026-10-07T13:00:00Z')
const VISIT = '0b6f2f0e-5d9c-4c3a-9a51-2a8f0c1d7e44'
const DEVICE = '9d1c4b2a-7e3f-4a6b-8c5d-1e2f3a4b5c6d'
const env = { url: 'https://example.supabase.co', key: 'service-role' }

function body(extra: Record<string, unknown> = {}) {
  return { name: 'check', page: 'landing', visit: VISIT, day: '2026-10-07', card: DEMO_IDS[0], detail: 'tone', typed: 'chaa yén', ...extra }
}

/** happy-dom's Request drops Sec-Fetch-Site, as a browser page must. On the server it arrives. */
function request(payload: unknown, headers: Record<string, string> = { 'content-type': 'application/json', 'sec-fetch-site': 'same-origin' }) {
  const all = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
  const text = typeof payload === 'string' ? payload : JSON.stringify(payload)
  return { url: 'http://local/api/event', headers: { get: (k: string) => all.get(k.toLowerCase()) ?? null }, text: async () => text } as unknown as Request
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe('an event row', () => {
  it('keeps a missed check with what was typed, checked against the public cards', () => {
    const row = eventRow(body(), NOW)!
    expect(row).toMatchObject({ name: 'check', page: 'landing', visit: VISIT, device: null, day: '2026-10-07', card: DEMO_IDS[0], detail: 'tone', typed: 'chaa yén' })
    expect(eventRow(body({ page: 'preview', card: PREVIEW_IDS[0] }), NOW)?.card).toBe(PREVIEW_IDS[0])
    // Not a public card: the field is dropped, the event kept.
    expect(eventRow(body({ card: 'w:something else' }), NOW)?.card).toBeNull()
  })

  it('keeps the typed text only for a miss, and only when it is romanization', () => {
    expect(eventRow(body({ detail: 'exact' }), NOW)?.typed).toBeNull()
    expect(eventRow(body({ detail: 'empty' }), NOW)?.typed).toBeNull()
    expect(eventRow(body({ name: 'hear', detail: 'slow' }), NOW)?.typed).toBeNull()
    expect(cleanTyped('ada@example.com')).toBeNull()
    expect(cleanTyped('call 0812345678')).toBeNull()
    expect(cleanTyped('x'.repeat(61))).toBeNull()
    expect(cleanTyped('  kɔ̌ɔ   gaa-fεε  ')).toBe('kɔ̌ɔ gaa-fεε')
    // Stored composed, however it was typed.
    expect(cleanTyped('yák')).toBe('yák')
  })

  it('refuses anything that is not one of ours', () => {
    expect(eventRow(body({ name: 'purchase' }), NOW)).toBeNull()
    expect(eventRow(body({ page: 'admin' }), NOW)).toBeNull()
    expect(eventRow(body({ visit: 'not-a-uuid' }), NOW)).toBeNull()
    expect(eventRow(body({ day: '2026-09-01' }), NOW)).toBeNull()
    expect(eventRow(body({ day: '7 Oct' }), NOW)).toBeNull()
    expect(eventRow(null, NOW)).toBeNull()
  })

  it("takes the visitor's own day a day either side of the server's", () => {
    expect(eventRow(body({ day: '2026-10-06' }), NOW)?.day).toBe('2026-10-06')
    expect(eventRow(body({ day: '2026-10-08' }), NOW)?.day).toBe('2026-10-08')
  })

  it('keeps the browser number only in its own shape, and the marks only after their checks', () => {
    const row = eventRow(
      body({ device: DEVICE, ref: 'RD-LearnThai', utm_source: 'Reddit', utm_term: '<script>', referrer: 'https://www.reddit.com/r/learnthai', landing: '/preview/', detail: 'Not A Verdict' }),
      NOW,
    )!
    expect(row.device).toBe(DEVICE)
    expect(row.ref).toBe('rd-learnthai')
    expect(row.utm_source).toBe('reddit')
    expect(row.utm_term).toBeNull()
    expect(row.referrer).toBe('reddit.com')
    expect(row.landing).toBe('/preview/')
    expect(row.detail).toBeNull()
    expect(eventRow(body({ device: 'abc' }), NOW)?.device).toBeNull()
  })
})

describe('the event endpoint', () => {
  it('stores one row with the service role and answers 204', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(null, { status: 201 }))
    const res = await handleEvent(request(body()), env, fetchMock, NOW)
    expect(res.status).toBe(204)
    const [url, init] = fetchMock.mock.calls[0]!
    expect(String(url)).toBe('https://example.supabase.co/rest/v1/events')
    expect((init?.headers as Record<string, string>).apikey).toBe('service-role')
    expect(JSON.parse(String(init?.body))).toMatchObject({ name: 'check', typed: 'chaa yén' })
  })

  it('refuses other sites, other bodies and oversized posts before touching the table', async () => {
    const fetchMock = vi.fn<typeof fetch>()
    expect((await handleEvent(request(body(), { 'content-type': 'text/plain' }), env, fetchMock, NOW)).status).toBe(415)
    expect((await handleEvent(request(body(), { 'content-type': 'application/json', 'sec-fetch-site': 'cross-site' }), env, fetchMock, NOW)).status).toBe(403)
    expect((await handleEvent(request('{not json'), env, fetchMock, NOW)).status).toBe(400)
    expect((await handleEvent(request(body({ name: 'purchase' })), env, fetchMock, NOW)).status).toBe(400)
    expect((await handleEvent(request(JSON.stringify(body({ pad: 'x'.repeat(5000) }))), env, fetchMock, NOW)).status).toBe(413)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('says in the log why a row was not stored, never what it held', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const refused = vi.fn<typeof fetch>(async () => new Response(JSON.stringify({ code: 'PGRST204' }), { status: 400 }))
    expect((await handleEvent(request(body()), env, refused, NOW)).status).toBe(502)
    expect((await handleEvent(request(body()), {}, refused, NOW)).status).toBe(503)
    for (const call of errors.mock.calls) expect(call.join(' ')).not.toContain('chaa')
    expect(errors.mock.calls.flat()).toContain('PGRST204')
  })
})
