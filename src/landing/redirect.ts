/**
 * Where the landing sends a visit before it paints, or null to stay.
 * Old app URLs carried the route in the hash at /; the course lives at /learn/ now.
 * Installs from before the split start at /, and they mean the course. A bounce back
 * from the gate (?signin) stays, or a home-screen launch without the cookie loops.
 */
export function landingRedirect(hash: string, search: string, standalone: boolean): string | null {
  // A link from an email (a reset or an invite) is finished here, on the landing.
  if (/(^#|&)(access_token|error)=/.test(hash)) return null
  if (hash.startsWith('#/')) return `/learn/${hash}`
  if (standalone && !new URLSearchParams(search).has('signin')) return '/learn/'
  return null
}
