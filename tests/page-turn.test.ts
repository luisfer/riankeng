import { afterEach, describe, expect, it, vi } from 'vitest'
import { turnPage } from '../src/ui/page-turn'

afterEach(() => {
  delete (document as { startViewTransition?: unknown }).startViewTransition
  delete document.documentElement.dataset.turn
  delete document.documentElement.dataset.turning
  vi.restoreAllMocks()
})

describe('turnPage', () => {
  it('changes the screen at once where the browser cannot turn a page', () => {
    const update = vi.fn()
    turnPage({ name: 'journey' }, { name: 'day' }, update)
    expect(update).toHaveBeenCalledOnce()
  })

  it('turns forward going into the course and back coming out, and not within one screen', async () => {
    const seen: (string | undefined)[] = []
    ;(document as { startViewTransition?: unknown }).startViewTransition = (cb: () => void) => {
      seen.push(document.documentElement.dataset.turn)
      cb()
      return { finished: Promise.resolve() }
    }
    const update = vi.fn()
    turnPage({ name: 'journey' }, { name: 'intro', n: 1, track: 'voice' }, update)
    turnPage({ name: 'done' }, { name: 'journey' }, update)
    turnPage({ name: 'track', track: 'voice' }, { name: 'track', track: 'script' }, update)
    expect(seen).toEqual(['forward', 'back'])
    expect(update).toHaveBeenCalledTimes(3)
    await Promise.resolve()
    expect(document.documentElement.dataset.turn).toBeUndefined()
  })

  it('captures the page leaving and the page arriving apart, so neither stretches to the other', async () => {
    const marks: (string | undefined)[] = []
    ;(document as { startViewTransition?: unknown }).startViewTransition = (cb: () => void) => {
      marks.push(document.documentElement.dataset.turning)
      cb()
      marks.push(document.documentElement.dataset.turning)
      return { finished: Promise.resolve() }
    }
    turnPage({ name: 'session' }, { name: 'done' }, () => marks.push('update'))
    expect(marks).toEqual(['out', 'update', 'in'])
    await Promise.resolve()
    expect(document.documentElement.dataset.turning).toBeUndefined()
  })
})
