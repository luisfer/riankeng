import { describe, expect, it } from 'vitest'
import { hashFor, parseHash, replace } from '../src/ui/hash'

describe('hash', () => {
  it('treats an unknown path as the journey', () => {
    expect(parseHash('#/foo')).toEqual({ name: 'journey' })
  })

  it('replaces a dead session without adding history', () => {
    window.history.pushState(null, '', '/#/session')
    const before = window.history.length
    replace({ name: 'journey' })
    expect(window.location.hash).toBe(hashFor({ name: 'journey' }))
    expect(window.history.length).toBe(before)
  })
})
