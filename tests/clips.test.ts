import { afterEach, describe, expect, it } from 'vitest'
import {
  clipResponseOk,
  clipStem,
  clipUrl,
  hasShippedClip,
  resetClipCacheForTests,
  setClipCached,
  shouldTryClip,
} from '@/audio/clips'
import { canHearThai } from '@/audio/tts'

describe('clipResponseOk', () => {
  it('rejects Vite HTML fallbacks', () => {
    const res = new Response('<!doctype html>', { status: 200, headers: { 'content-type': 'text/html' } })
    expect(clipResponseOk(res)).toBe(false)
  })

  it('rejects missing files', () => {
    const res = new Response('', { status: 404, headers: { 'content-type': 'audio/mpeg' } })
    expect(clipResponseOk(res)).toBe(false)
  })

  it('accepts real audio', () => {
    const res = new Response('', { status: 200, headers: { 'content-type': 'audio/mpeg' } })
    expect(clipResponseOk(res)).toBe(true)
  })
})

describe('clip-first Hear', () => {
  afterEach(() => {
    resetClipCacheForTests()
  })

  it('keeps a slash id in one filename', () => {
    expect(clipStem('p:sà-wàt-dii kráp/kâ')).toBe('p:sà-wàt-dii kráp_kâ')
    expect(clipStem('w:aa#2')).toBe('w:aa_2')
    expect(clipUrl('w:maa')).toBe('/audio/w:maa.mp3')
    expect(clipUrl('p:sà-wàt-dii kráp/kâ')).toBe(`/audio/${encodeURI('p:sà-wàt-dii kráp_kâ')}.mp3`)
  })

  it('tries a clip until we know it is missing', () => {
    expect(shouldTryClip('w:maa')).toBe(true)
    setClipCached('w:maa', false)
    expect(shouldTryClip('w:maa')).toBe(false)
    setClipCached('w:maa', true)
    expect(shouldTryClip('w:maa')).toBe(true)
  })

  it('hears a shipped Voice clip without speechSynthesis', () => {
    expect(hasShippedClip('w:maa')).toBe(true)
    expect(hasShippedClip('w:máa')).toBe(true)
    expect(hasShippedClip('w:mǎa')).toBe(true)
    expect(hasShippedClip('p:sà-wàt-dii kráp/kâ')).toBe(true)
    expect(typeof speechSynthesis).toBe('undefined')
    expect(canHearThai('w:maa')).toBe(true)
    expect(canHearThai('s:mɔɔ')).toBe(false)
  })
})
