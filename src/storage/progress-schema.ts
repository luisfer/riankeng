import { VOICE_REORDER } from '@content/levels'
import type { TrackId } from '@content/types'
import type { Attempt, ItemProgress, Modality } from '@/engine/srs'

export const PROGRESS_VERSION = 1 as const

export interface Settings {
  /** Show Thai script beside the romanization. Off in Journey 1 by default. */
  thaiScript: boolean
  /** speechSynthesis rate, 0.5–1.2 */
  audioRate: number
  /** Play audio automatically when a card appears. */
  autoplay: boolean
  /** No sound at all: no listening exercises, no autoplay, no Hear. For a plane. */
  silent: boolean
  /** New items introduced per session. */
  newPerSession: number
  /** Learner's display name (used in the app and in exports). */
  name: string
  /** Stored leftover. The course has one look; this is never applied. */
  theme: 'light' | 'dark' | 'system'
  /**
   * When the learner last wrote a backup file, epoch ms, 0 for never. State
   * rather than preference, but it lives here because settings are the part of
   * the document that already round-trips through export and import.
   */
  lastBackupAt: number
}

export const DEFAULT_SETTINGS: Settings = {
  thaiScript: false,
  audioRate: 0.85,
  autoplay: true,
  silent: false,
  newPerSession: 8,
  name: '',
  theme: 'light',
  lastBackupAt: 0,
}

export interface SessionLog {
  startedAt: number
  endedAt: number
  level: number
  track?: TrackId
  answered: number
  correct: number
}

export interface ProgressDoc {
  version: typeof PROGRESS_VERSION
  app: 'riankeng'
  createdAt: number
  updatedAt: number
  settings: Settings
  items: Record<string, ItemProgress>
  sessions: SessionLog[]
  /** Highest level that has opened on each track. A miss cannot lower this. */
  opened?: { voice: number; script: number }
  /** 2 once Voice level numbers follow the order of 26 Sep 2026, Errands and Trouble early. */
  voiceOrder?: 2
  /**
   * The account these cards belong to, once one has synced them. A document with no owner is this
   * browser's own, and joins the first account that signs in. Never written to an export file.
   */
  owner?: string
}

/**
 * A Voice floor saved under the old order, in the new one. Every level that was open stays
 * open: the floor becomes the highest new place of any level at or below the old floor.
 */
export function reorderedVoiceFloor(old: number): number {
  if (old >= VOICE_REORDER.length) return old
  let floor = 0
  for (let l = 0; l <= old; l++) floor = Math.max(floor, VOICE_REORDER[l]!)
  return floor
}

/** A Voice sitting in the log, renumbered. Script sittings keep their level. */
export function reorderedSession(s: SessionLog): SessionLog {
  if ((s.track ?? 'voice') !== 'voice' || !Number.isInteger(s.level) || s.level < 0 || s.level >= VOICE_REORDER.length) return s
  return { ...s, level: VOICE_REORDER[s.level]! }
}

function isIsoDay(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
}

export function sanitizeItem(raw: unknown, fallbackId: string): ItemProgress | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Partial<ItemProgress>
  const id = typeof r.id === 'string' && r.id ? r.id : fallbackId
  const stage = Number.isFinite(r.stage) ? Math.max(0, Math.min(6, Math.trunc(r.stage as number))) : 0
  const due = Number.isFinite(r.due) ? Number(r.due) : 0
  const reps = Number.isFinite(r.reps) ? Math.max(0, Math.trunc(r.reps as number)) : 0
  const lapses = Number.isFinite(r.lapses) ? Math.max(0, Math.trunc(r.lapses as number)) : 0
  const lastSeen = Number.isFinite(r.lastSeen) ? Number(r.lastSeen) : 0
  const days = Array.isArray(r.days) ? r.days.filter(isIsoDay) : []
  const history = Array.isArray(r.history)
    ? r.history.filter((h): h is Attempt => {
        if (!h || typeof h !== 'object') return false
        return typeof h.t === 'number' && typeof h.ok === 'boolean' && typeof h.v === 'string' && typeof h.m === 'string'
      })
    : []
  return { id, stage, due, reps, lapses, lastSeen, days, history }
}

