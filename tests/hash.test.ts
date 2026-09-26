import { describe, expect, it } from 'vitest'
import { hashFor, parseHash, replace } from '../src/ui/hash'

describe('hash', () => {
  it('treats an unknown path as the journey', () => {
    expect(parseHash('#/foo')).toEqual({ name: 'journey' })
  })

  it('routes the two tracks, without shadowing a script level', () => {
    expect(parseHash('#/voice')).toEqual({ name: 'track', track: 'voice' })
    expect(parseHash('#/script')).toEqual({ name: 'track', track: 'script' })
    expect(parseHash('#/script/level/12')).toEqual({ name: 'intro', n: 12, track: 'script' })
    expect(hashFor({ name: 'track', track: 'voice' })).toBe('#/voice')
    expect(hashFor({ name: 'track', track: 'script' })).toBe('#/script')
    for (const track of ['voice', 'script'] as const) {
      expect(parseHash(hashFor({ name: 'track', track }))).toEqual({ name: 'track', track })
    }
  })

  it('routes her day both ways', () => {
    expect(parseHash('#/day')).toEqual({ name: 'day' })
    expect(hashFor({ name: 'day' })).toBe('#/day')
  })

  it('replaces a dead session without adding history', () => {
    window.history.pushState(null, '', '/#/session')
    const before = window.history.length
    replace({ name: 'journey' })
    expect(window.location.hash).toBe(hashFor({ name: 'journey' }))
    expect(window.history.length).toBe(before)
  })
})
