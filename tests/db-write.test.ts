import { afterEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, unknown>()
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => store.get(key)),
  set: vi.fn(async (key: string, value: unknown) => void store.set(key, value)),
}))

const { MIRROR_KEY, loadDoc, resolveLoad, saveDoc } = await import('../src/storage/db')
const { emptyDoc } = await import('../src/storage/progress-schema')

afterEach(() => {
  vi.restoreAllMocks()
  store.clear()
  localStorage.clear()
})

describe('writing progress', () => {
  it('removes the mirror when it cannot be written, so a stale one never wins a later load', async () => {
    const stale = { ...emptyDoc(1), updatedAt: 5 }
    localStorage.setItem(MIRROR_KEY, JSON.stringify(stale))
    const real = localStorage.setItem.bind(localStorage)
    vi.spyOn(localStorage, 'setItem').mockImplementation((key: string, value: string) => {
      if (key === MIRROR_KEY) throw new DOMException('full', 'QuotaExceededError')
      return real(key, value)
    })
    await saveDoc({ ...emptyDoc(1), updatedAt: 9 })
    expect(localStorage.getItem(MIRROR_KEY)).toBeNull()
    const loaded = await loadDoc()
    expect(loaded.status).toBe('ready')
    expect(loaded.doc!.updatedAt).toBeGreaterThan(5)
  })
})

describe('reading progress a newer build wrote', () => {
  const newer = { ...emptyDoc(1), version: 2 }

  it('fails the load instead of reading it as empty, whichever copy holds it', () => {
    expect(resolveLoad({ ok: true, value: newer as never }, null)).toEqual({ status: 'failed', doc: null, newer: true })
    expect(resolveLoad({ ok: true, value: undefined }, null, newer)).toEqual({ status: 'failed', doc: null, newer: true })
    expect(resolveLoad({ ok: true, value: undefined }, null).status).toBe('empty')
  })
})
