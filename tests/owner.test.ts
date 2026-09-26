import { beforeEach, describe, expect, it, vi } from 'vitest'

const store = new Map<string, unknown>()
let failWrites = false
vi.mock('idb-keyval', () => ({
  get: vi.fn(async (key: string) => store.get(key)),
  set: vi.fn(async (key: string, value: unknown) => {
    if (failWrites) throw new Error('quota')
    store.set(key, value)
  }),
  del: vi.fn(async (key: string) => void store.delete(key)),
}))

const { switchOwner, clearStash } = await import('../src/storage/owner')
const { emptyDoc } = await import('../src/storage/progress-schema')
const { applyAttempt, newItemProgress } = await import('../src/engine/srs')

function withCard(owner: string | undefined, id: string) {
  const doc = emptyDoc(Date.UTC(2026, 8, 1))
  const item = applyAttempt(newItemProgress(id), { t: Date.UTC(2026, 8, 2), ok: true, v: 'exact', m: 'th-en', d: 'x' })
  return { ...doc, items: { [id]: item }, ...(owner ? { owner } : {}) }
}

beforeEach(() => {
  store.clear()
  failWrites = false
  localStorage.clear()
})

describe('switchOwner', () => {
  it('keeps each account apart, and gives cards back when their account returns', async () => {
    const a = withCard('user-a', 'w:maa')
    const forB = await switchOwner(a, 'user-b')
    expect(forB?.owner).toBe('user-b')
    expect(Object.keys(forB?.items ?? {})).toEqual([])

    const b = { ...withCard('user-b', 'w:kruu') }
    const forA = await switchOwner(b, 'user-a')
    expect(forA?.owner).toBe('user-a')
    expect(forA?.items['w:maa']?.reps).toBe(1)
    expect(forA?.items['w:kruu']).toBeUndefined()

    const backToB = await switchOwner(forA!, 'user-b')
    expect(backToB?.items['w:kruu']?.reps).toBe(1)
  })

  it('changes nothing when the cards cannot be set aside', async () => {
    failWrites = true
    expect(await switchOwner(withCard('user-a', 'w:maa'), 'user-b')).toBeNull()
  })

  it('erases the cards set aside with the device', async () => {
    await switchOwner(withCard('user-a', 'w:maa'), 'user-b')
    await clearStash()
    const again = await switchOwner(withCard('user-b', 'w:kruu'), 'user-a')
    expect(Object.keys(again?.items ?? {})).toEqual([])
  })
})
