const cache = new Map<string, boolean>()

export function clipUrl(id: string): string {
  return `/audio/${encodeURIComponent(id)}.mp3`
}

export function clipCached(id: string): boolean | undefined {
  return cache.get(id)
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
  try {
    const res = await Promise.race([
      fetch(clipUrl(id), { method: 'HEAD' }),
      new Promise<Response>((_, reject) => setTimeout(() => reject(new Error('timeout')), 300)),
    ])
    const ok = clipResponseOk(res)
    cache.set(id, ok)
    return ok
  } catch {
    cache.set(id, false)
    return false
  }
}

export function prefetchClip(id: string): void {
  if (cache.has(id)) return
  void hasClip(id)
}
