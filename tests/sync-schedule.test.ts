import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SyncScheduler } from '../src/storage/sync-schedule'

describe('SyncScheduler', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('runs once, however many times it is asked', () => {
    const run = vi.fn()
    const s = new SyncScheduler(run)
    for (let i = 0; i < 5; i++) s.request(1000)
    vi.advanceTimersByTime(999)
    expect(run).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(run).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(60_000)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('lets a request for now go ahead of one for later, and does not run the later one again', () => {
    const run = vi.fn()
    const s = new SyncScheduler(run)
    s.request(180_000)
    s.request(0)
    vi.advanceTimersByTime(1)
    expect(run).toHaveBeenCalledTimes(1)
    vi.advanceTimersByTime(180_000)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('does not postpone a sync that is already due sooner', () => {
    const run = vi.fn()
    const s = new SyncScheduler(run)
    s.request(1000)
    vi.advanceTimersByTime(600)
    s.request(1000)
    vi.advanceTimersByTime(400)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('turns a long sitting of answers into one sync at the safety net, not one a card', () => {
    const run = vi.fn()
    const s = new SyncScheduler(run)
    for (let i = 0; i < 17; i++) {
      s.request(180_000)
      vi.advanceTimersByTime(10_000)
    }
    expect(run).toHaveBeenCalledTimes(0)
    vi.advanceTimersByTime(10_000)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('can be asked again once it has run, and can be cancelled', () => {
    const run = vi.fn()
    const s = new SyncScheduler(run)
    s.request(10)
    expect(s.pending).toBe(true)
    vi.advanceTimersByTime(10)
    expect(s.pending).toBe(false)
    s.request(10)
    vi.advanceTimersByTime(10)
    expect(run).toHaveBeenCalledTimes(2)
    s.request(10)
    s.cancel()
    expect(s.pending).toBe(false)
    vi.advanceTimersByTime(1000)
    expect(run).toHaveBeenCalledTimes(2)
  })
})
