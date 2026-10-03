/**
 * IndexedDB for the simulation: idb-keyval's three calls over a Map. Values are cloned on the way in
 * and out, as a real database clones them, so a document the app still holds cannot change what was
 * stored, and a stored one cannot change what the app holds.
 */
const store = new Map<string, unknown>()

export const idbStore = store

export async function get<T = unknown>(key: string): Promise<T | undefined> {
  const value = store.get(key)
  return value === undefined ? undefined : (structuredClone(value) as T)
}

export async function set(key: string, value: unknown): Promise<void> {
  store.set(key, structuredClone(value))
}

export async function del(key: string): Promise<void> {
  store.delete(key)
}

/** A browser profile erased: new device, empty storage. */
export function wipeIdb(): void {
  store.clear()
}

/** What this browser's IndexedDB holds, to put back when the test goes back to this device. */
export function snapshotIdb(): Map<string, unknown> {
  return new Map([...store].map(([k, v]) => [k, structuredClone(v)]))
}

export function restoreIdb(snapshot: Map<string, unknown>): void {
  store.clear()
  for (const [k, v] of snapshot) store.set(k, structuredClone(v))
}
