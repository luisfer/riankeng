/** Where the preview stands, and the words answered right. Kept on this browser only. */
export const PROGRESS_KEY = 'riankeng.preview.v1'

export interface PreviewProgress {
  /** The card on screen, 0-based. */
  at: number
  /** Ids answered right, in catalog order. */
  done: string[]
}

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function browserStore(): Store | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

/** Saved progress for these ids. Unknown ids drop out and the card index stays in range. */
export function loadProgress(ids: readonly string[], store: Store | null = browserStore()): PreviewProgress {
  const empty: PreviewProgress = { at: 0, done: [] }
  try {
    const raw = store?.getItem(PROGRESS_KEY)
    if (!raw) return empty
    const data = JSON.parse(raw) as { at?: unknown; done?: unknown }
    const saved = new Set(Array.isArray(data.done) ? data.done : [])
    const done = ids.filter((id) => saved.has(id))
    const last = Math.max(ids.length - 1, 0)
    const at = typeof data.at === 'number' && Number.isInteger(data.at) ? Math.min(Math.max(data.at, 0), last) : 0
    return { at, done }
  } catch {
    return empty
  }
}

export function saveProgress(progress: PreviewProgress, store: Store | null = browserStore()): void {
  try {
    store?.setItem(PROGRESS_KEY, JSON.stringify(progress))
  } catch {
    return
  }
}

export function clearProgress(store: Store | null = browserStore()): void {
  try {
    store?.removeItem(PROGRESS_KEY)
  } catch {
    return
  }
}
