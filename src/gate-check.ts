/**
 * The course can open from the service worker's cache, which never asks the gate, so a
 * browser that logged out would still get in. Online, ask /api/session, and send a browser
 * the gate says is out to sign in. Offline, or when there is no clear answer, stay: the
 * course is meant to open without a network.
 */
export async function leaveIfSignedOut(deps: {
  online: boolean
  fetchImpl: typeof fetch
  go: (url: string) => void
}): Promise<boolean> {
  if (!deps.online) return false
  try {
    const res = await deps.fetchImpl('/api/session', { cache: 'no-store' })
    if (!res.ok) return false
    const body = (await res.json()) as { in?: unknown }
    if (body.in !== false) return false
  } catch {
    return false
  }
  deps.go('/?signin')
  return true
}
