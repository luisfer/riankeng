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

/**
 * What makes two attempts the same attempt. The device is part of it: two
 * devices can honestly answer the same card in the same millisecond and neither
 * should swallow the other. Attempts written before devices had ids carry no
 * `d` and keep their old key, so an older export still dedupes against itself.
 */
function attemptKey(h: Attempt): string {
  return `${h.t}:${h.ok ? 1 : 0}:${h.v}:${h.m}${h.d ? `:${h.d}` : ''}`
}

/** Every distinct attempt from both sides, oldest first. */
export function unionHistory(a: Attempt[], b: Attempt[]): Attempt[] {
  const map = new Map<string, Attempt>()
  for (const h of [...a, ...b]) map.set(attemptKey(h), h)
  return [...map.values()].sort((x, y) => x.t - y.t)
}

function unionDays(a: string[], b: string[]): string[] {
  return [...new Set([...a, ...b])].sort()
}

/**
 * Merge what two copies know about one card.
 *
 * A history keeps only its last forty attempts, but `stage` is folded over every
 * attempt ever made, so a card's stage cannot always be rebuilt from the history
 * it still carries: a card that climbed to six and then lived between four and
 * six will replay from a fresh seed into the band between nought and two, and
 * never climb back. So replay is the last resort, not the first move. There are
 * four cases, and three of them have an exact answer that loses nothing:
 *
 * 1. This side has never seen the card. Take the other copy whole, as it was
 *    folded. Restoring a file onto a new machine is this case.
 * 2. The other copy adds no attempt this side lacks. Keep this side's stage.
 *    Reading back your own file on open is this case, and it must be a no-op.
 * 3. Everything the other copy adds happened after everything this side knows.
 *    Carry on from where this side already is, exactly as if the attempts had
 *    been answered here. Laptop then phone is this case.
 * 4. The two copies interleave in time, because both machines were used over
 *    the same stretch offline. Only here do we replay the union from a seed.
 *    Both machines replay the same union and so still agree; the result can
 *    only be approximate for a card whose history has already been capped.
 *
 * `stage` and `due` are never taken as a max: a miss lowers them, and a max over
 * a value that can fall would make the answer depend on which machine merged.
 * `reps`, `lapses`, `lastSeen` and `days` only ever grow, so they keep a max or
 * union guard in every case, because a capped history can undercount them.
 */
export function mergeItem(have: ItemProgress | undefined, incoming: ItemProgress): ItemProgress {
  if (!have) return { ...incoming, days: [...incoming.days] }

  const known = new Set(have.history.map(attemptKey))
  const fresh = unionHistory([], incoming.history).filter((h) => !known.has(attemptKey(h)))

  const guarded = (base: ItemProgress): ItemProgress => ({
    ...base,
    reps: Math.max(base.reps, have.reps, incoming.reps),
    lapses: Math.max(base.lapses, have.lapses, incoming.lapses),
    days: unionDays(unionDays(have.days, incoming.days), base.days),
    lastSeen: Math.max(have.lastSeen, incoming.lastSeen, base.lastSeen),
  })

  if (fresh.length === 0) return guarded(have)

  const newestKnown = have.history.reduce((t, h) => Math.max(t, h.t), -Infinity)
  if (fresh.every((h) => h.t > newestKnown)) {
    let next = have
    for (const h of fresh) next = applyAttempt(next, h)
    return guarded(next)
  }

  let next = newItemProgress(incoming.id)
  for (const h of unionHistory(have.history, incoming.history)) next = applyAttempt(next, h)
  return guarded(next)
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
