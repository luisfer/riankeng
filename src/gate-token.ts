import { clipUrl } from './audio/clip-url.js'
import { DEMO_IDS } from './landing/demo.js'

export const GATE_COOKIE = 'rk_gate'

export async function gateToken(secret: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(secret))
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function readCookie(header: string | null, name: string): string | null {
  if (!header) return null
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=')
    if (k === name) return rest.join('=')
  }
  return null
}

/**
 * What the gate does with one request.
 * pass: public, serve it as it is. shell: signed in, serve it with the shell header.
 * redirect: send the visitor to the landing page to sign in.
 */
export type GateDecision = { kind: 'pass' } | { kind: 'shell' } | { kind: 'redirect'; to: '/?signin' | '/?signin=unset' }

/** The clips the landing page plays. Public, whoever asks. */
const PUBLIC_CLIPS = new Set(DEMO_IDS.map((id) => decode(clipUrl(id))))

function decode(pathname: string): string {
  try {
    return decodeURI(pathname)
  } catch {
    return pathname
  }
}

export function isGated(pathname: string): boolean {
  return pathname === '/learn' || pathname.startsWith('/learn/') || pathname.startsWith('/audio/')
}

/**
 * The course and its audio sit behind the password. Everything else, and the
 * demo clips, are public. Without a secret the gate is open locally and shut
 * on Vercel, where an unset password is a mistake worth showing.
 */
export async function decideGate(
  pathname: string,
  cookieHeader: string | null,
  secret: string | undefined,
  onVercel: boolean,
): Promise<GateDecision> {
  if (!isGated(pathname)) return { kind: 'pass' }
  if (PUBLIC_CLIPS.has(decode(pathname))) return { kind: 'pass' }
  if (!secret) return onVercel ? { kind: 'redirect', to: '/?signin=unset' } : { kind: 'shell' }
  const got = readCookie(cookieHeader, GATE_COOKIE)
  if (got && got === (await gateToken(secret))) return { kind: 'shell' }
  return { kind: 'redirect', to: '/?signin' }
}
