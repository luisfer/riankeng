import { get, set } from 'idb-keyval'
import type { LiveSession } from '@/engine/session'
import { DEFAULT_SETTINGS, emptyDoc, type ProgressDoc } from './progress-schema'

const PROGRESS_KEY = 'riankeng:progress:v1'
const SESSION_KEY = 'riankeng:session:v1'
const MIRROR_KEY = 'riankeng:mirror:v1'
const SESSION_MIRROR_KEY = 'riankeng:session-mirror:v1'
const IDB_MS = 400

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | undefined> {
  return Promise.race([p, new Promise<undefined>((resolve) => setTimeout(() => resolve(undefined), ms))])
}

function fromMirror(): ProgressDoc | null {
  try {
    const raw = localStorage.getItem(MIRROR_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as ProgressDoc
    if (parsed.app === 'riankeng' && parsed.version === 1) return parsed
  } catch {
    /* ignore */
  }
  return null
}

function isDoc(value: unknown): value is ProgressDoc {
  if (!value || typeof value !== 'object') return false
  const v = value as ProgressDoc
  return v.app === 'riankeng' && v.version === 1
}

function normalizeDoc(doc: ProgressDoc): ProgressDoc {
  return { ...doc, settings: { ...DEFAULT_SETTINGS, ...doc.settings } }
}

export async function loadDoc(): Promise<ProgressDoc> {
  const stored = await withTimeout(get<ProgressDoc>(PROGRESS_KEY), IDB_MS)
  if (isDoc(stored)) return normalizeDoc(stored)
  const mirrored = fromMirror()
  return mirrored ? normalizeDoc(mirrored) : emptyDoc()
}

export async function saveDoc(doc: ProgressDoc): Promise<void> {
  const next = { ...doc, updatedAt: Date.now() }
  try {
    localStorage.setItem(MIRROR_KEY, JSON.stringify(next))
  } catch {
    /* quota */
  }
  await withTimeout(set(PROGRESS_KEY, next), IDB_MS)
}

export async function loadSession(): Promise<LiveSession | null> {
  const stored = await withTimeout(get<LiveSession>(SESSION_KEY), IDB_MS)
  if (stored) return stored
  try {
    const raw = localStorage.getItem(SESSION_MIRROR_KEY)
    if (raw) return JSON.parse(raw) as LiveSession
  } catch {
    /* ignore */
  }
  return null
}

export async function saveSession(session: LiveSession | null): Promise<void> {
  try {
    if (session) localStorage.setItem(SESSION_MIRROR_KEY, JSON.stringify(session))
    else localStorage.removeItem(SESSION_MIRROR_KEY)
  } catch {
    /* quota */
  }
  await withTimeout(set(SESSION_KEY, session), IDB_MS)
}
