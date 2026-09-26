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

/** Why a save failed, for the function log. Never the address. */
function logFailure(reason: string, status?: number, code?: string): void {
  console.error(`waitlist: ${reason}`, ...(status === undefined ? [] : [status]), ...(code ? [code] : []))
}

async function errorCode(res: Response): Promise<string | undefined> {
  const body = (await res.clone().json().catch(() => null)) as { code?: unknown } | null
  return typeof body?.code === 'string' ? body.code : undefined
}

/** Saved, including an address that was already on the list. */
export async function insertWaitlistEmail(
  email: string,
  env: WaitlistEnv,
  fetchImpl: typeof fetch = fetch,
  source: string | null = null,
): Promise<'saved' | 'save'> {
  const url = env.url?.trim().replace(/\/$/, '')
  const key = env.key?.trim()
  if (!url || !key) {
    logFailure('SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is not set')
    return 'save'
  }
  // on_conflict names the unique email index, so a second sign-up with the same address is a quiet no-op.
  const post = (row: Record<string, string>) =>
    fetchImpl(`${url}/rest/v1/waitlist?on_conflict=email`, {
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
    // A table without the source column refuses the row with PGRST204. The address matters more than the tag.
    if (res.status === 400 && source && (await errorCode(res)) === 'PGRST204') {
      logFailure('the source column is missing, saved without the tag', res.status, 'PGRST204')
      res = await post({ email })
    }
    if (res.ok || res.status === 409) return 'saved'
    logFailure('the insert was refused', res.status, await errorCode(res))
    return 'save'
  } catch (err) {
    logFailure(`the insert did not reach Supabase (${err instanceof Error ? err.name : 'error'})`)
    return 'save'
  }
}

/**
 * Only this site's own form may post. A page elsewhere could send text/plain with no-cors, which
 * skips the CORS check, and fill the list from its visitors' addresses. Browsers name the sender:
 * Sec-Fetch-Site, or at least Origin. A client with neither is left to the rate limit.
 */
export function refusal(request: Request): { status: 403 | 415; error: string } | null {
  const type = request.headers.get('content-type') ?? ''
  if (!/^application\/json\b/i.test(type)) return { status: 415, error: 'type' }
  const site = request.headers.get('sec-fetch-site')
  if (site && site !== 'same-origin') return { status: 403, error: 'origin' }
  const origin = request.headers.get('origin')
  if (!site && origin && !ownHost(request, origin)) return { status: 403, error: 'origin' }
  return null
}

/** The Origin names this host, as the proxy passed it on or as the function sees it. */
function ownHost(request: Request, origin: string): boolean {
  let host: string
  try {
    host = new URL(origin).host
  } catch {
    return false
  }
  const own = [new URL(request.url).host, request.headers.get('x-forwarded-host'), request.headers.get('host')]
  return own.includes(host)
}

type WaitlistBody = { email?: unknown; website?: unknown; source?: unknown }

/** POST /api/waitlist. A filled honeypot looks saved and is not stored. */
export async function handleWaitlist(
  request: Request,
  env: WaitlistEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const headers = { 'Cache-Control': 'no-store' }
  const refused = refusal(request)
  if (refused) return Response.json({ ok: false, error: refused.error }, { status: refused.status, headers })
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
