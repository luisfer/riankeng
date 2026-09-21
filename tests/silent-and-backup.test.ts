import { describe, expect, it } from 'vitest'
import { entriesForLevel } from '../content/index'
import { startReviewSession, startSession } from '../src/engine/session'
import { newItemProgress } from '../src/engine/srs'
import { emptyDoc } from '../src/storage/progress-schema'
import { agoWords, backupStale } from '../src/ui/Account'

const t0 = Date.UTC(2026, 8, 21, 12)

function docWith(silent: boolean) {
  const doc = emptyDoc(t0)
  doc.settings = { ...doc.settings, silent, newPerSession: 16 }
  for (const e of entriesForLevel(0, 'voice')) {
    doc.items[e.id] = { ...newItemProgress(e.id), reps: 3, stage: 2, lastSeen: t0 - 1, due: t0 - 1 }
  }
  return doc
}

describe('silent mode', () => {
  it('schedules no listening exercises', () => {
    const sit = startSession(docWith(true), t0, 0, 'voice')
    expect(sit.queue.length).toBeGreaterThan(0)
    expect(sit.queue.map((q) => q.modality)).not.toContain('listen')
  })

  it('keeps them when it is off, so the switch is what changed it', () => {
    const loud = startSession(docWith(false), t0, 0, 'voice')
    expect(loud.queue.map((q) => q.modality)).toContain('listen')
  })

  it('is respected on a review sitting too', () => {
    const ids = entriesForLevel(0, 'voice').map((e) => e.id)
    const quiet = startReviewSession(docWith(true), t0, ids, 'voice')
    expect(quiet.queue.length).toBeGreaterThan(0)
    expect(quiet.queue.map((q) => q.modality)).not.toContain('listen')
  })

  it('defaults to off, so nothing changes for anyone who has not asked', () => {
    expect(emptyDoc(t0).settings.silent).toBe(false)
  })
})

describe('agoWords', () => {
  it('says never when there is no backup', () => {
    expect(agoWords(0, t0)).toBe('never')
  })

  it('reads in the plainest unit that still says it', () => {
    expect(agoWords(t0 - 5_000, t0)).toBe('just now')
    expect(agoWords(t0 - 60_000, t0)).toBe('a minute ago')
    expect(agoWords(t0 - 25 * 60_000, t0)).toBe('25 minutes ago')
    expect(agoWords(t0 - 60 * 60_000, t0)).toBe('an hour ago')
    expect(agoWords(t0 - 5 * 60 * 60_000, t0)).toBe('5 hours ago')
    expect(agoWords(t0 - 24 * 60 * 60_000, t0)).toBe('yesterday')
    expect(agoWords(t0 - 9 * 24 * 60 * 60_000, t0)).toBe('9 days ago')
  })
})

describe('backupStale', () => {
  it('is stale when there has never been one', () => {
    expect(backupStale(0, t0)).toBe(true)
  })

  it('goes stale after a week', () => {
    expect(backupStale(t0 - 6 * 24 * 60 * 60 * 1000, t0)).toBe(false)
    expect(backupStale(t0 - 8 * 24 * 60 * 60 * 1000, t0)).toBe(true)
  })
})
