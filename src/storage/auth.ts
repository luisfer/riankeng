/** Password session for the learner account. The anon key is public. The service role never comes here. */

const SESSION_KEY = 'riankeng:account'
/** The key the session lives under, for tabs that follow a sign-in made in another. */
export const ACCOUNT_KEY = SESSION_KEY

export interface AccountSession {
  accessToken: string
  refreshToken: string
  /** Epoch ms when the access token expires. */
  expiresAt: number
  email: string
  displayName: string
  userId: string
}

export interface AccountConfig {
  url: string
  anon: string
}

export function accountConfig(): AccountConfig | null {
  const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? ''
  const anon = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? ''
  if (!url || !anon) return null
  return { url: url.replace(/\/$/, ''), anon }
}

function jwtClaims(accessToken: string): Record<string, unknown> | null {
  try {
    const part = accessToken.split('.')[1]
    if (!part) return null
    const json = JSON.parse(atob(part.replace(/-/g, '+').replace(/_/g, '/'))) as unknown
    return json && typeof json === 'object' ? (json as Record<string, unknown>) : null
  } catch {
    return null
  }
}

export function accountUserId(accessToken: string): string | null {
  const sub = jwtClaims(accessToken)?.sub
  return typeof sub === 'string' && sub ? sub : null
}

function isSession(value: unknown): value is AccountSession {
  if (!value || typeof value !== 'object') return false
  const v = value as Partial<AccountSession>
  return (
    typeof v.accessToken === 'string' &&
    typeof v.refreshToken === 'string' &&
    typeof v.expiresAt === 'number' &&
    typeof v.email === 'string' &&
    typeof v.displayName === 'string' &&
    typeof v.userId === 'string'
  )
}

export function readAccount(): AccountSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as unknown
    return isSession(parsed) ? parsed : null
  } catch {
    return null
  }
}

function writeAccount(session: AccountSession | null): void {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_KEY)
  } catch {
    /* private mode */
  }
}

export function signOutAccount(): void {
  writeAccount(null)
}

/** Keep a session that proved itself elsewhere, such as a link from an email. */
export function saveAccount(session: AccountSession): void {
  writeAccount(session)
}

interface TokenBody {
  access_token?: unknown
  refresh_token?: unknown
  expires_in?: unknown
  expires_at?: unknown
  user?: { email?: unknown; user_metadata?: { display_name?: unknown } }
}

function sessionFromToken(body: TokenBody, fallbackEmail: string): AccountSession | null {
  if (typeof body.access_token !== 'string' || typeof body.refresh_token !== 'string') return null
  const userId = accountUserId(body.access_token)
  if (!userId) return null
  const expiresAt =
    typeof body.expires_at === 'number'
      ? body.expires_at * 1000
      : Date.now() + (typeof body.expires_in === 'number' ? body.expires_in : 3600) * 1000
  const meta = body.user?.user_metadata
  const displayName = typeof meta?.display_name === 'string' ? meta.display_name.trim() : ''
  const email = typeof body.user?.email === 'string' ? body.user.email : fallbackEmail
  return { accessToken: body.access_token, refreshToken: body.refresh_token, expiresAt, email, displayName, userId }
}

/** A token, a refusal of the credentials, or no answer at all (offline, or the server failed). */
type TokenResult = { body: TokenBody } | { refused: true } | { unreachable: true }

