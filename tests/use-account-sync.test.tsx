import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { SyncResult } from '../src/storage/account-sync'
import type { AccountSession } from '../src/storage/auth'
import { emptyDoc, type ProgressDoc } from '../src/storage/progress-schema'
import { QUIET_SYNC_MS, RETRY_SYNC_MS, SITTING_SYNC_MS, useAccountSync, type AccountSyncSide } from '../src/ui/useAccountSync'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const syncAccount = vi.fn<(doc: ProgressDoc) => Promise<SyncResult>>()
vi.mock('../src/storage/account-sync', () => ({ syncAccount: (doc: ProgressDoc) => syncAccount(doc) }))

const account: AccountSession = { accessToken: 'a.b.c', refreshToken: 'r', expiresAt: Date.now() + 3_600_000, email: 'a@example.com', displayName: '', userId: 'user-1' }
const t0 = Date.UTC(2026, 9, 5, 9)
const docAt = (n: number): ProgressDoc => ({ ...emptyDoc(t0), updatedAt: t0 + n })

type Api = ReturnType<typeof useAccountSync>
let root: Root
let host: HTMLElement
let api: Api
const calls = { signedOut: vi.fn(), foreign: vi.fn(), saved: vi.fn(), adopt: vi.fn() }

function Harness(props: { side: Partial<AccountSyncSide> & { doc: ProgressDoc } }) {
  api = useAccountSync({
    ready: true,
    account,
    inSitting: () => false,
    onSignedOut: calls.signedOut,
    onForeign: calls.foreign,
    onSaved: calls.saved,
    onAdopt: calls.adopt,
    ...props.side,
  })
  return null
}

function show(side: Partial<AccountSyncSide> & { doc: ProgressDoc }) {
  act(() => root.render(<Harness side={side} />))
}

async function wait(ms: number) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
}

const saved = (): SyncResult => ({ state: 'saved', doc: null })

beforeEach(() => {
  vi.useFakeTimers()
  syncAccount.mockReset()
  syncAccount.mockImplementation(async () => saved())
  for (const fn of Object.values(calls)) fn.mockReset()
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.useRealTimers()
  Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
})

