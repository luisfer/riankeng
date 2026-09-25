import manifest from './clip-manifest.json'
import { clipUrl } from './clip-url'

export { clipStem, clipUrl } from './clip-url'

const cache = new Map<string, boolean>()
const shipped = new Set(manifest.ids)

export function clipCached(id: string): boolean | undefined {
  return cache.get(id)
}

export function setClipCached(id: string, ok: boolean): void {
  cache.set(id, ok)
}

export function resetClipCacheForTests(): void {
  cache.clear()
}

/** Try the mp3 unless we already know it is missing. */
export function shouldTryClip(id: string): boolean {
  return clipCached(id) !== false
}

export function hasShippedClip(id: string): boolean {
  return shipped.has(id)
}

/** Vite's SPA fallback returns 200 text/html for missing files. That is not a clip. */
export function clipResponseOk(res: Response): boolean {
  if (!res.ok) return false
  const type = (res.headers.get('content-type') ?? '').toLowerCase()
  return type.startsWith('audio/')
}

export async function hasClip(id: string): Promise<boolean> {
  const hit = cache.get(id)
  if (hit !== undefined) return hit
  // The build ships this clip. Only a real failure to play it may say otherwise.
  if (hasShippedClip(id)) return true
  try {
    const res = await Promise.race([
      fetch(clipUrl(id), { method: 'HEAD' }),
      new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('timeout')), 300)),
    ])
    const ok = clipResponseOk(res)
    cache.set(id, ok)
    return ok
  } catch {
    // A slow or dropped probe says nothing about the file. Leave it unknown, and try again next time.
    return false
  }
}

export function prefetchClip(id: string): void {
  if (cache.has(id)) return
  void hasClip(id)
}
