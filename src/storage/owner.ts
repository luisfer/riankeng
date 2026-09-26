import { del, get, set } from 'idb-keyval'
import { withTimeout, isDoc, normalizeDoc, fromMirror } from './db'
import { emptyDoc, type ProgressDoc } from './progress-schema'

/**
 * Cards set aside on this browser, one document per account, while another account is signed in.
 * A shared iPad keeps each learner's cards apart, and gives them back when that learner signs in.
 */
const STASH_KEY = 'riankeng:stash:v1'
const IDB_MS = 8000

type Stash = Record<string, ProgressDoc>

async function readStash(): Promise<Stash | null> {
  const got = await withTimeout(get<Stash>(STASH_KEY), IDB_MS)
  if (!got.ok) return null
  const out: Stash = {}
  for (const [owner, doc] of Object.entries(got.value ?? {})) if (isDoc(doc)) out[owner] = normalizeDoc(doc)
  return out
}

/**
 * The cards for `userId`, with the current ones put aside under their own owner. Null when the
 * stash cannot be read or written: then nothing changes, and sync stays blocked until it can.
 * Another tab may have switched first; its document is then already the one to use.
 */
export async function switchOwner(current: ProgressDoc, userId: string): Promise<ProgressDoc | null> {
  const run = async (): Promise<ProgressDoc | null> => {
    const live = fromMirror()
    if (live?.owner === userId) return live
    const stash = await readStash()
    if (!stash) return null
    if (current.owner && current.owner !== userId) stash[current.owner] = current
    const next = stash[userId] ?? { ...emptyDoc(), owner: userId }
    delete stash[userId]
    const wrote = await withTimeout(set(STASH_KEY, stash), IDB_MS)
    return wrote.ok ? { ...next, owner: userId } : null
  }
  const locks = typeof navigator !== 'undefined' ? navigator.locks : undefined
  if (locks?.request) return locks.request('riankeng-owner', run)
  return run()
}

/** Erasing this browser erases the cards set aside too. */
export async function clearStash(): Promise<void> {
  await withTimeout(del(STASH_KEY), IDB_MS)
}
