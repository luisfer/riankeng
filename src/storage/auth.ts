/** Password session for the learner account. The anon key is public. The service role never comes here. */

const SESSION_KEY = 'riankeng:account'

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

async function tokenRequest(config: AccountConfig, grant: string, payload: Record<string, string>): Promise<TokenBody | null> {
  try {
    const res = await fetch(`${config.url}/auth/v1/token?grant_type=${grant}`, {
      method: 'POST',
      headers: { apikey: config.anon, 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) return null
    return (await res.json()) as TokenBody
  } catch {
    return null
  }
}

export async function signInAccount(email: string, password: string): Promise<AccountSession | null> {
  const config = accountConfig()
  if (!config) return null
  const body = await tokenRequest(config, 'password', { email: email.trim().toLowerCase(), password })
  if (!body) return null
  const session = sessionFromToken(body, email.trim().toLowerCase())
  if (!session) return null
  writeAccount(session)
  return session
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

/** A recovery redirect puts the session in the hash. Read it once, then leave the hash as the account route. */
export function takeRecoverySession(raw = typeof window === 'undefined' ? '' : window.location.hash): AccountSession | null {
  const body = raw.replace(/^#/, '')
  if (!body.includes('type=recovery') || !body.includes('access_token=')) return null
  const params = new URLSearchParams(body)
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
  const session: AccountSession = {
    accessToken,
    refreshToken,
    expiresAt: Date.now() + (Number.isFinite(expiresIn) ? expiresIn : 3600) * 1000,
    email,
    displayName,
    userId,
  }
  writeAccount(session)
  if (typeof window !== 'undefined') {
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}#/account`)
  }
  return session
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
      const body = await tokenRequest(config, 'refresh_token', { refresh_token: stored.refreshToken })
      const next = body ? sessionFromToken(body, stored.email) : null
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
