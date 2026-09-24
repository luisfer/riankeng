import { describe, expect, it } from 'vitest'
import { clipUrl } from '../src/audio/clip-url'
import { decideGate, gateToken, isGated } from '../src/gate-token'
import { DEMO_IDS } from '../src/landing/demo'

const SECRET = 'pristine'

async function cookieFor(secret: string): Promise<string> {
  return `rk_gate=${await gateToken(secret)}`
}

describe('decideGate', () => {
  it('leaves the landing page and its assets alone', async () => {
    for (const path of ['/', '/index.html', '/assets/landing-abc.js', '/scenes/door-980.webp', '/fonts/onest/onest.woff2', '/api/gate']) {
      expect(await decideGate(path, null, SECRET, true)).toEqual({ kind: 'pass' })
      expect(isGated(path)).toBe(false)
    }
  })

  it('sends the course to sign in without a cookie', async () => {
    expect(await decideGate('/learn/', null, SECRET, true)).toEqual({ kind: 'redirect', to: '/?signin' })
    expect(await decideGate('/learn', null, SECRET, true)).toEqual({ kind: 'redirect', to: '/?signin' })
    expect(await decideGate('/learn/index.html', 'other=1', SECRET, true)).toEqual({ kind: 'redirect', to: '/?signin' })
  })

  it('serves the shell with a valid cookie, and not with a stale one', async () => {
    expect(await decideGate('/learn/', await cookieFor(SECRET), SECRET, true)).toEqual({ kind: 'shell' })
    expect(await decideGate('/learn/', await cookieFor('old password'), SECRET, true)).toEqual({ kind: 'redirect', to: '/?signin' })
  })

  it('keeps the demo clips public and the rest of the audio gated', async () => {
    for (const id of DEMO_IDS) {
      expect(await decideGate(clipUrl(id), null, SECRET, true)).toEqual({ kind: 'pass' })
    }
    expect(await decideGate(clipUrl('w:bpai'), null, SECRET, true)).toEqual({ kind: 'redirect', to: '/?signin' })
    expect(await decideGate(clipUrl('w:bpai'), await cookieFor(SECRET), SECRET, true)).toEqual({ kind: 'shell' })
  })

  it('names an unset password on Vercel, and stays open locally', async () => {
    expect(await decideGate('/learn/', null, undefined, true)).toEqual({ kind: 'redirect', to: '/?signin=unset' })
    expect(await decideGate('/learn/', null, '', true)).toEqual({ kind: 'redirect', to: '/?signin=unset' })
    expect(await decideGate('/learn/', null, undefined, false)).toEqual({ kind: 'shell' })
    expect(await decideGate('/audio/w:bpai.mp3', null, undefined, false)).toEqual({ kind: 'shell' })
  })
})
