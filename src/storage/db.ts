import { get, set } from 'idb-keyval'
import type { LiveSession } from '@/engine/session'
import { DEFAULT_SETTINGS, emptyDoc, type ProgressDoc } from './progress-schema'
import { aliasItems } from './import'

const PROGRESS_KEY = 'riankeng:progress:v1'
const SESSION_KEY = 'riankeng:session:v1'
export const MIRROR_KEY = 'riankeng:mirror:v1'
const SESSION_MIRROR_KEY = 'riankeng:session-mirror:v1'
export const TAB_CHANNEL = 'riankeng-progress'
const IDB_MS = 8000

export type Timed<T> = { ok: true; value: T } | { ok: false; reason: 'timeout' }

export function withTimeout<T>(p: Promise<T>, ms: number): Promise<Timed<T>> {
  return new Promise((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      resolve({ ok: false, reason: 'timeout' })
    }, ms)
    p.then((value) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({ ok: true, value })
    }).catch(() => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve({ ok: false, reason: 'timeout' })
    })
  })
}

export function fromMirror(): ProgressDoc | null {
  try {
    const raw = localStorage.getItem(MIRROR_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ProgressDoc
    if (isDoc(parsed)) return normalizeDoc(parsed)
  } catch {
    /* ignore */
  }
  return null
}

export function isDoc(value: unknown): value is ProgressDoc {
  if (!value || typeof value !== 'object') return false
  const v = value as ProgressDoc
  return v.app === 'riankeng' && v.version === 1
}

function normalizeDoc(doc: ProgressDoc): ProgressDoc {
  return { ...doc, settings: { ...DEFAULT_SETTINGS, ...doc.settings }, items: aliasItems(doc.items ?? {}) }
}

export type LoadDocResult =
  | { status: 'ready'; doc: ProgressDoc }
  | { status: 'empty'; doc: ProgressDoc }
  | { status: 'timeout'; doc: ProgressDoc | null }
  | { status: 'failed'; doc: ProgressDoc | null }

/** Timeout is never treated as an empty document. */
export function resolveLoad(idb: Timed<ProgressDoc | undefined>, mirror: ProgressDoc | null): LoadDocResult {
  if (!idb.ok) return { status: 'timeout', doc: mirror }
  if (isDoc(idb.value)) return { status: 'ready', doc: normalizeDoc(idb.value) }
  if (mirror) return { status: 'ready', doc: mirror }
  return { status: 'empty', doc: emptyDoc() }
}

export async function loadDoc(): Promise<LoadDocResult> {
  const idb = await withTimeout(get<ProgressDoc>(PROGRESS_KEY), IDB_MS)
  return resolveLoad(idb, fromMirror())
}

type WriteTask = { kind: 'doc'; doc: ProgressDoc } | { kind: 'session'; session: LiveSession | null }

let writeTail: Promise<void> = Promise.resolve()
let latestDoc: ProgressDoc | null = null
let latestSession: LiveSession | null | undefined
let docGen = 0
let sessionGen = 0

function enqueue(task: WriteTask): Promise<void> {
  if (task.kind === 'doc') {
    latestDoc = task.doc
    const gen = ++docGen
    writeTail = writeTail.then(async () => {
      if (gen !== docGen || !latestDoc) return
      await writeDoc(latestDoc)
    })
  } else {
    latestSession = task.session
    const gen = ++sessionGen
    writeTail = writeTail.then(async () => {
      if (gen !== sessionGen) return
      await writeSession(latestSession ?? null)
    })
  }
  return writeTail.catch(() => undefined)
}

async function writeDoc(doc: ProgressDoc): Promise<void> {
  const next = { ...doc, updatedAt: Date.now() }
  try {
    localStorage.setItem(MIRROR_KEY, JSON.stringify(next))
  } catch {
    /* quota */
  }
  announceDoc(next)
  const idb = await withTimeout(set(PROGRESS_KEY, next), IDB_MS)
  if (!idb.ok) return
}

async function writeSession(session: LiveSession | null): Promise<void> {
  try {
    if (session) localStorage.setItem(SESSION_MIRROR_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_MIRROR_KEY)
  } catch {
    /* quota */
  }
  await withTimeout(set(SESSION_KEY, session), IDB_MS)
}

export async function saveDoc(doc: ProgressDoc): Promise<void> {
  await enqueue({ kind: 'doc', doc })
}

export async function loadSession(): Promise<LiveSession | null> {
  const stored = await withTimeout(get<LiveSession>(SESSION_KEY), IDB_MS)
  if (stored.ok && stored.value) return stored.value
  if (!stored.ok) {
    try {
      const raw = localStorage.getItem(SESSION_MIRROR_KEY)
      if (raw) return JSON.parse(raw) as LiveSession
    } catch {
      /* ignore */
    }
    return null
  }
  try {
    const raw = localStorage.getItem(SESSION_MIRROR_KEY)
    if (raw) return JSON.parse(raw) as LiveSession
  } catch {
    /* ignore */
  }
  return null
}

export async function saveSession(session: LiveSession | null): Promise<void> {
  await enqueue({ kind: 'session', session })
}

export function announceDoc(doc: ProgressDoc): void {
  try {
    const ch = new BroadcastChannel(TAB_CHANNEL)
    ch.postMessage({ type: 'doc', updatedAt: doc.updatedAt })
    ch.close()
  } catch {
    /* unsupported */
  }
}

export function sameDocPayload(a: ProgressDoc, b: ProgressDoc): boolean {
  const strip = (d: ProgressDoc) => {
    const { updatedAt: _u, ...rest } = d
    return JSON.stringify(rest)
  }
  return strip(a) === strip(b)
}
