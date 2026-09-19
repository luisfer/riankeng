import { afterEach, describe, expect, it, vi } from 'vitest'
import { resetSpeechForTests, speechUnlocked, unlockSpeech } from '../src/audio/tts'

describe('unlockSpeech', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    resetSpeechForTests()
  })

  it('is a no-op when the page has no speech synthesis', () => {
    expect(typeof speechSynthesis).toBe('undefined')
    expect(unlockSpeech()).toBe(false)
    expect(speechUnlocked()).toBe(false)
  })

  it('marks speech unlocked after a gesture', () => {
    vi.stubGlobal('speechSynthesis', {
      speak: vi.fn(),
      cancel: vi.fn(),
      paused: false,
      resume: vi.fn(),
      getVoices: () => [],
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })
    expect(unlockSpeech()).toBe(true)
    expect(speechUnlocked()).toBe(true)
  })
})
