import { sanitizeDoc, type ProgressDoc } from './progress-schema'

/**
 * The learner's work as text, with the clock left out. sanitizeDoc puts every document in one shape,
 * so two copies hold the same cards, sittings and settings exactly when their payloads are equal,
 * wherever each has been, a browser's storage or a database's jsonb.
 */
export function docPayload(doc: ProgressDoc): string {
  const { updatedAt: _stamp, ...rest } = sanitizeDoc(doc)
  return JSON.stringify(rest)
}

/**
 * A short digest of a payload, so what was last sent can be remembered without keeping it. Fifty-three
 * bits and the length: not a security measure, only a way to tell that something changed.
 */
export function fingerprint(payload: string): string {
  let h1 = 0xdeadbeef
  let h2 = 0x41c6ce57
  for (let i = 0; i < payload.length; i++) {
    const ch = payload.charCodeAt(i)
    h1 = Math.imul(h1 ^ ch, 2654435761)
    h2 = Math.imul(h2 ^ ch, 1597334677)
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909)
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909)
  return `${payload.length.toString(36)}.${(4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36)}`
}
