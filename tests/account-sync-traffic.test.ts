import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { applyAttempt, newItemProgress } from '../src/engine/srs'
import { syncAccount } from '../src/storage/account-sync'
import { signInResult } from '../src/storage/auth'
import { setSyncMark, syncMark } from '../src/storage/device'
import { docPayload, fingerprint } from '../src/storage/fingerprint'
import { emptyDoc, sanitizeDoc, type ProgressDoc } from '../src/storage/progress-schema'
import { fakeSupabase, jsonb, type FakeSupabase } from './support/fake-supabase'

const t0 = Date.UTC(2026, 9, 5, 9)
const DAY = 86_400_000

let fake: FakeSupabase
let userId: string

beforeEach(async () => {
  fake = fakeSupabase()
  vi.stubEnv('VITE_SUPABASE_URL', fake.origin)
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', fake.anon)
  vi.stubGlobal('fetch', fake.fetch)
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(t0)
  userId = fake.addUser('a@example.com', 'pw')
  await signInResult('a@example.com', 'pw')
})

afterEach(() => {
  localStorage.clear()
  vi.useRealTimers()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

function answer(doc: ProgressDoc, id: string, t: number): ProgressDoc {
  const prev = doc.items[id] ?? newItemProgress(id)
  return { ...doc, updatedAt: t, items: { ...doc.items, [id]: applyAttempt(prev, { t, ok: true, v: 'exact', m: 'th-en', d: 'device' }) } }
}

const reads = () => fake.requests.filter((r) => r.method === 'GET')
const documentReads = () => reads().filter((r) => r.select?.includes('doc'))
const writes = () => fake.requests.filter((r) => r.method === 'POST')

/** One sync, and the document this browser holds afterwards, as the app takes it. */
async function sync(doc: ProgressDoc) {
  const result = await syncAccount(doc)
  return { result, doc: result.doc ?? doc }
}

describe('a sync moves only what moved', () => {
  it('asks one small question, and nothing else, when neither side has changed', async () => {
    let { doc } = await sync(answer(emptyDoc(t0), 'w:maa', t0))
    fake.requests.length = 0
    const again = await sync(doc)
    expect(again.result).toEqual({ state: 'saved', doc: null })
    expect(fake.requests.map((r) => [r.method, r.select])).toEqual([['GET', 'updated_at']])
    doc = again.doc
  })

  it('sends the document once, and again only when it changes', async () => {
    let { doc } = await sync(answer(emptyDoc(t0), 'w:maa', t0))
    for (let i = 0; i < 3; i++) doc = (await sync(doc)).doc
    expect(writes()).toHaveLength(1)
    vi.setSystemTime(t0 + 60_000)
    doc = (await sync(answer(doc, 'w:kruu', t0 + 60_000))).doc
    expect(writes()).toHaveLength(2)
    expect(fake.progress.get(userId)!.doc).toMatchObject({ items: { 'w:kruu': { reps: 1 }, 'w:maa': { reps: 1 } } })
    fake.requests.length = 0
    await sync(doc)
    expect(writes()).toHaveLength(0)
  })

  it('takes the account\'s document and sends nothing when the account already holds all of it', async () => {
    const first = await sync(answer(emptyDoc(t0), 'w:maa', t0))
    expect(first.result.state).toBe('saved')
    const before = writes().length
    // A new browser: nothing of its own. The account's row, read back from the database, is the whole story.
    localStorage.removeItem('riankeng:sync-mark:v1')
    vi.setSystemTime(t0 + DAY)
    const fresh = await syncAccount(emptyDoc(t0 + DAY))
    expect(fresh.state).toBe('saved')
    expect(fresh.doc?.items['w:maa']?.reps).toBe(1)
    expect(writes()).toHaveLength(before)
    // And now it is a browser that has synced: the next one is one small question.
    fake.requests.length = 0
    await syncAccount(fresh.doc!)
    expect(fake.requests.map((r) => r.select)).toEqual(['updated_at'])
  })

  it('reads the whole document when another device has written, and merges it in', async () => {
    const mine = (await sync(answer(emptyDoc(t0), 'w:maa', t0))).doc
    // Another device writes the account's row.
    const theirs = answer(mine, 'w:kruu', t0 + 1000)
    fake.progress.set(userId, { doc: jsonb({ ...theirs, owner: userId }), updated_at: new Date(t0 + 5000).toISOString() })
    fake.requests.length = 0
    vi.setSystemTime(t0 + 10_000)
    const result = await syncAccount(mine)
    expect(documentReads()).toHaveLength(1)
    expect(result.doc?.items['w:kruu']?.reps).toBe(1)
    expect(result.doc?.items['w:maa']?.reps).toBe(1)
  })

  it('never lets a replaced document overwrite the account', async () => {
    await sync(answer(emptyDoc(t0), 'w:maa', t0))
    vi.setSystemTime(t0 + DAY)
    // "Erase this device": an empty document, no owner, while the sync mark still names the account.
    const erased = emptyDoc(t0 + DAY)
    fake.requests.length = 0
    const result = await syncAccount(erased)
    expect(documentReads()).toHaveLength(1)
    expect(result.doc?.items['w:maa']?.reps).toBe(1)
    expect((fake.progress.get(userId)!.doc as ProgressDoc).items['w:maa']?.reps).toBe(1)
  })

  it('also reads the account when the browser\'s document was rolled back to an older copy', async () => {
    const early = (await sync(answer(emptyDoc(t0), 'w:maa', t0))).doc
    vi.setSystemTime(t0 + 60_000)
    await sync(answer(early, 'w:kruu', t0 + 60_000))
    // The browser comes back with the early copy: the mark names a later one.
    fake.requests.length = 0
    vi.setSystemTime(t0 + 120_000)
    const result = await syncAccount(early)
    expect(documentReads()).toHaveLength(1)
    expect(result.doc?.items['w:kruu']?.reps).toBe(1)
    expect((fake.progress.get(userId)!.doc as ProgressDoc).items['w:kruu']?.reps).toBe(1)
  })

  it('gives each upload a stamp later than the last, even when the clock stands still', async () => {
    let doc = (await sync(answer(emptyDoc(t0), 'w:maa', t0))).doc
    const first = Date.parse(fake.progress.get(userId)!.updated_at)
    doc = (await sync(answer(doc, 'w:kruu', t0))).doc
    const second = Date.parse(fake.progress.get(userId)!.updated_at)
    expect(second).toBeGreaterThan(first)
    expect(doc.items['w:kruu']?.reps).toBe(1)
  })

  it('does the long way when a sync did not finish, and when the mark names another account', async () => {
    const real = fake.fetch
    let failNext = true
    vi.stubGlobal('fetch', async (input: RequestInfo | URL, init?: RequestInit) => {
      if (failNext && (init?.method ?? 'GET') === 'POST' && String(input).includes('/rest/v1/progress')) {
        failNext = false
        return new Response('no', { status: 500 })
      }
      return real(input, init)
    })
    const doc = answer(emptyDoc(t0), 'w:maa', t0)
    const failed = await syncAccount(doc)
    expect(failed.state).toBe('failed')
    expect(syncMark(userId)).toBeNull()
    const retried = await syncAccount(failed.doc ?? doc)
    expect(retried.state).toBe('saved')
    expect(syncMark(userId)).not.toBeNull()
    expect(syncMark('someone-else')).toBeNull()
    setSyncMark(null)
    expect(syncMark(userId)).toBeNull()
  })
})

describe('the same cards are the same text', () => {
  it('whatever order a database returns the keys in', () => {
    // The longer id first, so the order the cards were met in is not the order a database prints them in.
    const doc = answer(answer(emptyDoc(t0), 'w:kruu', t0), 'w:maa', t0 + 1000)
    const stored = JSON.parse(JSON.stringify(jsonb({ ...doc, owner: 'user-1' }))) as ProgressDoc
    expect(Object.keys(stored.items)).not.toEqual(Object.keys(doc.items))
    expect(docPayload(stored)).toBe(docPayload({ ...doc, owner: 'user-1' }))
    expect(fingerprint(docPayload(stored))).toBe(fingerprint(docPayload({ ...doc, owner: 'user-1' })))
  })

  it('and different cards are different text', () => {
    const a = answer(emptyDoc(t0), 'w:maa', t0)
    const b = answer(emptyDoc(t0), 'w:maa', t0 + 1)
    expect(fingerprint(docPayload(a))).not.toBe(fingerprint(docPayload(b)))
  })

  it('puts attempts, sittings and items in one fixed order', () => {
    const doc = answer(emptyDoc(t0), 'w:maa', t0)
    doc.sessions = [{ correct: 1, answered: 2, level: 0, endedAt: 5, startedAt: 3, track: 'voice' }]
    const shuffled = jsonb(doc) as unknown as ProgressDoc
    const clean = sanitizeDoc(shuffled)
    expect(Object.keys(clean.items['w:maa']!.history[0]!)).toEqual(['t', 'ok', 'v', 'm', 'd'])
    expect(Object.keys(clean.sessions[0]!)).toEqual(['startedAt', 'endedAt', 'level', 'track', 'answered', 'correct'])
    expect(Object.keys(clean).slice(0, 4)).toEqual(['version', 'app', 'createdAt', 'updatedAt'])
  })
})
