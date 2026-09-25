/**
 * The account holds the same document the device already keeps.
 * Answers merge. Settings follow whichever copy was written later.
 */
import { getEntry } from '@content/index'
import { currentId } from '@content/aliases'
import { mergeItem } from './import'
import { DEFAULT_SETTINGS, sanitizeDoc, type ProgressDoc, type SessionLog } from './progress-schema'
import { sameDocPayload } from './db'
import { accountConfig, currentAccess, type AccountSession } from './auth'

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
 * Pull, merge, and upload. Returns a document only when this device should adopt it.
 * A failed request leaves the local document alone.
 */
export async function syncAccount(local: ProgressDoc): Promise<ProgressDoc | null> {
  const session = await currentAccess()
  if (!session) return null
  const remote = await fetchRemote(session)
  if (remote.status === 'error') return null
  let merged = withDisplayName(remote.status === 'doc' ? mergeAccount(local, remote.doc) : local, session.displayName)
  const sameLocal = sameDocPayload(merged, local)
  const sameRemote = remote.status === 'doc' && sameDocPayload(merged, remote.doc)
  if (sameLocal && sameRemote) return null
  merged = { ...merged, updatedAt: Date.now() }
  await upsertRemote(session, merged)
  return sameLocal ? null : merged
}
