/**
 * The account holds the same document the device already keeps.
 * Answers merge. Settings follow whichever copy was written later.
 */
import { getEntry } from '@content/index'
import { currentId } from '@content/aliases'
import { mergeItem } from './import'
import { DEFAULT_SETTINGS, sanitizeDoc, type ProgressDoc, type SessionLog } from './progress-schema'
import { sameDocPayload } from './db'
import { accountConfig, currentAccess, readAccount, type AccountSession } from './auth'

function unionSessions(a: SessionLog[], b: SessionLog[]): SessionLog[] {
  const map = new Map<number, SessionLog>()
  for (const session of [...a, ...b]) {
    if (!Number.isFinite(session.startedAt)) continue
    const prev = map.get(session.startedAt)
    if (!prev || session.endedAt >= prev.endedAt) map.set(session.startedAt, session)
  }
  return [...map.values()].sort((x, y) => x.startedAt - y.startedAt)
}

function openedLevel(doc: ProgressDoc, track: 'voice' | 'script'): number {
  const n = doc.opened?.[track]
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n as number)) : 0
}

/** Remote answers survive a newer local setting, and the reverse. */
export function mergeAccount(local: ProgressDoc, remote: ProgressDoc): ProgressDoc {
  const items = { ...local.items }
  for (const [id, raw] of Object.entries(remote.items ?? {})) {
    const current = currentId(id)
    if (!getEntry(current)) continue
    const incoming = raw.id === current ? raw : { ...raw, id: current }
    items[current] = mergeItem(items[current], incoming)
  }
  const settings = remote.updatedAt > local.updatedAt ? remote.settings : local.settings
  return sanitizeDoc({
    version: 1,
    app: 'riankeng',
    createdAt: Math.min(local.createdAt, remote.createdAt) || local.createdAt || remote.createdAt,
    updatedAt: Math.max(local.updatedAt, remote.updatedAt),
    settings: { ...DEFAULT_SETTINGS, ...settings },
    items,
    sessions: unionSessions(local.sessions ?? [], remote.sessions ?? []),
    opened: {
      voice: Math.max(openedLevel(local, 'voice'), openedLevel(remote, 'voice')),
      script: Math.max(openedLevel(local, 'script'), openedLevel(remote, 'script')),
    },
    // Both sides were read through sanitizeDoc, so both are already in the new order.
    voiceOrder: 2,
    ...(local.owner ? { owner: local.owner } : {}),
  })
}

function withDisplayName(doc: ProgressDoc, displayName: string): ProgressDoc {
  if (doc.settings.name.trim() || !displayName.trim()) return doc
  return { ...doc, settings: { ...doc.settings, name: displayName.trim() } }
}

async function authHeaders(session: AccountSession): Promise<HeadersInit | null> {
  const config = accountConfig()
  if (!config) return null
  return {
    apikey: config.anon,
    Authorization: `Bearer ${session.accessToken}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  }
}

type RemoteDoc = { status: 'doc'; doc: ProgressDoc } | { status: 'missing' } | { status: 'error' }

async function fetchRemote(session: AccountSession): Promise<RemoteDoc> {
  const config = accountConfig()
  const headers = await authHeaders(session)
  if (!config || !headers) return { status: 'error' }
  try {
    const res = await fetch(`${config.url}/rest/v1/progress?select=doc&user_id=eq.${session.userId}`, { headers })
    if (!res.ok) return { status: 'error' }
    const rows = (await res.json()) as { doc?: unknown }[]
    const doc = rows[0]?.doc
    if (!doc || typeof doc !== 'object') return { status: 'missing' }
    const parsed = doc as ProgressDoc
    if (parsed.app !== 'riankeng' || parsed.version !== 1) return { status: 'error' }
    return { status: 'doc', doc: sanitizeDoc(parsed) }
  } catch {
    return { status: 'error' }
  }
}

async function upsertRemote(session: AccountSession, doc: ProgressDoc): Promise<boolean> {
  const config = accountConfig()
  const headers = await authHeaders(session)
  if (!config || !headers) return false
  try {
    const res = await fetch(`${config.url}/rest/v1/progress?on_conflict=user_id`, {
      method: 'POST',
      headers: { ...headers, Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        user_id: session.userId,
        doc,
        updated_at: new Date(doc.updatedAt).toISOString(),
      }),
    })
    return res.ok
  } catch {
    return false
  }
}

/**
 * saved: the account holds everything this browser has. failed: it may not, try again later.
 * signed-out: the session was refused and is gone. foreign: these cards belong to another account.
 */
export type SyncState = 'saved' | 'failed' | 'signed-out' | 'foreign'

export interface SyncResult {
  state: SyncState
  /** A document this browser should adopt, when the merge brought something new. */
  doc: ProgressDoc | null
  /** The account now signed in, for a foreign result. */
  userId?: string
}

/**
 * Pull, merge, and upload. A failed request leaves the local document alone.
 * Cards owned by another account are never merged into this one: the app sets them aside first.
 * Cards with no owner join the first account that syncs them, once, and are its from then on.
 */
export async function syncAccount(local: ProgressDoc): Promise<SyncResult> {
  const session = await currentAccess()
  // No usable session: refused (and so removed), or the refresh did not get through.
  if (!session) return { state: readAccount() ? 'failed' : 'signed-out', doc: null }
  if (local.owner && local.owner !== session.userId) return { state: 'foreign', doc: null, userId: session.userId }
  const remote = await fetchRemote(session)
  if (remote.status === 'error') return { state: 'failed', doc: null }
  let merged = withDisplayName(remote.status === 'doc' ? mergeAccount(local, remote.doc) : local, session.displayName)
  merged = { ...merged, owner: session.userId }
  const sameLocal = sameDocPayload(merged, local)
  const sameRemote = remote.status === 'doc' && sameDocPayload(merged, remote.doc)
  if (sameLocal && sameRemote) return { state: 'saved', doc: null }
  merged = { ...merged, updatedAt: Date.now() }
  const uploaded = await upsertRemote(session, merged)
  return { state: uploaded ? 'saved' : 'failed', doc: sameLocal ? null : merged }
}
