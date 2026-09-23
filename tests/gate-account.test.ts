import { describe, expect, it, vi } from 'vitest'
import { accountMayPass } from '../src/gate-account'

const env = { url: 'https://example.supabase.co', anon: 'anon-key' }

describe('accountMayPass', () => {
  it('opens the course when the account token is accepted', async () => {
    const fetchImpl = vi.fn(async () => new Response('{}', { status: 200 }))
    expect(await accountMayPass('Bearer token', env, fetchImpl)).toBe(true)
    expect(fetchImpl).toHaveBeenCalledWith('https://example.supabase.co/auth/v1/user', expect.anything())
  })

  it('stays shut without a token, or when the account is refused', async () => {
    expect(await accountMayPass(null, env, vi.fn())).toBe(false)
    expect(await accountMayPass('Bearer token', { url: '', anon: '' }, vi.fn())).toBe(false)
    const fetchImpl = vi.fn(async () => new Response('no', { status: 401 }))
    expect(await accountMayPass('Bearer token', env, fetchImpl)).toBe(false)
  })
})
