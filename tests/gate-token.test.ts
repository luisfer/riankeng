import { describe, expect, it } from 'vitest'
import { gateToken, readCookie } from '../src/gate-token'

describe('gateToken', () => {
  it('is stable for the same secret', async () => {
    const a = await gateToken('pristine')
    const b = await gateToken('pristine')
    expect(a).toBe(b)
    expect(a).toHaveLength(64)
  })

  it('changes when the secret changes', async () => {
    expect(await gateToken('a')).not.toBe(await gateToken('b'))
  })

  it('reads a named cookie', () => {
    expect(readCookie('rk_gate=abc; other=1', 'rk_gate')).toBe('abc')
    expect(readCookie(null, 'rk_gate')).toBeNull()
  })
})
