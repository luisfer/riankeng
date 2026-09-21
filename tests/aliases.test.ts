import { describe, expect, it } from 'vitest'
import { getEntry } from '../content/index'
import { ID_ALIASES, currentId } from '../content/aliases'
import { applyAttempt, newItemProgress } from '../src/engine/srs'
import { aliasItem, aliasItems, applyImport, previewImport } from '../src/storage/import'
import { emptyDoc, type ProgressExport } from '../src/storage/progress-schema'

const t0 = Date.UTC(2026, 0, 1, 12)

describe('ID_ALIASES', () => {
  it('points every retired id at an entry that exists', () => {
    const dangling = Object.entries(ID_ALIASES).filter(([, to]) => !getEntry(to))
    expect(dangling).toEqual([])
  })

  it('only retires ids that are really gone', () => {
    const stillThere = Object.keys(ID_ALIASES).filter((from) => getEntry(from))
    expect(stillThere).toEqual([])
  })

  it('never chains, so one pass is enough', () => {
    for (const from of Object.keys(ID_ALIASES)) {
      expect(currentId(currentId(from))).toBe(currentId(from))
    }
  })

  it('leaves an id it does not know alone', () => {
    expect(currentId('w:maa')).toBe('w:maa')
  })
})

describe('aliasItems', () => {
  it('carries a renamed card history across, id field and all', () => {
    const before = applyAttempt(newItemProgress('w:tàang'), { t: t0, ok: true, v: 'exact', m: 'th-en' })
    const after = aliasItems({ 'w:tàang': before })
    expect(after['w:tàang']).toBeUndefined()
    const moved = after['w:taang']!
    expect(moved.id).toBe('w:taang')
    expect(moved.reps).toBe(before.reps)
    expect(moved.history).toEqual(before.history)
  })

  it('replays both into one when the old and new id are both present', () => {
    const old = applyAttempt(newItemProgress('w:tàang'), { t: t0, ok: true, v: 'exact', m: 'th-en' })
    const New = applyAttempt(newItemProgress('w:taang'), { t: t0 + 86_400_000, ok: true, v: 'exact', m: 'en-th' })
    const merged = aliasItems({ 'w:tàang': old, 'w:taang': New })['w:taang']!
    expect(Object.keys(aliasItems({ 'w:tàang': old, 'w:taang': New }))).toEqual(['w:taang'])
    expect(merged.history).toHaveLength(2)
  })

  it('returns the same object when nothing moved', () => {
    const items = { 'w:maa': newItemProgress('w:maa') }
    expect(aliasItems(items)).toBe(items)
  })

  it('aliasItem rewrites the id in place', () => {
    expect(aliasItem(newItemProgress('p:fan jèp')).id).toBe('p:bpùat fan')
  })
})

describe('an export written before the spelling fixes', () => {
  const file: ProgressExport = {
    version: 1,
    app: 'riankeng',
    exportedAt: new Date(t0).toISOString(),
    createdAt: t0,
    updatedAt: t0,
    settings: emptyDoc(t0).settings,
    items: [
      applyAttempt(newItemProgress('w:tàang'), { t: t0, ok: true, v: 'exact', m: 'th-en' }),
      applyAttempt(newItemProgress('w:krùu'), { t: t0, ok: true, v: 'exact', m: 'th-en' }),
    ],
    sessions: [],
  }

  it('reports no unknown ids', () => {
    expect(previewImport(emptyDoc(t0), file).unknown).toBe(0)
  })

  it('merges onto the corrected ids', () => {
    const doc = applyImport(emptyDoc(t0), file, t0)
    expect(doc.items['w:taang']?.reps).toBe(1)
    expect(doc.items['w:kruu']?.reps).toBe(1)
    expect(doc.items['w:tàang']).toBeUndefined()
  })
})
