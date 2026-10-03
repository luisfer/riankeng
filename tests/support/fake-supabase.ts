/**
 * The parts of Supabase the learner's browser and the gate talk to, in memory: password sign-in,
 * refresh-token rotation, the user check the gate makes, and the progress table with its own-row
 * policies. Same paths, shapes and status codes, on the test's clock (Date.now), so a token
 * expires when simulated time says it does.
 *
 * One detail is copied on purpose: Postgres stores a jsonb object with its keys shortest first,
 * then bytewise, so a document read back is the same data in a different key order. Code that
 * compares documents as strings has to survive that, and with a plain Map it never would be asked to.
 */
import { createHash, randomBytes, randomUUID } from 'node:crypto'

export interface FakeStats {
  requests: number
  signIns: number
  refreshes: number
  reads: number
  uploads: number
  uploadBytes: number
  refused: number
}

/** One request the fake answered: which table call, what columns were asked for, how big each way. */
export interface FakeRequest {
  method: string
  path: string
  select: string | null
  /** The size of a request body, or of the document sent back, in bytes. */
  bytes: number
}

export interface FakeSupabase {
  origin: string
  anon: string
  fetch: typeof fetch
  addUser(email: string, password: string, displayName?: string): string
  removeUser(id: string): void
  progress: Map<string, { doc: unknown; updated_at: string }>
  stats: FakeStats
  /** Every call to the progress table, oldest first. */
  requests: FakeRequest[]
  /** Every call fails like a dropped connection, until set back. */
  offline: boolean
}

type User = { id: string; email: string; password: string; displayName: string }
type Token = { sub: string; exp: number }

/** jsonb's key order: shorter keys first, then bytewise. */
export function jsonb<T>(value: T): T {
  if (Array.isArray(value)) return value.map((v) => jsonb(v)) as T
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {}
    const keys = Object.keys(value).sort((a, b) => {
      const ba = Buffer.from(a)
      const bb = Buffer.from(b)
      return ba.length - bb.length || Buffer.compare(ba, bb)
    })
    for (const k of keys) out[k] = jsonb((value as Record<string, unknown>)[k])
    return out as T
  }
  return value
}

const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString('base64url')