describe('useAccountSync', () => {
  it('syncs once, a moment after the cards load', async () => {
    show({ doc: docAt(0) })
    await wait(QUIET_SYNC_MS - 1)
    expect(syncAccount).not.toHaveBeenCalled()
    await wait(1)
    expect(syncAccount).toHaveBeenCalledTimes(1)
    expect(calls.saved).toHaveBeenCalledTimes(1)
    expect(api.state).toBe('saved')
  })

  it('does nothing before the cards are ready or without an account', async () => {
    show({ doc: docAt(0), ready: false })
    show({ doc: docAt(1), account: null })
    await wait(SITTING_SYNC_MS * 2)
    expect(syncAccount).not.toHaveBeenCalled()
  })

  it('sends a sitting once, not once a card', async () => {
    const sitting = { inSitting: () => true }
    show({ doc: docAt(0), ...sitting })
    for (let i = 1; i <= 17; i++) {
      await wait(10_000)
      show({ doc: docAt(i), ...sitting })
    }
    expect(syncAccount).not.toHaveBeenCalled()
    await wait(10_000)
    expect(syncAccount).toHaveBeenCalledTimes(1)
    // It sends the cards as they are by then, not as they were at the first answer.
    expect(syncAccount.mock.calls[0]![0].updatedAt).toBe(t0 + 17)
  })

  it('syncs at once when the sitting ends, and when the tab hides', async () => {
    show({ doc: docAt(0), inSitting: () => true })
    await wait(30_000)
    act(() => api.flush())
    await wait(1)
    expect(syncAccount).toHaveBeenCalledTimes(1)
    show({ doc: docAt(1), inSitting: () => true })
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'))
    })
    await wait(1)
    expect(syncAccount).toHaveBeenCalledTimes(2)
  })

  it('syncs when the network comes back', async () => {
    Object.defineProperty(navigator, 'onLine', { value: false, configurable: true })
    show({ doc: docAt(0) })
    await wait(QUIET_SYNC_MS)
    expect(syncAccount).not.toHaveBeenCalled()
    expect(api.state).toBe('failed')
    Object.defineProperty(navigator, 'onLine', { value: true, configurable: true })
    act(() => {
      window.dispatchEvent(new Event('online'))
    })
    await wait(1)
    expect(syncAccount).toHaveBeenCalledTimes(1)
    expect(api.state).toBe('saved')
  })

  it('drops what comes back when the learner answered meanwhile, and asks again', async () => {
    let finish: (r: SyncResult) => void = () => undefined
    syncAccount.mockImplementationOnce(() => new Promise<SyncResult>((resolve) => (finish = resolve)))
    show({ doc: docAt(0) })
    await wait(QUIET_SYNC_MS)
    expect(syncAccount).toHaveBeenCalledTimes(1)
    show({ doc: docAt(1) }) // an answer while the sync is out
    await act(async () => {
      finish({ state: 'saved', doc: docAt(99) })
    })
    expect(calls.saved).not.toHaveBeenCalled()
    expect(calls.adopt).not.toHaveBeenCalled()
    await wait(QUIET_SYNC_MS)
    expect(syncAccount).toHaveBeenCalledTimes(2)
    expect(syncAccount.mock.calls[1]![0].updatedAt).toBe(t0 + 1)
    expect(calls.saved).toHaveBeenCalledTimes(1)
  })

  it('never runs two syncs at once', async () => {
    let finish: (r: SyncResult) => void = () => undefined
    syncAccount.mockImplementationOnce(() => new Promise<SyncResult>((resolve) => (finish = resolve)))
    show({ doc: docAt(0) })
    await wait(QUIET_SYNC_MS)
    act(() => api.flush())
    await wait(5)
    expect(syncAccount).toHaveBeenCalledTimes(1)
    await act(async () => {
      finish(saved())
    })
    await wait(QUIET_SYNC_MS)
    expect(syncAccount).toHaveBeenCalledTimes(2)
  })

  it('takes a merged document the sync brought, and only when it differs', async () => {
    const brought = { ...docAt(0), settings: { ...docAt(0).settings, name: 'Luis' } }
    syncAccount.mockImplementationOnce(async () => ({ state: 'saved', doc: brought }))
    show({ doc: docAt(0) })
    await wait(QUIET_SYNC_MS)
    expect(calls.adopt).toHaveBeenCalledWith(brought)
    syncAccount.mockImplementationOnce(async () => ({ state: 'saved', doc: docAt(5) }))
    act(() => api.flush())
    await wait(1)
    expect(calls.adopt).toHaveBeenCalledTimes(1)
  })

  it('tries again in a minute after a failed sync', async () => {
    syncAccount.mockImplementationOnce(async () => ({ state: 'failed', doc: null }))
    show({ doc: docAt(0) })
    await wait(QUIET_SYNC_MS)
    expect(api.state).toBe('failed')
    expect(calls.saved).not.toHaveBeenCalled()
    await wait(RETRY_SYNC_MS - 1)
    expect(syncAccount).toHaveBeenCalledTimes(1)
    await wait(1)
    expect(syncAccount).toHaveBeenCalledTimes(2)
    expect(api.state).toBe('saved')
  })

  it('tells the app when the session is gone, and when the cards belong to another account', async () => {
    syncAccount.mockImplementationOnce(async () => ({ state: 'signed-out', doc: null }))
    show({ doc: docAt(0) })
    await wait(QUIET_SYNC_MS)
    expect(calls.signedOut).toHaveBeenCalledTimes(1)
    syncAccount.mockImplementationOnce(async () => ({ state: 'foreign', doc: null, userId: 'user-2' }))
    act(() => api.flush())
    await wait(1)
    expect(calls.foreign).toHaveBeenCalledWith('user-2')
    expect(calls.saved).not.toHaveBeenCalled()
  })

  it('treats a sync that throws as a failed one, and tries again', async () => {
    syncAccount.mockImplementationOnce(async () => {
      throw new Error('boom')
    })
    show({ doc: docAt(0) })
    await wait(QUIET_SYNC_MS)
    expect(api.state).toBe('failed')
    await wait(RETRY_SYNC_MS)
    expect(syncAccount).toHaveBeenCalledTimes(2)
  })
})
