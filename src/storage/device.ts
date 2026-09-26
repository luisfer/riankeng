/**
 * Identity and sync position belong to the device, not to the progress
 * document. Keeping them out of the document means importing someone else's
 * file cannot make this browser answer to their id or their watermark.
 */

const DEVICE_KEY = 'riankeng:device:v1'
const SYNCED_KEY = 'riankeng:synced:v1'
const MIRROR_KEY = 'riankeng:mirror-written:v1'

export function newDeviceId(): string {
  const c: Crypto | undefined = globalThis.crypto
  if (c && typeof c.randomUUID === 'function') return c.randomUUID().replaceAll('-', '').slice(0, 8)
  return Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0')
}

/** Stable for the life of this browser profile. Minted once, on first ask. */
export function deviceId(): string {
  try {
    const held = localStorage.getItem(DEVICE_KEY)
    if (held) return held
    const made = newDeviceId()
    localStorage.setItem(DEVICE_KEY, made)
    return made
  } catch {
    // Private window, or storage refused. A per-load id still dedupes correctly
    // inside this load; it only costs us dedup across reloads.
    return newDeviceId()
  }
}

/** The newest attempt timestamp this device has already handed off. */
export function syncedAt(): number {
  try {
    return Number(localStorage.getItem(SYNCED_KEY) ?? 0) || 0
  } catch {
    return 0
  }
}

/** When the on-disk mirror was last written by this device. */
export function mirrorWrittenAt(): number {
  try {
    return Number(localStorage.getItem(MIRROR_KEY) ?? 0) || 0
  } catch {
    return 0
  }
}

export function setMirrorWrittenAt(t: number): void {
  try {
    localStorage.setItem(MIRROR_KEY, String(t))
  } catch {
    /* as above: an optimisation, not a source of truth */
  }
}

export function setSyncedAt(t: number): void {
  try {
    localStorage.setItem(SYNCED_KEY, String(t))
  } catch {
    /* nothing to do: the watermark is an optimisation, not a source of truth */
  }
}

const ACCOUNT_SAVED_KEY = 'riankeng:account-saved:v1'

/** When this browser last saw the account hold everything it had. 0: never, or not since a switch. */
export function accountSavedAt(): number {
  try {
    return Number(localStorage.getItem(ACCOUNT_SAVED_KEY) ?? 0) || 0
  } catch {
    return 0
  }
}

export function setAccountSavedAt(t: number): void {
  try {
    if (t) localStorage.setItem(ACCOUNT_SAVED_KEY, String(t))
    else localStorage.removeItem(ACCOUNT_SAVED_KEY)
  } catch {
    /* the line on the Account page falls back to "not saved yet" */
  }
}
