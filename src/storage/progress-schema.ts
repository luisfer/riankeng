import type { TrackId } from '@content/types'
import type { ItemProgress, Modality } from '@/engine/srs'

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
}

export type { ItemProgress, Modality }
