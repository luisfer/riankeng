/**
 * A continuous copy of the progress file on disk.
 *
 * Pick a file once and the browser hands back a handle we can keep. Every
 * change is written straight to it, so the work lives in a real file the
 * learner owns rather than only inside a browser profile. Put that file in a
 * folder something already syncs, iCloud Drive or Dropbox, and two machines
 * stay together with no server and no account: offline it writes locally, and
 * the folder uploads whenever there is a network again.
 *
 * On open we read the file back and merge it, so a file that travelled from
 * another machine adds its attempts instead of replacing anything. The merge is
 * the same union-and-replay used by import, so it cannot matter which machine
 * wrote last.
 *
 * Chrome and Edge only. Everywhere else `supported()` is false and the manual
 * backup button stays the whole story.
 */
import { get, set, del } from 'idb-keyval'
import type { ProgressExport } from './progress-schema'

const HANDLE_KEY = 'riankeng:mirror-handle:v1'

interface PickerOptions {
  suggestedName?: string
  types?: Array<{ description?: string; accept: Record<string, string[]> }>
}

declare global {
  interface Window {
    showSaveFilePicker?: (options?: PickerOptions) => Promise<FileSystemFileHandle>
  }
  interface FileSystemHandle {
    queryPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>
    requestPermission?: (descriptor?: { mode?: 'read' | 'readwrite' }) => Promise<PermissionState>
  }
}

export type MirrorState = 'unsupported' | 'off' | 'granted' | 'needs-permission'

export function supported(): boolean {
  return typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function'
}

/** The handle picked earlier, if this browser still has it. */
export async function held(): Promise<FileSystemFileHandle | null> {
  if (!supported()) return null
  try {
    return (await get<FileSystemFileHandle>(HANDLE_KEY)) ?? null
  } catch {
    return null
  }
}

/**
 * Whether we may still write. Chrome keeps a granted handle across reloads for
 * an installed app, and otherwise asks again on the next gesture, so
 * `needs-permission` is ordinary rather than an error.
 */
export async function permission(handle: FileSystemFileHandle, request = false): Promise<MirrorState> {
  try {
    const ask = request ? handle.requestPermission : handle.queryPermission
    if (!ask) return 'granted' // no permissions extension: writing will tell us
    const state = await ask.call(handle, { mode: 'readwrite' })
    return state === 'granted' ? 'granted' : 'needs-permission'
  } catch {
    return 'needs-permission'
  }
}

/** Ask for a file and remember it. Must be called from a gesture. */
export async function choose(): Promise<FileSystemFileHandle | null> {
  if (!window.showSaveFilePicker) return null
  try {
    const handle = await window.showSaveFilePicker({
      suggestedName: 'riankeng-progress-v1.json',
      types: [{ description: 'riankeng progress', accept: { 'application/json': ['.json'] } }],
    })
    await set(HANDLE_KEY, handle)
    return handle
  } catch {
    return null // the learner cancelled the picker
  }
}

export async function forget(): Promise<void> {
  try {
    await del(HANDLE_KEY)
  } catch {
    /* nothing held */
  }
}

/** What the file says now, or null if it is empty, missing or not ours. */
export async function read(handle: FileSystemFileHandle): Promise<ProgressExport | null> {
  try {
    const file = await handle.getFile()
    const raw = await file.text()
    if (!raw.trim()) return null
    const parsed = JSON.parse(raw) as ProgressExport
    if (parsed.app !== 'riankeng' || parsed.version !== 1 || !Array.isArray(parsed.items)) return null
    return parsed
  } catch {
    return null
  }
}

export async function write(handle: FileSystemFileHandle, text: string): Promise<boolean> {
  try {
    const stream = await handle.createWritable()
    await stream.write(text)
    await stream.close()
    return true
  } catch {
    return false
  }
}
