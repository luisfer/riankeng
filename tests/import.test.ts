import { describe, expect, it } from 'vitest'
import { applyAttempt, newItemProgress } from '../src/engine/srs'
import { applyImport, mergeItem, presentSettings, previewImport } from '../src/storage/import'
import { emptyDoc, type ProgressExport } from '../src/storage/progress-schema'

const t0 = Date.UTC(2026, 0, 1, 12)

describe('mergeItem', () => {
  it('unions history and keeps the higher stage', () => {
    let laptop = newItemProgress('w:maa')
    let when = t0
    for (let i = 0; i < 6; i++) {
      const t = laptop.due === 0 ? when : Math.max(when, laptop.due)
      laptop = applyAttempt(laptop, { t, ok: true, v: 'exact', m: 'th-en' })
      when = t + 86_400_000
    }
    expect(laptop.stage).toBe(6)
    const phone = applyAttempt(newItemProgress('w:maa'), {
      t: t0 + 10 * 86_400_000,
      ok: true,
      v: 'en-ok',
      m: 'th-en',
    })
    const merged = mergeItem(laptop, phone)
    expect(merged.stage).toBe(6)
    expect(merged.days.length).toBeGreaterThanOrEqual(laptop.days.length)
    expect(merged.history.some((h) => h.t === phone.lastSeen)).toBe(true)
  })

  it('does not replay attempts older than a capped local history', () => {
    const have = {
      ...newItemProgress('w:maa'),
      stage: 6,
      reps: 50,
      due: t0 + 35 * 86_400_000,
      lastSeen: t0 + 200,
      days: ['2026-01-01'],
      history: [
        { t: t0 + 100, ok: true, v: 'exact', m: 'th-en' as const },
        { t: t0 + 200, ok: true, v: 'exact', m: 'th-en' as const },
      ],
    }
    const incoming = {
      ...newItemProgress('w:maa'),
      stage: 1,
      reps: 1,
      lastSeen: t0,
      history: [{ t: t0, ok: true, v: 'exact', m: 'th-en' as const }],
    }
    const merged = mergeItem(have, incoming)
    expect(merged.stage).toBe(6)
    expect(merged.reps).toBe(50)
  })
})

describe('applyImport', () => {
  it('does not let a theme-only file wipe SRS', () => {
    const doc = emptyDoc(t0)
    doc.items['w:maa'] = applyAttempt(newItemProgress('w:maa'), { t: t0, ok: true, v: 'exact', m: 'th-en' })
    const incoming: ProgressExport = {
      version: 1,
      app: 'riankeng',
      exportedAt: new Date(t0).toISOString(),
      createdAt: t0,
      updatedAt: t0,
      settings: { ...doc.settings, theme: 'dark' },
      items: [],
      sessions: [],
    }
    const next = applyImport(doc, incoming, t0 + 1)
    expect(next.items['w:maa']?.reps).toBe(1)
    expect(next.settings.theme).toBe('dark')
  })

  it('only copies settings fields that are present', () => {
    expect(presentSettings({ theme: 'dark' })).toEqual({ theme: 'dark' })
  })

  it('preview counts merge vs already covered', () => {
    const doc = emptyDoc(t0)
    doc.items['w:maa'] = applyAttempt(newItemProgress('w:maa'), { t: t0, ok: true, v: 'exact', m: 'th-en' })
    const incoming: ProgressExport = {
      version: 1,
      app: 'riankeng',
      exportedAt: new Date(t0).toISOString(),
      createdAt: t0,
      updatedAt: t0,
      settings: doc.settings,
      items: [
        applyAttempt(newItemProgress('w:maa'), { t: t0 + 1000, ok: true, v: 'exact', m: 'en-th' }),
        { ...newItemProgress('no-such-card'), lastSeen: t0 },
      ],
      sessions: [],
    }
    const preview = previewImport(doc, incoming)
    expect(preview.unknown).toBe(1)
    expect(preview.newer).toBe(1)
    expect(preview.message).toMatch(/would merge/)
  })
})
