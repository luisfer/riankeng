import { afterEach, describe, expect, it, vi } from 'vitest'
import { clipCached, hasClip, resetClipCacheForTests, shouldTryClip } from '@/audio/clips'
import { speakThai } from '@/audio/tts'

/** An Audio whose play() settles the way the test says, counting how many were made. */
function stubAudio(play: () => Promise<void>) {
  const made: unknown[] = []
  class FakeAudio {
    src: string
    playbackRate = 1
    defaultPlaybackRate = 1
    constructor(src: string) {
      this.src = src
      made.push(this)
    }
    play() {
      return play()
    }
    pause() {}
    addEventListener() {}
    removeEventListener() {}
  }
  vi.stubGlobal('Audio', FakeAudio)
  return made
}

function refused(name: string) {
  const err = new Error(name)
  err.name = name
  return err
}

afterEach(() => {
  resetClipCacheForTests()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('a shipped clip is not given up on', () => {
  it('trusts the manifest without a HEAD request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    expect(await hasClip('w:kâao')).toBe(true)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('leaves a clip unknown when the probe is slow, so the next Hear tries it', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', vi.fn(() => new Promise<Response>(() => {})))
    const probe = hasClip('w:not-a-shipped-id')
    await vi.advanceTimersByTimeAsync(350)
    expect(await probe).toBe(false)
    expect(clipCached('w:not-a-shipped-id')).toBeUndefined()
    expect(shouldTryClip('w:not-a-shipped-id')).toBe(true)
  })

  it('tries the clip again after autoplay was refused', async () => {
    const made = stubAudio(() => Promise.reject(refused('NotAllowedError')))
    speakThai('ข้าว', 'w:kâao', 0.85, { gesture: false })
    await Promise.resolve()
    await Promise.resolve()
    expect(clipCached('w:kâao')).not.toBe(false)
    speakThai('ข้าว', 'w:kâao', 0.85, { gesture: true })
    expect(made).toHaveLength(2)
  })

  it('says nothing when the clip was paused for the next card', async () => {
    stubAudio(() => Promise.reject(refused('AbortError')))
    const speak = vi.fn()
    vi.stubGlobal('speechSynthesis', { speak, cancel: vi.fn(), resume: vi.fn(), pause: vi.fn(), getVoices: () => [], paused: false, speaking: false, addEventListener: vi.fn() })
    speakThai('ข้าว', 'w:kâao', 0.85, { gesture: true })
    await Promise.resolve()
    await Promise.resolve()
    expect(clipCached('w:kâao')).not.toBe(false)
    expect(speak).not.toHaveBeenCalled()
  })

  it('still marks a clip missing when it truly will not play', async () => {
    stubAudio(() => Promise.reject(refused('NotSupportedError')))
    speakThai('ข้าว', 'w:kâao', 0.85, { gesture: true })
    await Promise.resolve()
    await Promise.resolve()
    expect(clipCached('w:kâao')).toBe(false)
  })
})
