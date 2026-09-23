import { describe, expect, it } from 'vitest'
import { hasPassed } from '../src/engine/scheduler'
import { resolveLoad, sameDocPayload } from '../src/storage/db'
import { emptyDoc, sanitizeDoc, sanitizeItem, stampDoc } from '../src/storage/progress-schema'

describe('resolveLoad', () => {
  it('does not treat a timeout as an empty document', () => {
    const real = emptyDoc(10)
    real.items['w:maa'] = {
      id: 'w:maa',
      stage: 3,
      due: 1,
      reps: 4,
      lapses: 0,
      lastSeen: 9,
      days: ['2026-01-01'],
      history: [],
    }
    const timedOut = resolveLoad({ ok: false, reason: 'timeout' }, real)
    expect(timedOut.status).toBe('timeout')
    expect(timedOut.doc?.items['w:maa']?.reps).toBe(4)

    const noMirror = resolveLoad({ ok: false, reason: 'timeout' }, null)
    expect(noMirror.status).toBe('timeout')
    expect(noMirror.doc).toBeNull()
  })

  it('takes the later updatedAt when both copies exist', () => {
    const older = emptyDoc(10)
    older.updatedAt = 10
    const newer = emptyDoc(20)
    newer.updatedAt = 20
    newer.items['w:maa'] = {
      id: 'w:maa',
      stage: 2,
      due: 1,
      reps: 2,
      lapses: 0,
      lastSeen: 20,
      days: ['2026-01-01'],
      history: [],
    }
    const got = resolveLoad({ ok: true, value: older }, newer)
    expect(got.status).toBe('ready')
    expect(got.doc?.items['w:maa']?.reps).toBe(2)
  })

  it('takes the copy with the later updatedAt', () => {
    const older = emptyDoc(10)
    older.items['w:maa'] = {
      id: 'w:maa',
      stage: 1,
      due: 1,
      reps: 1,
      lapses: 0,
      lastSeen: 1,
      days: [],
      history: [],
    }
    const newer = emptyDoc(20)
    newer.items['w:maa'] = {
      id: 'w:maa',
      stage: 3,
      due: 2,
      reps: 4,
      lapses: 0,
      lastSeen: 9,
      days: ['2026-01-01'],
      history: [],
    }
    const fromMirror = resolveLoad({ ok: true, value: older }, newer)
    expect(fromMirror.status).toBe('ready')
    expect(fromMirror.doc?.updatedAt).toBe(20)
    expect(fromMirror.doc?.items['w:maa']?.reps).toBe(4)

    const fromIdb = resolveLoad({ ok: true, value: newer }, older)
    expect(fromIdb.status).toBe('ready')
    expect(fromIdb.doc?.updatedAt).toBe(20)
    expect(fromIdb.doc?.items['w:maa']?.reps).toBe(4)
  })

  it('uses a missing IDB result as empty only when there is no mirror', () => {
    const empty = resolveLoad({ ok: true, value: undefined }, null)
    expect(empty.status).toBe('empty')
    if (empty.status !== 'empty') throw new Error('expected empty')
    expect(Object.keys(empty.doc.items)).toHaveLength(0)
  })
})

describe('sanitizeDoc', () => {
  it('fills missing days so the home screen can render', () => {
    const doc = emptyDoc(1)
    doc.items['w:maa'] = {
      id: 'w:maa',
      stage: 1,
      due: 1,
      reps: 1,
      lapses: 0,
      lastSeen: 1,
      days: undefined as unknown as string[],
      history: [],
    }
    const clean = sanitizeDoc(doc)
    expect(clean.items['w:maa']!.days).toEqual([])
  })
})

describe('sanitizeItem', () => {
  it('fills missing days, history, and stage so hasPassed can read the card', () => {
    const item = sanitizeItem({ id: 'w:maa', reps: 3 }, 'w:maa')
    expect(item).toMatchObject({ id: 'w:maa', reps: 3, stage: 0, days: [], history: [] })
    expect(hasPassed(item!)).toBe(false)
  })
})

describe('sameDocPayload', () => {
  it('ignores updatedAt so a hydrate save can be skipped', () => {
    const a = emptyDoc(1)
    const b = { ...a, updatedAt: 99 }
    expect(sameDocPayload(a, b)).toBe(true)
  })

  it('stamps updatedAt on the in-memory doc', () => {
    const a = emptyDoc(1)
    const b = stampDoc(a, 50)
    expect(b.updatedAt).toBe(50)
    expect(a.updatedAt).toBe(1)
  })
})
