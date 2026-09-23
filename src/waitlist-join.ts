/** One address on the waitlist. The service role stays on the server. */

export type WaitlistEnv = {
  url?: string
  key?: string
}

export function normalizeEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase()
  const at = email.indexOf('@')
  if (at <= 0 || at === email.length - 1 || email.includes(' ')) return null
  return email
}

/** Saved, including an address that was already on the list. */
export async function insertWaitlistEmail(
  email: string,
  env: WaitlistEnv,
  fetchImpl: typeof fetch = fetch,
): Promise<'saved' | 'save'> {
  const url = env.url?.replace(/\/$/, '')
  const key = env.key
  if (!url || !key) return 'save'
  try {
    const res = await fetchImpl(`${url}/rest/v1/waitlist`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify({ email }),
    })
    if (res.ok || res.status === 409) return 'saved'
    return 'save'
  } catch {
    return 'save'
  }
}

type WaitlistBody = { email?: unknown; website?: unknown }

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
  const saved = await insertWaitlistEmail(email, env, fetchImpl)
  if (saved !== 'saved') return Response.json({ ok: false, error: 'save' }, { status: 502, headers })
  return Response.json({ ok: true }, { headers })
}
