import { describe, expect, it } from 'vitest'
import { LEVELS, VOICE_REORDER } from '../content/levels'
import { canContinue, startSession, type LiveSession } from '../src/engine/session'
import { applyImport } from '../src/storage/import'
import { emptyDoc, reorderedVoiceFloor, sanitizeDoc, type ProgressDoc, type ProgressExport } from '../src/storage/progress-schema'

describe('the Voice reorder of 26 Sep 2026', () => {
  it('puts Errands after Shopping and Trouble after Health', () => {
    expect(LEVELS[11]!.title).toBe('Shopping')
    expect(LEVELS[12]!.title).toBe('Errands and the city')
    expect(LEVELS[13]!.title).toBe('Feelings and health')
    expect(LEVELS[14]!.title).toBe('Trouble and courtesy')
    expect(LEVELS[27]!.title).toBe('Sayings')
    expect([...VOICE_REORDER].sort((a, b) => a - b)).toEqual(LEVELS.map((l) => l.n))
  })

  it('never closes a level that was open', () => {
    for (let old = 0; old < VOICE_REORDER.length; old++) {
      const floor = reorderedVoiceFloor(old)
      for (let l = 0; l <= old; l++) expect(VOICE_REORDER[l]!, `old floor ${old}, old level ${l}`).toBeLessThanOrEqual(floor)
    }
    expect(reorderedVoiceFloor(11)).toBe(11)
    expect(reorderedVoiceFloor(12)).toBe(13)
    expect(reorderedVoiceFloor(23)).toBe(25)
    expect(reorderedVoiceFloor(24)).toBe(25)
  })

  it('renumbers an old document once, and never again', () => {
    const old = { ...emptyDoc(1), voiceOrder: undefined, opened: { voice: 20, script: 3 }, sessions: [{ startedAt: 1, endedAt: 2, level: 24, answered: 1, correct: 1 }] } as ProgressDoc
    const once = sanitizeDoc(old)
    expect(once.opened).toEqual({ voice: 22, script: 3 })
    expect(once.sessions[0]!.level).toBe(12)
    expect(once.voiceOrder).toBe(2)
    const twice = sanitizeDoc(once)
    expect(twice.opened).toEqual(once.opened)
    expect(twice.sessions[0]!.level).toBe(12)
  })

  it('renumbers a backup file saved before the reorder', () => {
    const file: ProgressExport = { version: 1, app: 'riankeng', exportedAt: '', createdAt: 1, updatedAt: 1, settings: emptyDoc(1).settings, items: [], sessions: [], opened: { voice: 23, script: 0 } }
    expect(applyImport(emptyDoc(1), file, 2).opened?.voice).toBe(25)
    expect(applyImport(emptyDoc(1), { ...file, voiceOrder: 2 }, 2).opened?.voice).toBe(23)
  })

  it('starts a Voice sitting saved before the reorder afresh', () => {
    const doc = emptyDoc(1)
    const fresh = startSession(doc, 1, 0)
    expect(fresh.voiceOrder).toBe(2)
    expect(canContinue(fresh, 'voice', 0)).toBe(true)
    const stale: LiveSession = { ...fresh, voiceOrder: undefined }
    expect(canContinue(stale, 'voice', 0)).toBe(false)
  })
})
