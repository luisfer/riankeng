import { clipCached, clipUrl, hasShippedClip, prefetchClip, setClipCached, shouldTryClip } from './clips'
import { stickPlaybackRate } from './rate'

export interface VoiceInfo {
  ready: boolean
  name: string
  warning: string | null
}

export interface SpeakOpts {
  /** True when called from a click. Autoplay must not speak before this unlocks the page. */
  gesture?: boolean
}

function thaiVoices(): SpeechSynthesisVoice[] {
  if (typeof speechSynthesis === 'undefined') return []
  return speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('th'))
}

export function detectVoice(): VoiceInfo {
  if (typeof speechSynthesis === 'undefined') {
    return { ready: false, name: '', warning: 'This browser has no speech synthesis.' }
  }
  const voices = thaiVoices()
  if (!voices.length) {
    return {
      ready: false,
      name: '',
      warning: 'No Thai voice found. On a Mac: System Settings, Accessibility, Spoken Content.',
    }
  }
  return { ready: true, name: voices[0]!.name, warning: null }
}

let lastAudio: HTMLAudioElement | null = null
/** Chrome garbage-collects utterances that are not held, which yields silence. */
let heldUtterance: SpeechSynthesisUtterance | null = null
let unlocked = false
let resumeTimer: ReturnType<typeof setInterval> | null = null

const failCbs = new Set<() => void>()

function notifySpeakFail(): void {
  for (const cb of failCbs) cb()
}

function stopResumeWatch(): void {
  if (resumeTimer == null) return
  clearInterval(resumeTimer)
  resumeTimer = null
}

function watchChromePause(): void {
  stopResumeWatch()
  resumeTimer = setInterval(() => {
    if (typeof speechSynthesis === 'undefined' || !speechSynthesis.speaking) {
      stopResumeWatch()
      return
    }
    if (speechSynthesis.paused) speechSynthesis.resume()
  }, 200)
}

function speakNow(thai: string, rate: number, gesture: boolean): VoiceInfo {
  if (typeof speechSynthesis === 'undefined') {
    return { ready: false, name: '', warning: 'This browser has no speech synthesis.' }
  }

  // A speak() without a gesture errors not-allowed and leaves Chrome silent for later clicks.
  if (!gesture && !unlocked) return detectVoice()

  const u = new SpeechSynthesisUtterance(thai)
  heldUtterance = u
  const voice = thaiVoices()[0]
  if (voice) u.voice = voice
  u.lang = 'th-TH'
  u.rate = Math.min(1.2, Math.max(0.5, rate))
  u.onstart = () => {
    unlocked = true
  }
  u.onend = () => {
    if (heldUtterance === u) heldUtterance = null
    stopResumeWatch()
  }
  u.onerror = (e) => {
    stopResumeWatch()
    if (e.error === 'canceled' || e.error === 'interrupted') return
    if (e.error === 'not-allowed' && !gesture) return
    notifySpeakFail()
  }

  // cancel() then speak() in the same turn is dropped by Chrome. Queue instead.
  if (speechSynthesis.paused) speechSynthesis.resume()
  try {
    speechSynthesis.speak(u)
    speechSynthesis.resume()
    if (gesture) unlocked = true
  } catch {
    return detectVoice()
  }

  watchChromePause()

  const listed = speechSynthesis.getVoices()
  if (listed.length > 0 && !voice) return detectVoice()
  return { ready: true, name: voice?.name ?? 'th-TH', warning: null }
}

function playClip(thai: string, id: string, rate: number, gesture: boolean): VoiceInfo {
  lastAudio?.pause()
  const audio = new Audio(clipUrl(id))
  stickPlaybackRate(audio, Math.min(1.2, Math.max(0.6, rate / 0.85)))
  lastAudio = audio
  void audio.play().then(
    () => {
      unlocked = true
      setClipCached(id, true)
    },
    () => {
      setClipCached(id, false)
      speakNow(thai, rate, gesture)
    },
  )
  return { ready: true, name: 'clip', warning: null }
}

/** Speak immediately. Never await network; that drops the user-gesture. */
export function speakThai(thai: string, id: string, rate = 0.85, opts: SpeakOpts = {}): VoiceInfo {
  const gesture = opts.gesture === true
  lastAudio?.pause()
  if (!shouldTryClip(id)) {
    prefetchClip(id)
    return speakNow(thai, rate, gesture)
  }
  return playClip(thai, id, rate, gesture)
}

/** Call from a click (Begin, Continue) so later autoplay may speak. */
export function unlockSpeech(): boolean {
  if (typeof speechSynthesis === 'undefined') return false
  unlocked = true
  try {
    if (speechSynthesis.paused) speechSynthesis.resume()
    if (typeof SpeechSynthesisUtterance !== 'undefined') {
      const u = new SpeechSynthesisUtterance('\u200b')
      u.volume = 0
      speechSynthesis.speak(u)
    }
  } catch {
    /* page is still marked unlocked */
  }
  return true
}

export function speechUnlocked(): boolean {
  return unlocked
}

export function resetSpeechForTests(): void {
  unlocked = false
}

export function canHearThai(id?: string): boolean {
  if (id !== undefined && (clipCached(id) === true || hasShippedClip(id))) return true
  return detectVoice().ready
}

export function speakSlower(thai: string, id: string, rate = 0.85, opts: SpeakOpts = {}): VoiceInfo {
  return speakThai(thai, id, Math.max(0.5, rate * 0.7), opts)
}

export function onSpeakFail(cb: () => void): () => void {
  failCbs.add(cb)
  return () => {
    failCbs.delete(cb)
  }
}

export function onVoices(cb: () => void): () => void {
  if (typeof speechSynthesis === 'undefined') return () => undefined
  const handler = () => cb()
  speechSynthesis.addEventListener('voiceschanged', handler)
  speechSynthesis.getVoices()
  return () => speechSynthesis.removeEventListener('voiceschanged', handler)
}
