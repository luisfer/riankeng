/**
 * The account holds the same document the device already keeps.
 * Answers merge. Settings follow whichever copy was written later.
 */
import { getEntry } from '@content/index'
import { currentId } from '@content/aliases'
import { mergeItem } from './import'
import { DEFAULT_SETTINGS, sanitizeDoc, type ProgressDoc, type SessionLog, type Settings } from './progress-schema'
import { accountConfig, currentAccess, readAccount, type AccountSession } from './auth'
import { setSyncMark, syncMark } from './device'
import { docPayload, fingerprint } from './fingerprint'

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

/**
 * A browser that has answered nothing, sat nothing and changed no setting has nothing to say about
 * settings. A fresh document is stamped with the moment it was made, which is later than anything the
 * account holds, so without this it would win the merge and put the defaults in the account's place.
 */
function untouched(doc: ProgressDoc): boolean {
  if (Object.keys(doc.items ?? {}).length > 0 || (doc.sessions ?? []).length > 0) return false
  const kept = doc.settings as unknown as Record<string, unknown>
  return (Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]).every((key) => kept[key] === DEFAULT_SETTINGS[key])
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
  const settings = remote.updatedAt > local.updatedAt || untouched(local) ? remote.settings : local.settings
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

type RemoteDoc = { status: 'doc'; doc: ProgressDoc; stamp: number | null } | { status: 'missing' } | { status: 'error' }

/** When the account's row was last written, without the row. Forty-odd bytes on the wire. */
type Stamp = { status: 'at'; at: number } | { status: 'missing' } | { status: 'unknown' } | { status: 'error' }

async function fetchStamp(session: AccountSession): Promise<Stamp> {
  const config = accountConfig()
  const headers = await authHeaders(session)
  if (!config || !headers) return { status: 'error' }
  try {
    const res = await fetch(`${config.url}/rest/v1/progress?select=updated_at&user_id=eq.${session.userId}`, { headers })
    if (!res.ok) return { status: 'error' }
    const rows = (await res.json()) as { updated_at?: unknown }[]
    if (!Array.isArray(rows) || rows.length === 0) return { status: 'missing' }
    const at = Date.parse(String(rows[0]?.updated_at ?? ''))
    return Number.isFinite(at) ? { status: 'at', at } : { status: 'unknown' }
  } catch {
    return { status: 'error' }
  }
}

async function fetchRemote(session: AccountSession): Promise<RemoteDoc> {
  const config = accountConfig()
  const headers = await authHeaders(session)
  if (!config || !headers) return { status: 'error' }
  try {
    const res = await fetch(`${config.url}/rest/v1/progress?select=doc,updated_at&user_id=eq.${session.userId}`, { headers })
    if (!res.ok) return { status: 'error' }
    const rows = (await res.json()) as { doc?: unknown; updated_at?: unknown }[]
    const doc = rows[0]?.doc
    if (!doc || typeof doc !== 'object') return { status: 'missing' }
    const parsed = doc as ProgressDoc
    if (parsed.app !== 'riankeng' || parsed.version !== 1) return { status: 'error' }
    const stamp = Date.parse(String(rows[0]?.updated_at ?? ''))
    return { status: 'doc', doc: sanitizeDoc(parsed), stamp: Number.isFinite(stamp) ? stamp : null }
  } catch {
    return { status: 'error' }
  }
}

async function upsertRemote(session: AccountSession, doc: ProgressDoc, stamp: number): Promise<boolean> {
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
        updated_at: new Date(stamp).toISOString(),
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
 * Pull, merge, and upload, only as far as there is something to do. A failed request leaves the local
 * document alone. Cards owned by another account are never merged into this one: the app sets them
 * aside first. Cards with no owner join the first account that syncs them, once, and are its from then on.
 *
 * Three ways through, cheapest first:
 *   Nothing has moved on either side since the last finished sync: ask when the account's row was
 *   last written, find it the same, and stop. No download, no upload.
 *   The account holds everything this browser has, after the merge: take what it had, send nothing.
 *   Otherwise: send the merged document.
 */
export async function syncAccount(local: ProgressDoc): Promise<SyncResult> {
  const session = await currentAccess()
  // No usable session: refused (and so removed), or the refresh did not get through.
  if (!session) return { state: readAccount() ? 'failed' : 'signed-out', doc: null }
  if (local.owner && local.owner !== session.userId) return { state: 'foreign', doc: null, userId: session.userId }

  const mine = local.owner === session.userId ? local : { ...local, owner: session.userId }
  const minePayload = docPayload(mine)
  const mark = syncMark(session.userId)

  if (mark && mark.hash === fingerprint(minePayload)) {
    const stamp = await fetchStamp(session)
    if (stamp.status === 'error') return { state: 'failed', doc: null }
    if (stamp.status === 'at' && stamp.at === mark.stamp) return { state: 'saved', doc: mine === local ? null : mine }
  }

  const remote = await fetchRemote(session)
  if (remote.status === 'error') return { state: 'failed', doc: null }
  let merged = withDisplayName(remote.status === 'doc' ? mergeAccount(mine, remote.doc) : mine, session.displayName)
  merged = { ...merged, owner: session.userId }
  const mergedPayload = docPayload(merged)
  const sameLocal = mine === local ? mergedPayload === minePayload : mergedPayload === docPayload(local)
  const remoteStamp = remote.status === 'doc' ? remote.stamp : null

  // The account already holds all of it. Nothing to send.
  if (remote.status === 'doc' && mergedPayload === docPayload(remote.doc)) {
    if (remoteStamp !== null) setSyncMark({ userId: session.userId, stamp: remoteStamp, hash: fingerprint(mergedPayload) })
    return { state: 'saved', doc: sameLocal ? null : merged }
  }

  // A stamp later than the account's last one, and than any this browser has seen, even if the clock stood still.
  const stamp = Math.max(Date.now(), (remoteStamp ?? 0) + 1, (mark?.stamp ?? 0) + 1)
  merged = { ...merged, updatedAt: stamp }
  const uploaded = await upsertRemote(session, merged, stamp)
  if (uploaded) setSyncMark({ userId: session.userId, stamp, hash: fingerprint(mergedPayload) })
  return { state: uploaded ? 'saved' : 'failed', doc: sameLocal ? null : merged }
}
