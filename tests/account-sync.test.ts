import { afterEach, describe, expect, it, vi } from 'vitest'
import { applyAttempt, newItemProgress, type Attempt } from '../src/engine/srs'
import { mergeAccount, syncAccount } from '../src/storage/account-sync'
import { exportJson } from '../src/storage/export'
import { applyImport, parseExport } from '../src/storage/import'
import { emptyDoc, type ProgressDoc } from '../src/storage/progress-schema'

const t0 = Date.UTC(2026, 8, 1, 9)
const DAY = 86_400_000

function answer(doc: ProgressDoc, id: string, t: number): ProgressDoc {
  const prev = doc.items[id] ?? newItemProgress(id)
  const attempt: Attempt = { t, ok: true, v: 'exact', m: 'th-en', d: 'device' }
  return { ...doc, items: { ...doc.items, [id]: applyAttempt(prev, attempt) } }
}

describe('mergeAccount', () => {
  it('keeps a remote answer when the local setting is newer', () => {
    let local = emptyDoc(t0)
    local = { ...local, updatedAt: t0 + 2 * DAY, settings: { ...local.settings, name: 'Luis', silent: false } }
    let remote = answer(emptyDoc(t0), 'w:maa', t0 + DAY)
    remote = {
      ...remote,
      updatedAt: t0 + DAY,
      settings: { ...remote.settings, name: 'Other', silent: true },
      opened: { voice: 1, script: 0 },
    }
    const merged = mergeAccount(local, remote)
    expect(merged.items['w:maa']!.reps).toBe(1)
    expect(merged.settings.name).toBe('Luis')
    expect(merged.settings.silent).toBe(false)
    expect(merged.opened).toEqual({ voice: 1, script: 0 })
  })

  it('keeps a local answer when the remote setting is newer', () => {
    let local = answer(emptyDoc(t0), 'w:maa', t0 + DAY)
    local = { ...local, updatedAt: t0 + DAY, opened: { voice: 0, script: 2 } }
    let remote = emptyDoc(t0)
    remote = {
      ...remote,
      updatedAt: t0 + 2 * DAY,
      settings: { ...remote.settings, name: 'Luis', silent: true },
      sessions: [{ startedAt: t0, endedAt: t0 + 1000, level: 0, answered: 1, correct: 1 }],
    }
    const merged = mergeAccount(local, remote)
    expect(merged.items['w:maa']!.reps).toBe(1)
    expect(merged.settings.name).toBe('Luis')
    expect(merged.settings.silent).toBe(true)
    expect(merged.opened).toEqual({ voice: 0, script: 2 })
    expect(merged.sessions).toHaveLength(1)
  })

  it('keeps a remote answer when this browser is empty and newer', () => {
    const local = { ...emptyDoc(t0), updatedAt: t0 + 2 * DAY }
    let remote = answer(emptyDoc(t0), 'w:maa', t0 + DAY)
    remote = { ...remote, updatedAt: t0 + DAY, opened: { voice: 1, script: 0 } }
    const merged = mergeAccount(local, remote)
    expect(merged.items['w:maa']!.reps).toBe(1)
    expect(merged.opened).toEqual({ voice: 1, script: 0 })
  })

  it('keeps one sitting when both copies started together', () => {
    const sitting = (endedAt: number, answered: number) => ({
      startedAt: t0,
      endedAt,
      level: 0,
      answered,
      correct: 1,
    })
    const local = { ...emptyDoc(t0), sessions: [sitting(t0 + 1000, 1)] }
    const remote = { ...emptyDoc(t0), updatedAt: t0 + DAY, sessions: [sitting(t0 + 5000, 3)] }
    const merged = mergeAccount(local, remote)
    expect(merged.sessions).toHaveLength(1)
    expect(merged.sessions[0]!.endedAt).toBe(t0 + 5000)
    expect(merged.sessions[0]!.answered).toBe(3)
  })
})

