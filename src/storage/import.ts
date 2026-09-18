import { getEntry } from '@content/index'
import type { ItemProgress } from '@/engine/srs'
import { DEFAULT_SETTINGS, emptyDoc, type ProgressDoc, type ProgressExport } from './progress-schema'

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

export function previewImport(doc: ProgressDoc, incoming: ProgressExport): ImportPreview {
  let newer = 0
  let older = 0
  let unknown = 0
  for (const item of incoming.items) {
    if (!getEntry(item.id)) {
      unknown++
      continue
    }
    const have = doc.items[item.id]
    if (!have || item.lastSeen >= have.lastSeen) newer++
    else older++
  }
  return {
    ok: true,
    message: `${incoming.items.length} items in file. ${newer} would update, ${older} older kept, ${unknown} unknown ids skipped.`,
    incoming: incoming.items.length,
    newer,
    older,
    unknown,
  }
}

export function applyImport(doc: ProgressDoc, incoming: ProgressExport, now = Date.now()): ProgressDoc {
  const items: Record<string, ItemProgress> = { ...doc.items }
  for (const item of incoming.items) {
    if (!getEntry(item.id)) continue
    const have = items[item.id]
    if (!have || item.lastSeen >= have.lastSeen) items[item.id] = item
  }
  return {
    ...doc,
    updatedAt: now,
    settings: { ...DEFAULT_SETTINGS, ...doc.settings, ...incoming.settings },
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
