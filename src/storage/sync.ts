/**
 * Sync in the shape the data already has: a bag of attempts.
 *
 * `ItemProgress.history` is append-only and every counter on the item is a fold
 * over it, so exchanging attempts is enough. Union is commutative, associative
 * and idempotent, and `mergeItem` guards each counter with a max, so two
 * devices can go offline for a week and merge in either order with the same
 * result. Nothing that carries the attempts needs to understand the scheduler.
 */
import { getEntry } from '@content/index'
import { currentId } from '@content/aliases'
import { applyAttempt, newItemProgress, type Attempt, type ItemProgress } from '@/engine/srs'
import { mergeItem, unionHistory } from './import'
import type { ProgressDoc, ProgressExport } from './progress-schema'

/** One attempt, and the entry it belongs to. The whole sync payload is these. */
export interface AttemptRow {
  id: string
  a: Attempt
}

/**
 * Merge the work out of an export file, and nothing else.
 *
 * Items rather than bare attempts, because `days` and `reps` outlive the forty
 * attempts a history keeps and could not be rebuilt from a truncated log.
 * Settings are left alone on purpose: a file that arrived from another machine
 * should add answers, not reach over and change how this one behaves.
 */
export function mergeWork(doc: ProgressDoc, file: ProgressExport, now = Date.now()): ProgressDoc {
  const items: Record<string, ItemProgress> = { ...doc.items }
  let touched = false
  for (const raw of file.items) {
    const id = currentId(raw.id)
    if (!getEntry(id)) continue
    items[id] = mergeItem(items[id], raw.id === id ? raw : { ...raw, id })
    touched = true
  }
  return touched ? { ...doc, updatedAt: now, items } : doc
}

/** Every attempt newer than a watermark, oldest first. */
export function attemptsSince(doc: ProgressDoc, t: number): AttemptRow[] {
  const out: AttemptRow[] = []
  for (const p of Object.values(doc.items)) {
    for (const a of p.history) if (a.t > t) out.push({ id: p.id, a })
  }
  return out.sort((x, y) => x.a.t - y.a.t)
}

/** The newest attempt in the document, or 0. Use as the next watermark. */
export function newestAttempt(doc: ProgressDoc): number {
  let t = 0
  for (const p of Object.values(doc.items)) {
    for (const a of p.history) if (a.t > t) t = a.t
  }
  return t
}

/**
 * Fold a bag of attempts into a document. Unknown ids are skipped, retired ids
 * are filed under their replacement, and each item goes through the same
 * union-then-replay as an import, so arrival order cannot change the outcome.
 */
export function mergeAttempts(doc: ProgressDoc, rows: AttemptRow[], now = Date.now()): ProgressDoc {
  if (rows.length === 0) return doc
  const byId = new Map<string, Attempt[]>()
  for (const row of rows) {
    const id = currentId(row.id)
    if (!getEntry(id)) continue
    const held = byId.get(id)
    if (held) held.push(row.a)
    else byId.set(id, [row.a])
  }
  if (byId.size === 0) return doc
  const items: Record<string, ItemProgress> = { ...doc.items }
  for (const [id, attempts] of byId) {
    // A bag of attempts has no stage, days or reps of its own until it is folded.
    // Handing mergeItem a hollow item would let it adopt stage nought and no days
    // for a card this device has never seen, so fold the bag first.
    let incoming = newItemProgress(id)
    for (const a of unionHistory([], attempts)) incoming = applyAttempt(incoming, a)
    items[id] = mergeItem(items[id], incoming)
  }
  return { ...doc, updatedAt: now, items }
}
