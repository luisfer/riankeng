import { describe, expect, it } from 'vitest'
import { landingRedirect } from '../src/landing/redirect'

describe('landingRedirect', () => {
  it('sends old hash routes to the course', () => {
    expect(landingRedirect('#/account', '', false)).toBe('/learn/#/account')
  })

  it('sends a home-screen launch to the course', () => {
    expect(landingRedirect('', '', true)).toBe('/learn/')
  })

  it('stays when the gate bounced a home-screen launch back', () => {
    expect(landingRedirect('', '?signin', true)).toBeNull()
    expect(landingRedirect('', '?signin=unset', true)).toBeNull()
  })

  it('stays for a plain visit', () => {
    expect(landingRedirect('', '', false)).toBeNull()
    expect(landingRedirect('#close', '', false)).toBeNull()
  })

  it('keeps a link from an email on the landing, installed or not', () => {
    const token = '#access_token=abc&refresh_token=r&type=recovery'
    expect(landingRedirect(token, '', false)).toBeNull()
    expect(landingRedirect(token, '', true)).toBeNull()
    expect(landingRedirect('#error=access_denied&error_code=otp_expired', '', true)).toBeNull()
  })
})