export function sanitizeDoc(doc: ProgressDoc): ProgressDoc {
  const items: Record<string, ItemProgress> = {}
  for (const [id, raw] of Object.entries(doc.items ?? {})) {
    const item = sanitizeItem(raw, id)
    if (item) items[item.id] = item
  }
  const opened = doc.opened
  const voice = Number.isFinite(opened?.voice) ? Math.max(0, Math.trunc(opened!.voice)) : 0
  const sessions = Array.isArray(doc.sessions) ? doc.sessions : []
  // A document from before the reorder is renumbered once, and marked so it never is again.
  const reordered = doc.voiceOrder === 2
  return {
    ...doc,
    settings: { ...DEFAULT_SETTINGS, ...doc.settings },
    items,
    sessions: reordered ? sessions : sessions.map(reorderedSession),
    opened: {
      voice: reordered ? voice : reorderedVoiceFloor(voice),
      script: Number.isFinite(opened?.script) ? Math.max(0, Math.trunc(opened!.script)) : 0,
    },
    voiceOrder: 2,
  }
}

export function emptyDoc(now = Date.now()): ProgressDoc {
  return {
    version: PROGRESS_VERSION,
    app: 'riankeng',
    createdAt: now,
    updatedAt: now,
    settings: { ...DEFAULT_SETTINGS },
    items: {},
    sessions: [],
    voiceOrder: 2,
  }
}

/** Stamp memory so another tab cannot clobber with an older updatedAt. */
export function stampDoc(doc: ProgressDoc, now = Date.now()): ProgressDoc {
  return { ...doc, updatedAt: now }
}

/**
 * A hand-written JSON Schema (draft 2020-12) for the export file. Kept in the
 * repo so other tools can validate riankeng-progress-v1.json files.
 */
export const PROGRESS_JSON_SCHEMA = {
  $schema: 'https://json-schema.org/draft/2020-12/schema',
  $id: 'https://riankeng.app/schema/progress-v1.json',
  title: 'riankeng progress export v1',
  type: 'object',
  required: ['version', 'app', 'exportedAt', 'settings', 'items', 'sessions'],
  properties: {
    version: { const: 1 },
    app: { const: 'riankeng' },
    exportedAt: { type: 'string', format: 'date-time' },
    createdAt: { type: 'integer' },
    updatedAt: { type: 'integer' },
    settings: {
      type: 'object',
      properties: {
        thaiScript: { type: 'boolean' },
        audioRate: { type: 'number' },
        autoplay: { type: 'boolean' },
        silent: { type: 'boolean' },
        newPerSession: { type: 'integer' },
        name: { type: 'string' },
        theme: { type: 'string', enum: ['light', 'dark', 'system'] },
        lastBackupAt: { type: 'integer' },
      },
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        required: ['id', 'stage', 'due', 'reps', 'lapses', 'lastSeen', 'days', 'history'],
        properties: {
          id: { type: 'string' },
          stage: { type: 'integer', minimum: 0, maximum: 6 },
          due: { type: 'integer' },
          reps: { type: 'integer' },
          lapses: { type: 'integer' },
          lastSeen: { type: 'integer' },
          days: { type: 'array', items: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' } },
          history: {
            type: 'array',
            items: {
              type: 'object',
              required: ['t', 'ok', 'v', 'm'],
              properties: {
                t: { type: 'integer' },
                ok: { type: 'boolean' },
                v: { type: 'string' },
                m: { type: 'string', enum: ['listen', 'en-th', 'th-en', 'tone', 'pick'] },
                d: { type: 'string' },
                p: { type: 'integer', enum: [1] },
              },
            },
          },
        },
      },
    },
    sessions: {
      type: 'array',
      items: {
        type: 'object',
        required: ['startedAt', 'endedAt', 'level', 'answered', 'correct'],
        properties: {
          startedAt: { type: 'integer' },
          endedAt: { type: 'integer' },
          level: { type: 'integer' },
          track: { type: 'string', enum: ['voice', 'script'] },
          answered: { type: 'integer' },
          correct: { type: 'integer' },
        },
      },
    },
  },
} as const

/** The on-disk export shape: items as an array, plus exportedAt. */
export interface ProgressExport {
  version: 1
  app: 'riankeng'
  exportedAt: string
  createdAt: number
  updatedAt: number
  settings: Settings
  items: ItemProgress[]
  sessions: SessionLog[]
  opened?: { voice: number; script: number }
  voiceOrder?: 2
}

export type { ItemProgress, Modality }
