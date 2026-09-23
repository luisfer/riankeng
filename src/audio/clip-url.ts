/**
 * Where a recorded clip lives, with no manifest attached. The landing page and
 * the gate import this file; the app imports clips.ts, which re-exports it.
 */

/** Slash is a path and # is a URL fragment. Both become underscores on disk. */
export function clipStem(id: string): string {
  return id.replaceAll('/', '_').replaceAll('#', '_')
}

export function clipUrl(id: string): string {
  return `/audio/${encodeURI(clipStem(id))}.mp3`
}