export function fakeSupabase(origin = 'https://sim.supabase.test', anon = 'sim-anon-key'): FakeSupabase {
  const users = new Map<string, User>()
  const access = new Map<string, Token>()
  const refresh = new Map<string, { userId: string; spent: boolean }>()
  const progress = new Map<string, { doc: unknown; updated_at: string }>()
  const stats: FakeStats = { requests: 0, signIns: 0, refreshes: 0, reads: 0, uploads: 0, uploadBytes: 0, refused: 0 }
  const requests: FakeRequest[] = []
  const self: FakeSupabase = {
    origin,
    anon,
    progress,
    stats,
    requests,
    offline: false,
    fetch: async () => new Response(null, { status: 500 }),
    addUser(email, password, displayName = '') {
      const id = randomUUID()
      users.set(id, { id, email: email.trim().toLowerCase(), password, displayName })
      return id
    },
    removeUser(id) {
      users.delete(id)
      progress.delete(id) // on delete cascade
    },
  }

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
  const refuse = (status: number, body: unknown) => {
    stats.refused++
    return json(status, body)
  }

  function issue(user: User) {
    const exp = Math.floor(Date.now() / 1000) + 3600
    const token = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({
      sub: user.id,
      email: user.email,
      aud: 'authenticated',
      role: 'authenticated',
      exp,
      user_metadata: user.displayName ? { display_name: user.displayName } : {},
    })}.${createHash('sha256').update(randomBytes(8)).digest('base64url')}`
    const refreshToken = randomBytes(9).toString('base64url')
    access.set(token, { sub: user.id, exp })
    refresh.set(refreshToken, { userId: user.id, spent: false })
    return {
      access_token: token,
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: exp,
      refresh_token: refreshToken,
      user: { id: user.id, email: user.email, user_metadata: user.displayName ? { display_name: user.displayName } : {} },
    }
  }

  /** The person a bearer token names, or why not: PostgREST answers an expired token 401 JWT expired. */
  function who(headers: Record<string, string>): { sub: string } | { status: number; body: unknown } {
    if (headers.apikey !== anon) return { status: 401, body: { message: 'Invalid API key' } }
    const bearer = (headers.authorization ?? '').replace(/^Bearer /, '')
    const token = access.get(bearer)
    if (!token) return { status: 401, body: { code: '42501', message: 'permission denied' } }
    if (token.exp * 1000 <= Date.now()) return { status: 401, body: { code: 'PGRST301', message: 'JWT expired' } }
    return { sub: token.sub }
  }

  self.fetch = async (input, init) => {
    if (self.offline) throw new TypeError('Failed to fetch')
    stats.requests++
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url)
    const method = (init?.method ?? 'GET').toUpperCase()
    const headers: Record<string, string> = {}
    const raw = init?.headers
    if (raw instanceof Headers) raw.forEach((v, k) => (headers[k.toLowerCase()] = v))
    else if (Array.isArray(raw)) for (const [k, v] of raw) headers[k.toLowerCase()] = v
    else if (raw) for (const [k, v] of Object.entries(raw)) headers[k.toLowerCase()] = String(v)
    const body = typeof init?.body === 'string' ? init.body : ''
    if (url.origin !== origin) return json(404, { message: 'not this fake' })

    if (url.pathname === '/auth/v1/token' && method === 'POST') {
      if (headers.apikey !== anon) return refuse(401, { message: 'Invalid API key' })
      const payload = JSON.parse(body || '{}') as { email?: string; password?: string; refresh_token?: string }
      const grant = url.searchParams.get('grant_type')
      if (grant === 'password') {
        const email = (payload.email ?? '').trim().toLowerCase()
        const user = [...users.values()].find((u) => u.email === email && u.password === payload.password)
        if (!user) return refuse(400, { error: 'invalid_grant', error_description: 'Invalid login credentials' })
        stats.signIns++
        return json(200, issue(user))
      }
      if (grant === 'refresh_token') {
        const held = refresh.get(payload.refresh_token ?? '')
        const user = held && users.get(held.userId)
        // A refresh token is good once. Reusing a spent one is what two tabs racing would do.
        if (!held || held.spent || !user) return refuse(400, { error: 'invalid_grant', error_description: 'Invalid Refresh Token' })
        held.spent = true
        stats.refreshes++
        return json(200, issue(user))
      }
      return refuse(400, { error: 'unsupported_grant_type' })
    }

    if (url.pathname === '/auth/v1/user' && method === 'GET') {
      const got = who(headers)
      if ('status' in got) return refuse(got.status, got.body)
      const user = users.get(got.sub)
      return user ? json(200, { id: user.id, email: user.email }) : refuse(401, { message: 'user not found' })
    }

    if (url.pathname === '/rest/v1/progress') {
      const got = who(headers)
      if ('status' in got) return refuse(got.status, got.body)
      if (method === 'GET') {
        stats.reads++
        // The policy filters to the caller's own row whatever the query asks for.
        const asked = url.searchParams.get('user_id')
        const row = progress.get(got.sub)
        const select = url.searchParams.get('select') ?? '*'
        const columns = select === '*' ? ['doc', 'updated_at'] : select.split(',')
        // PostgREST prints a timestamptz with a numeric offset, not a Z.
        const shaped = (r: { doc: unknown; updated_at: string }) =>
          Object.fromEntries(columns.filter((c) => c === 'doc' || c === 'updated_at').map((c) => [c, c === 'doc' ? r.doc : new Date(r.updated_at).toISOString().replace('Z', '+00:00')]))
        const rows = row && (!asked || asked === `eq.${got.sub}`) ? [shaped(row)] : []
        const out = JSON.stringify(rows)
        requests.push({ method, path: url.pathname, select, bytes: Buffer.byteLength(out) })
        return new Response(out, { status: 200, headers: { 'Content-Type': 'application/json' } })
      }
      if (method === 'POST') {
        const row = JSON.parse(body) as { user_id?: string; doc?: unknown; updated_at?: string }
        if (row.user_id !== got.sub) {
          return refuse(403, { code: '42501', message: 'new row violates row-level security policy for table "progress"' })
        }
        stats.uploads++
        stats.uploadBytes += Buffer.byteLength(body)
        requests.push({ method, path: url.pathname, select: null, bytes: Buffer.byteLength(body) })
        progress.set(got.sub, { doc: jsonb(row.doc), updated_at: row.updated_at ?? new Date().toISOString() })
        return new Response(null, { status: 201 })
      }
    }
    return json(404, { message: `no fake for ${method} ${url.pathname}` })
  }
  return self
}
