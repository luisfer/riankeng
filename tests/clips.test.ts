import { describe, expect, it } from 'vitest'
import { clipResponseOk } from '@/audio/clips'

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
