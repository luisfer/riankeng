import { useEffect, useRef, useState } from 'react'
import { syncAccount, type SyncState } from '@/storage/account-sync'
import type { AccountSession } from '@/storage/auth'
import { sameDocPayload } from '@/storage/db'
import type { ProgressDoc } from '@/storage/progress-schema'
import { SyncScheduler } from '@/storage/sync-schedule'

/** After a change outside a sitting, a settings change or a level opened: a moment, so a few changes go together. */
export const QUIET_SYNC_MS = 1_500
/** During a sitting, only as a safety net. The sitting's end, or the tab hiding, syncs at once. */
export const SITTING_SYNC_MS = 180_000
/** After a sync that did not get through. */
export const RETRY_SYNC_MS = 60_000

export interface AccountSyncSide {
  /** The cards have loaded and may be sent. */
  ready: boolean
  account: AccountSession | null
  doc: ProgressDoc
  /** Is a sitting open now. */
  inSitting: () => boolean
  onSignedOut: () => void
  /** These cards belong to another account than the one signed in. */
  onForeign: (userId: string) => void
  /** The account held everything at this moment. */
  onSaved: (at: number) => void
  /** The merge brought something this browser should take. */
  onAdopt: (doc: ProgressDoc) => void
}

/**
 * Keeps the cards and the account together without moving the whole document on every answer. A
 * change asks for a sync soon; during a sitting that is a safety net a few minutes off, and the
 * sitting's end, the tab hiding, the network coming back or a failed try ask for one at once. One
 * sync runs at a time. If the learner answers while one runs, what it brings back is about a
 * document already out of date, so it is dropped and another is asked for.
 */
export function useAccountSync(side: AccountSyncSide): {
  state: SyncState | 'idle'
  setState: (state: SyncState | 'idle') => void
  /** Sync now, or after `afterMs`, or as soon as the one running is done. */
  flush: (afterMs?: number) => void
} {
  const [state, setState] = useState<SyncState | 'idle'>('idle')
  const latest = useRef(side)
  latest.current = side
  const docRef = useRef(side.doc)
  docRef.current = side.doc
  const alive = useRef(false)
  const busy = useRef(false)
  const askedWhileBusy = useRef(false)
  const runRef = useRef<() => void>(() => undefined)
  const scheduler = useRef<SyncScheduler | null>(null)
  if (!scheduler.current) scheduler.current = new SyncScheduler(() => runRef.current())
  const ask = (ms: number) => scheduler.current!.request(ms)

  runRef.current = () => {
    const now = latest.current
    if (!alive.current || !now.ready || !now.account) return
    if (busy.current) {
      askedWhileBusy.current = true
      return
    }
    // Offline there is no one to sync with. The network coming back tries again.
    if (typeof navigator !== 'undefined' && navigator.onLine === false) {
      setState('failed')
      return
    }
    const started = docRef.current
    busy.current = true
    syncAccount(started)
      .then((result) => {
        busy.current = false
        if (!alive.current) return
        const again = askedWhileBusy.current
        askedWhileBusy.current = false
        // The learner went on while this ran, or signed out: it answers about something that has moved.
        if (docRef.current !== started || !latest.current.account) {
          ask(QUIET_SYNC_MS)
          return
        }
        setState(result.state)
        if (result.state === 'signed-out') {
          latest.current.onSignedOut()
          return
        }
        if (result.state === 'foreign') {
          if (result.userId) latest.current.onForeign(result.userId)
          return
        }
        if (result.state === 'saved') latest.current.onSaved(Date.now())
        else ask(RETRY_SYNC_MS)
        const next = result.doc
        if (next && !sameDocPayload(next, docRef.current)) latest.current.onAdopt(next)
        if (again) ask(QUIET_SYNC_MS)
      })
      .catch(() => {
        busy.current = false
        if (!alive.current) return
        setState('failed')
        ask(RETRY_SYNC_MS)
      })
  }

  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
      scheduler.current?.cancel()
    }
  }, [])

  // A change to the cards asks for a sync, soon, or during a sitting not for a while.
  useEffect(() => {
    if (!side.ready || !side.account) return
    ask(latest.current.inSitting() ? SITTING_SYNC_MS : QUIET_SYNC_MS)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [side.doc, side.ready, side.account])

  // The network coming back, or the tab coming or going: a sync that has nothing to do costs 48 bytes.
  useEffect(() => {
    const now = () => ask(0)
    window.addEventListener('online', now)
    document.addEventListener('visibilitychange', now)
    return () => {
      window.removeEventListener('online', now)
      document.removeEventListener('visibilitychange', now)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { state, setState, flush: (afterMs = 0) => ask(afterMs) }
}
