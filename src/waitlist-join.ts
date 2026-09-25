/** One address on the waitlist. The service role stays on the server. */

export type WaitlistEnv = {
  url?: string
  key?: string
}

/**
 * One @, no space or control character or list punctuation, and a domain of dotted labels
 * that ends in a real top level (letters, or punycode such as .xn--o3cw4h for .ไทย).
 * A phone's comma for a dot, or a missing .com, is caught here and not thanked.
 */
const EMAIL = /^[^\s\x00-\x1f\x7f@,;<>()[\]\\"]+@[a-z0-9-]+(\.[a-z0-9-]+)*\.(?:[a-z]{2,}|xn--[a-z0-9-]+)$/

export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase()
  if (email.length > 254 || !EMAIL.test(email)) return null
  return email
}

/** The short tag on the link a visit came from, ?ref=x. Anything else is dropped. */
export function normalizeSource(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const source = raw.trim().toLowerCase()
  return /^[a-z0-9_-]{1,32}$/.test(source) ? source : null
}

/** Saved, including an address that was already on the list. */
export async function insertWaitlistEmail(
  email: string,
  env: WaitlistEnv,
  fetchImpl: typeof fetch = fetch,
  source: string | null = null,
): Promise<'saved' | 'save'> {
  const url = env.url?.replace(/\/$/, '')
  const key = env.key
  if (!url || !key) return 'save'
  const post = (row: Record<string, string>) =>
    fetchImpl(`${url}/rest/v1/waitlist`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify(row),
    })
  try {
    let res = await post(source ? { email, source } : { email })
    // A table without the source column yet refuses the row. The address matters more than the tag.
    if (res.status === 400 && source) res = await post({ email })
    if (res.ok || res.status === 409) return 'saved'
    return 'save'
  } catch {
    return 'save'
  }
}

type WaitlistBody = { email?: unknown; website?: unknown; source?: unknown }

/** POST /api/waitlist. A filled honeypot looks saved and is not stored. */
export async function handleWaitlist(
  request: Request,
  env: WaitlistEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store' }
  let body: WaitlistBody = {}
  try {
    body = (await request.json()) as WaitlistBody
  } catch {
    body = {}
  }
  const website = typeof body.website === 'string' ? body.website.trim() : ''
  if (website) return Response.json({ ok: true }, { headers })
  const email = normalizeEmail(typeof body.email === 'string' ? body.email : '')
  if (!email) return Response.json({ ok: false, error: 'email' }, { status: 400, headers })
  const saved = await insertWaitlistEmail(email, env, fetchImpl, normalizeSource(body.source))
  if (saved !== 'saved') return Response.json({ ok: false, error: 'save' }, { status: 502, headers })
  return Response.json({ ok: true }, { headers })
}
