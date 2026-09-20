import { describe, expect, it } from 'vitest'
import { resolveLoad, sameDocPayload } from '../src/storage/db'
import { emptyDoc, stampDoc } from '../src/storage/progress-schema'

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

  it('uses a missing IDB result as empty only when there is no mirror', () => {
    const empty = resolveLoad({ ok: true, value: undefined }, null)
    expect(empty.status).toBe('empty')
    if (empty.status !== 'empty') throw new Error('expected empty')
    expect(Object.keys(empty.doc.items)).toHaveLength(0)
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
