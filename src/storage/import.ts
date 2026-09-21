import { getEntry } from '@content/index'
import { currentId } from '@content/aliases'
import { applyAttempt, newItemProgress, type Attempt, type ItemProgress } from '@/engine/srs'
import { DEFAULT_SETTINGS, emptyDoc, type ProgressDoc, type ProgressExport, type Settings } from './progress-schema'

export interface ImportPreview {
  ok: boolean
  message: string
  incoming: number
  newer: number
  older: number
  unknown: number
}

export function parseExport(raw: string): ProgressExport | null {
  try {
    const data = JSON.parse(raw) as ProgressExport
    if (data.app !== 'riankeng' || data.version !== 1 || !Array.isArray(data.items)) return null
    return data
  } catch {
    return null
  }
}

function attemptKey(h: Attempt): string {
  return `${h.t}:${h.ok ? 1 : 0}:${h.v}:${h.m}`
}

function unionHistory(a: Attempt[], b: Attempt[]): Attempt[] {
  const map = new Map<string, Attempt>()
  for (const h of [...a, ...b]) map.set(attemptKey(h), h)
  return [...map.values()].sort((x, y) => x.t - y.t)
}

function unionDays(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])].sort()
}

/** Replay a merged history, then keep every durable day both sides remember. */
export function mergeItem(have: ItemProgress | undefined, incoming: ItemProgress): ItemProgress {
  const seed = newItemProgress(incoming.id)
  const history = unionHistory(have?.history ?? [], incoming.history)
  let next = seed
  for (const h of history) next = applyAttempt(next, h)
  const stage = Math.max(next.stage, have?.stage ?? 0, incoming.stage)
  const due = Math.max(next.due, have?.due ?? 0, incoming.due)
  return {
    ...next,
    stage,
    due,
    reps: Math.max(next.reps, have?.reps ?? 0, incoming.reps),
    lapses: Math.max(next.lapses, have?.lapses ?? 0, incoming.lapses),
    days: unionDays(unionDays(have?.days ?? [], incoming.days), next.days),
    lastSeen: Math.max(have?.lastSeen ?? 0, incoming.lastSeen, next.lastSeen),
  }
}

/** File one saved item under its current id, when a spelling fix renamed the entry. */
export function aliasItem(item: ItemProgress): ItemProgress {
  const id = currentId(item.id)
  return id === item.id ? item : { ...item, id }
}

/**
 * Rewrite a progress map through the alias table. A renamed card keeps its
 * history; if both ids are present the two are replayed into one.
 */
export function aliasItems(items: Record<string, ItemProgress>): Record<string, ItemProgress> {
  let moved = false
  const out: Record<string, ItemProgress> = {}
  for (const [key, item] of Object.entries(items)) {
    const id = currentId(key)
    if (id !== key) moved = true
    const filed = item.id === id ? item : { ...item, id }
    const have = out[id]
    out[id] = have ? mergeItem(have, filed) : filed
  }
  return moved ? out : items
}

export function presentSettings(incoming: Partial<Settings> | undefined): Partial<Settings> {
  if (!incoming) return {}
  const out: Partial<Settings> = {}
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    if (Object.prototype.hasOwnProperty.call(incoming, key) && incoming[key] !== undefined) {
      ;(out as Record<string, unknown>)[key] = incoming[key]
    }
  }
  return out
}

export function previewImport(doc: ProgressDoc, incoming: ProgressExport): ImportPreview {
  let newer = 0
  let older = 0
  let unknown = 0
  for (const raw of incoming.items) {
    const item = aliasItem(raw)
    if (!getEntry(item.id)) {
      unknown++
      continue
    }
    const have = doc.items[item.id]
    if (!have) {
      newer++
      continue
    }
    const merged = mergeItem(have, item)
    const grew =
      merged.history.length > have.history.length ||
      merged.days.length > have.days.length ||
      merged.reps > have.reps
    if (grew) newer++
    else older++
  }
  return {
    ok: true,
    message: `${incoming.items.length} items in file. ${newer} would merge in, ${older} already covered, ${unknown} unknown ids skipped.`,
    incoming: incoming.items.length,
    newer,
    older,
    unknown,
  }
}

export function applyImport(doc: ProgressDoc, incoming: ProgressExport, now = Date.now()): ProgressDoc {
  const items: Record<string, ItemProgress> = { ...doc.items }
  for (const raw of incoming.items) {
    const item = aliasItem(raw)
    if (!getEntry(item.id)) continue
    items[item.id] = mergeItem(items[item.id], item)
  }
  return {
    ...doc,
    updatedAt: now,
    settings: { ...DEFAULT_SETTINGS, ...doc.settings, ...presentSettings(incoming.settings) },
    items,
    sessions: mergeSessions(doc.sessions, incoming.sessions),
  }
}

function mergeSessions(a: ProgressDoc['sessions'], b: ProgressDoc['sessions']): ProgressDoc['sessions'] {
  const key = (s: ProgressDoc['sessions'][number]) => `${s.startedAt}-${s.track ?? 'voice'}-${s.level}`
  const map = new Map<string, ProgressDoc['sessions'][number]>()
  for (const s of [...a, ...b]) map.set(key(s), s)
  return [...map.values()].sort((x, y) => x.startedAt - y.startedAt).slice(-200)
}

export function resetDoc(now = Date.now()): ProgressDoc {
  return emptyDoc(now)
}
