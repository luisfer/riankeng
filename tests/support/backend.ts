/**
 * What the simulated learner signs in to. Two backends, one interface: an in-memory stand-in that
 * always runs, and the real Supabase project, reached with the service role only to make a throwaway
 * learner and to remove it again. Nothing here prints a key, a token or a password.
 */
import { existsSync, readFileSync } from 'node:fs'
import https from 'node:https'
import { gunzipSync } from 'node:zlib'
import type { ProgressDoc } from '../../src/storage/progress-schema'
import { fakeSupabase, type FakeStats } from './fake-supabase'

export interface Backend {
  kind: 'fake' | 'live'
  origin: string
  anon: string
  fetch: typeof fetch
  /** A learner who can sign in with this email and password. Returns the user id. */
  createUser(email: string, password: string, displayName: string): Promise<string>
  /** Remove the learner and, by cascade, the progress row. */
  deleteUser(id: string): Promise<void>
  /** What the account holds, read as the service would, past every policy. */
  remoteDoc(userId: string): Promise<ProgressDoc | null>
  stats?(): FakeStats
  setOffline?(off: boolean): void
  /** Bytes that crossed the network, as compressed as the server sent them. Only a real network has them. */
  wire?(): { up: number; down: number }
}

export function fakeBackend(): Backend {
  const fake = fakeSupabase()
  return {
    kind: 'fake',
    origin: fake.origin,
    anon: fake.anon,
    fetch: fake.fetch,
    createUser: async (email, password, name) => fake.addUser(email, password, name),
    deleteUser: async (id) => fake.removeUser(id),
    remoteDoc: async (id) => (fake.progress.get(id)?.doc as ProgressDoc | undefined) ?? null,
    stats: () => fake.stats,
    setOffline: (off) => {
      fake.offline = off
    },
  }
}

/**
 * fetch over node's own https. The test environment's fetch plays a browser, with a page origin and
 * its cross-origin rules, which is not what a request from this script is.
 */
const wireBytes = { up: 0, down: 0 }

export function nodeFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url)
  return new Promise((resolve, reject) => {
    const headers: Record<string, string> = {}
    const raw = init.headers
    if (raw instanceof Headers) raw.forEach((v, k) => (headers[k] = v))
    else if (Array.isArray(raw)) for (const [k, v] of raw) headers[k] = v
    else if (raw) Object.assign(headers, raw)
    const body = init.body == null ? undefined : String(init.body)
    if (body !== undefined) headers['content-length'] = String(Buffer.byteLength(body))
    // A browser asks for compressed responses, and the API gives them.
    if (!Object.keys(headers).some((k) => k.toLowerCase() === 'accept-encoding')) headers['accept-encoding'] = 'gzip'
    const req = https.request(url, { method: init.method ?? 'GET', headers }, (res) => {
      const chunks: Buffer[] = []
      res.on('data', (c: Buffer) => chunks.push(c))
      res.on('end', () => {
        const out = new Headers()
        for (const [k, v] of Object.entries(res.headers)) if (v !== undefined && k.toLowerCase() !== 'content-encoding') out.set(k, Array.isArray(v) ? v.join(', ') : v)
        const status = res.statusCode ?? 0
        const empty = status === 204 || status === 205 || status === 304
        const sent = Buffer.concat(chunks)
        wireBytes.down += sent.length
        if (body !== undefined) wireBytes.up += Buffer.byteLength(body)
        const plain = res.headers['content-encoding'] === 'gzip' ? gunzipSync(sent) : sent
        resolve(new Response(empty ? null : plain.toString('utf8'), { status, headers: out }))
      })
    })
    req.setTimeout(60_000, () => req.destroy(new Error('request timed out')))
    req.on('error', reject)
    if (body !== undefined) req.write(body)
    req.end()
  })
}

/** The project's own settings, from .env.local. Null when any of the three is missing. */
export function liveSettings(): { url: string; anon: string; service: string } | null {
  if (!existsSync('.env.local')) return null
  const vars: Record<string, string> = {}
  for (const line of readFileSync('.env.local', 'utf-8').split('\n')) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
    if (m) vars[m[1]!] = m[2]!.replace(/^["']|["']$/g, '')
  }
  const url = (vars.SUPABASE_URL ?? '').trim().replace(/\/$/, '')
  const anon = (vars.VITE_SUPABASE_ANON_KEY ?? '').trim()
  const service = (vars.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
  return url && anon && service ? { url, anon, service } : null
}

export function liveBackend(settings: { url: string; anon: string; service: string }): Backend {
  const { url, anon, service } = settings
  const asService = { apikey: service, Authorization: `Bearer ${service}`, 'Content-Type': 'application/json' }
  return {
    kind: 'live',
    origin: url,
    anon,
    fetch: nodeFetch,
    wire: () => ({ ...wireBytes }),
    async createUser(email, password, displayName) {
      const res = await nodeFetch(`${url}/auth/v1/admin/users`, {
        method: 'POST',
        headers: asService,
        body: JSON.stringify({ email, password, email_confirm: true, user_metadata: { display_name: displayName } }),
      })
      if (!res.ok) throw new Error(`could not make the throwaway learner (status ${res.status})`)
      const made = (await res.json()) as { id?: string }
      if (!made.id) throw new Error('the throwaway learner came back with no id')
      return made.id
    },
    async deleteUser(id) {
      const res = await nodeFetch(`${url}/auth/v1/admin/users/${id}`, { method: 'DELETE', headers: asService })
      // A learner that is already gone is the state wanted.
      if (!res.ok && res.status !== 404) throw new Error(`could not remove the throwaway learner (status ${res.status})`)
    },
    async remoteDoc(id) {
      const res = await nodeFetch(`${url}/rest/v1/progress?select=doc&user_id=eq.${id}`, { headers: asService })
      if (!res.ok) throw new Error(`could not read the account's progress (status ${res.status})`)
      const rows = (await res.json()) as { doc?: ProgressDoc }[]
      return rows[0]?.doc ?? null
    },
  }
}
