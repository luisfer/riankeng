import { afterEach, describe, expect, it, vi } from 'vitest'
import { changePassword, currentAccess, readAccount, takeRecoverySession } from '../src/storage/auth'

function jwt(sub: string, email = 'luis@example.com'): string {
  const enc = (value: object) => btoa(JSON.stringify(value)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
  return `${enc({ alg: 'none' })}.${enc({ sub, email, user_metadata: { display_name: 'Luis' } })}.sig`
}

function tokenBody(status: number) {
  if (status !== 200) return new Response('no', { status })
  return new Response(
    JSON.stringify({
      access_token: jwt('user-1'),
      refresh_token: 'refresh',
      expires_in: 3600,
      user: { email: 'luis@example.com', user_metadata: { display_name: 'Luis' } },
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

describe('changePassword', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('does not set a new password when the current one is refused', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    localStorage.setItem(
      'riankeng:account',
      JSON.stringify({
        accessToken: jwt('user-1'),
        refreshToken: 'refresh',
        expiresAt: Date.now() + 60 * 60 * 1000,
        email: 'luis@example.com',
        displayName: 'Luis',
        userId: 'user-1',
      }),
    )
    const fetchMock = vi.fn(async (input: RequestInfo) => {
      if (String(input).includes('/token')) return tokenBody(400)
      return new Response('no', { status: 500 })
    })
    vi.stubGlobal('fetch', fetchMock)
    expect(await changePassword('wrong', 'next-password')).toBe(false)
    expect(fetchMock.mock.calls.some((call) => String(call[0]).includes('/user'))).toBe(false)
  })
})

describe('takeRecoverySession', () => {
  afterEach(() => localStorage.clear())

  it('reads the recovery hash and leaves the account route', () => {
    const session = takeRecoverySession(
      `#access_token=${jwt('user-9')}&refresh_token=ref&expires_in=10&type=recovery`,
    )
    expect(session?.userId).toBe('user-9')
    expect(session?.email).toBe('luis@example.com')
    expect(session?.displayName).toBe('Luis')
    expect(window.location.hash).toBe('#/account')
    expect(localStorage.getItem('riankeng:account')).toContain('user-9')
  })
})

describe('refreshing an expired session', () => {
  const stored = () =>
    localStorage.setItem(
      'riankeng:account',
      JSON.stringify({
        accessToken: jwt('user-1'),
        refreshToken: 'refresh',
        expiresAt: Date.now() - 1000,
        email: 'luis@example.com',
        displayName: 'Luis',
        userId: 'user-1',
      }),
    )

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('keeps the session when the network is down', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    stored()
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('Failed to fetch') }))
    expect(await currentAccess()).toBeNull()
    expect(readAccount()?.refreshToken).toBe('refresh')
  })

  it('keeps the session when the server fails', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    stored()
    vi.stubGlobal('fetch', vi.fn(async () => tokenBody(503)))
    expect(await currentAccess()).toBeNull()
    expect(readAccount()).not.toBeNull()
  })

  it('signs out when the refresh token is refused', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    stored()
    vi.stubGlobal('fetch', vi.fn(async () => tokenBody(400)))
    expect(await currentAccess()).toBeNull()
    expect(readAccount()).toBeNull()
  })

  it('stores the fresh token when the refresh works', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    stored()
    vi.stubGlobal('fetch', vi.fn(async () => tokenBody(200)))
    expect((await currentAccess())?.email).toBe('luis@example.com')
    expect(readAccount()!.expiresAt).toBeGreaterThan(Date.now())
  })
})