describe('export and import', () => {
  it('keeps the card, the name, and the opened level', () => {
    let doc = answer(emptyDoc(t0), 'w:maa', t0)
    doc = {
      ...doc,
      settings: { ...doc.settings, name: 'Luis' },
      opened: { voice: 1, script: 0 },
    }
    const parsed = parseExport(exportJson(doc, t0))
    expect(parsed?.settings.name).toBe('Luis')
    expect(parsed?.items.find((item) => item.id === 'w:maa')?.reps).toBe(1)
    expect(parsed?.opened).toEqual({ voice: 1, script: 0 })
  })

  it('keeps answers from the file and from the account', () => {
    const local = answer(emptyDoc(t0), 'w:maa', t0)
    const file = parseExport(exportJson(answer({ ...emptyDoc(t0), opened: { voice: 2, script: 0 } }, 'w:kruu', t0 + DAY), t0))
    expect(file).not.toBeNull()
    const imported = applyImport(local, file!, t0 + DAY)
    const remote = answer(emptyDoc(t0), 'w:taang', t0 + 2 * DAY)
    const merged = mergeAccount(imported, remote)
    expect(merged.items['w:maa']!.reps).toBeGreaterThan(0)
    expect(merged.items['w:kruu']!.reps).toBeGreaterThan(0)
    expect(merged.items['w:taang']!.reps).toBeGreaterThan(0)
    expect(merged.opened?.voice).toBe(2)
  })
})

describe('syncAccount', () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('uploads nothing when the read fails', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    localStorage.setItem(
      'riankeng:account',
      JSON.stringify({
        accessToken: 'a.b.c',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 60 * 60 * 1000,
        email: 'luis@example.com',
        displayName: 'Luis',
        userId: 'user-1',
      }),
    )
    const fetchMock = vi.fn(async (_input: RequestInfo, init?: RequestInit) => {
      const method = init?.method ?? 'GET'
      if (method === 'GET') return new Response('no', { status: 500 })
      return new Response('no', { status: 500 })
    })
    vi.stubGlobal('fetch', fetchMock)
    const result = await syncAccount(answer(emptyDoc(t0), 'w:maa', t0))
    expect(result).toEqual({ state: 'failed', doc: null })
    expect(fetchMock.mock.calls.some((call) => (call[1]?.method ?? 'GET') === 'POST')).toBe(false)
  })
})

describe('syncAccount and who owns the cards', () => {
  const signIn = (over: Record<string, unknown> = {}) => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')
    localStorage.setItem(
      'riankeng:account',
      JSON.stringify({
        accessToken: 'a.b.c',
        refreshToken: 'refresh',
        expiresAt: Date.now() + 60 * 60 * 1000,
        email: 'b@example.com',
        displayName: '',
        userId: 'user-1',
        ...over,
      }),
    )
  }

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    localStorage.clear()
  })

  it('never reads or writes the account with cards another account owns', async () => {
    signIn()
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const theirs = { ...answer(emptyDoc(t0), 'w:maa', t0), owner: 'user-2' }
    expect(await syncAccount(theirs)).toEqual({ state: 'foreign', doc: null, userId: 'user-1' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('lets this browser own cards join the first account once, and marks them its', async () => {
    signIn()
    const posted: unknown[] = []
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo, init?: RequestInit) => {
      if ((init?.method ?? 'GET') === 'GET') return new Response('[]', { status: 200 })
      posted.push(JSON.parse(String(init?.body)))
      return new Response(null, { status: 201 })
    }))
    const result = await syncAccount(answer(emptyDoc(t0), 'w:maa', t0))
    expect(result.state).toBe('saved')
    expect(result.doc?.owner).toBe('user-1')
    expect(result.doc?.items['w:maa']?.reps).toBe(1)
    expect((posted[0] as { doc: { owner?: string } }).doc.owner).toBe('user-1')
  })

  it('reports a failed upload, so the app tries again', async () => {
    signIn()
    vi.stubGlobal('fetch', vi.fn(async (_input: RequestInfo, init?: RequestInit) =>
      (init?.method ?? 'GET') === 'GET' ? new Response('[]', { status: 200 }) : new Response('no', { status: 500 }),
    ))
    const result = await syncAccount({ ...answer(emptyDoc(t0), 'w:maa', t0), owner: 'user-1' })
    expect(result.state).toBe('failed')
  })

  it('tells a refused session from one that could not reach the server', async () => {
    signIn({ expiresAt: Date.now() - 1000 })
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{"error":"invalid_grant"}', { status: 400 })))
    expect((await syncAccount(emptyDoc(t0))).state).toBe('signed-out')
    expect(localStorage.getItem('riankeng:account')).toBeNull()

    signIn({ expiresAt: Date.now() - 1000 })
    vi.stubGlobal('fetch', vi.fn(async () => {
      throw new TypeError('offline')
    }))
    expect((await syncAccount(emptyDoc(t0))).state).toBe('failed')
    expect(localStorage.getItem('riankeng:account')).not.toBeNull()
  })
})
