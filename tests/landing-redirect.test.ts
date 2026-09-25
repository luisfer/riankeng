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
})