async function tokenCall(config: AccountConfig, grant: string, payload: Record<string, string>): Promise<TokenResult> {
  try {
    const res = await fetch(`${config.url}/auth/v1/token?grant_type=${grant}`, {
      method: 'POST',
      headers: { apikey: config.anon, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (res.ok) return { body: (await res.json()) as TokenBody }
    // Supabase answers a wrong password or a spent refresh token with 400 (invalid_grant) or 401.
    if (res.status === 400 || res.status === 401) return { refused: true }
    return { unreachable: true }
  } catch {
    return { unreachable: true }
  }
}

/** A session, the credentials refused, no answer (offline, or the server failed), or no account set up here. */
export type SignInResult = { session: AccountSession } | { refused: true } | { unreachable: true } | { unset: true }

export async function signInResult(email: string, password: string): Promise<SignInResult> {
  const config = accountConfig()
  if (!config) return { unset: true }
  const address = email.trim().toLowerCase()
  const result = await tokenCall(config, 'password', { email: address, password })
  if ('refused' in result) return { refused: true }
  if ('unreachable' in result) return { unreachable: true }
  const session = sessionFromToken(result.body, address)
  if (!session) return { unreachable: true }
  writeAccount(session)
  return { session }
}

export async function signInAccount(email: string, password: string): Promise<AccountSession | null> {
  const result = await signInResult(email, password)
  return 'session' in result ? result.session : null
}

/** Check the current password, then set a new one. A wrong current password changes nothing. */
export async function changePassword(currentPassword: string, nextPassword: string): Promise<boolean> {
  const existing = readAccount()
  const config = accountConfig()
  if (!existing || !config || !nextPassword) return false
  const signed = await signInAccount(existing.email, currentPassword)
  if (!signed) return false
  return updatePassword(nextPassword, signed)
}

/** Set a password with a session that already proved itself, such as a recovery link. */
export async function updatePassword(password: string, session: AccountSession): Promise<boolean> {
  const config = accountConfig()
  if (!config || !password) return false
  try {
    const res = await fetch(`${config.url}/auth/v1/user`, {
      method: 'PUT',
      headers: {
        apikey: config.anon,
        Authorization: `Bearer ${session.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ password }),
    })
    return res.ok
  } catch {
    return false
  }
}

/** Ask Supabase to mail a recovery link. The link must land on this site's /learn/. */
export async function sendPasswordReset(email: string, redirectTo: string): Promise<boolean> {
  const config = accountConfig()
  const address = email.trim().toLowerCase()
  if (!config || !address || !address.includes('@')) return false
  try {
    const res = await fetch(`${config.url}/auth/v1/recover`, {
      method: 'POST',
      headers: { apikey: config.anon, 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: address, redirect_to: redirectTo }),
    })
    return res.ok
  } catch {
    return false
  }
}

/** A link from an email: a session to set a password with (a reset, or an invite), or why it failed. */
export type AuthLink =
  | { kind: 'session'; type: 'recovery' | 'invite'; session: AccountSession }
  | { kind: 'error'; code: string }

/**
 * Read a Supabase email link's hash: #access_token=…&type=recovery or type=invite, or
 * #error=…&error_code=otp_expired when the link was used or is too old. Writes nothing.
 */
export function parseAuthLink(raw: string): AuthLink | null {
  const body = raw.replace(/^#/, '')
  if (!body) return null
  const params = new URLSearchParams(body)
  const error = params.get('error_code') ?? params.get('error')
  if (error && !params.get('access_token')) return { kind: 'error', code: error }
  const type = params.get('type')
  if (type !== 'recovery' && type !== 'invite') return null
  const session = linkSession(params)
  return session ? { kind: 'session', type, session } : null
}

/** A recovery or invite redirect puts the session in the hash. Read it once, then leave the hash as the account route. */
export function takeRecoverySession(raw = typeof window === 'undefined' ? '' : window.location.hash): AccountSession | null {
  const link = parseAuthLink(raw)
  if (link?.kind !== 'session') return null
  writeAccount(link.session)
  if (typeof window !== 'undefined') {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/account`)
  }
  return link.session
}

function linkSession(params: URLSearchParams): AccountSession | null {
  const accessToken = params.get('access_token') ?? ''
  const refreshToken = params.get('refresh_token') ?? ''
  const userId = accountUserId(accessToken)
  if (!accessToken || !refreshToken || !userId) return null
  const claims = jwtClaims(accessToken)
  const meta = claims?.user_metadata
  const displayName =
    meta && typeof meta === 'object' && typeof (meta as { display_name?: unknown }).display_name === 'string'
      ? (meta as { display_name: string }).display_name.trim()
      : ''
  const email = typeof claims?.email === 'string' ? claims.email : ''
  const expiresIn = Number(params.get('expires_in') ?? '3600')
  return {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + (Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000,
    email,
    displayName,
    userId,
  }
}

let refreshing: Promise<AccountSession | null> | null = null

/** A usable access token, refreshing when the stored one is about to expire. */
export async function currentAccess(): Promise<AccountSession | null> {
  const config = accountConfig()
  const stored = readAccount()
  if (!config || !stored) return null
  if (stored.expiresAt - Date.now() > 60_000) return stored
  if (!refreshing) {
    refreshing = (async () => {
      const result = await tokenCall(config, 'refresh_token', { refresh_token: stored.refreshToken })
      // Offline, or the server failed: keep the session. This sync is skipped and the next one tries again.
      if ('unreachable' in result) return null
      const next = 'body' in result ? sessionFromToken(result.body, stored.email) : null
      if (!next) {
        writeAccount(null)
        return null
      }
      if (!next.displayName) next.displayName = stored.displayName
      writeAccount(next)
      return next
    })().finally(() => {
      refreshing = null
    })
  }
  return refreshing
}
