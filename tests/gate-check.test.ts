import { describe, expect, it, vi } from 'vitest'
import { leaveIfSignedOut } from '../src/gate-check'

const answer = (body: unknown, status = 200) => vi.fn<typeof fetch>(async () => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }))

describe('a course opened from the cache', () => {
  it('goes to sign in when the gate says this browser is out', async () => {
    const go = vi.fn()
    expect(await leaveIfSignedOut({ online: true, fetchImpl: answer({ in: false }), go })).toBe(true)
    expect(go).toHaveBeenCalledWith('/?signin')
  })

  it('stays when signed in', async () => {
    const go = vi.fn()
    expect(await leaveIfSignedOut({ online: true, fetchImpl: answer({ in: true }), go })).toBe(false)
    expect(go).not.toHaveBeenCalled()
  })

  it('stays offline, without asking', async () => {
    const go = vi.fn()
    const fetchImpl = answer({ in: false })
    expect(await leaveIfSignedOut({ online: false, fetchImpl, go })).toBe(false)
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(go).not.toHaveBeenCalled()
  })

  it('stays when there is no clear answer', async () => {
    const go = vi.fn()
    expect(await leaveIfSignedOut({ online: true, fetchImpl: answer({ in: false }, 404), go })).toBe(false)
    expect(await leaveIfSignedOut({ online: true, fetchImpl: vi.fn(async () => { throw new TypeError('offline') }), go })).toBe(false)
    expect(await leaveIfSignedOut({ online: true, fetchImpl: answer('not json'), go })).toBe(false)
    expect(go).not.toHaveBeenCalled()
  })
})
