import { describe, expect, it } from 'vitest'
import { applyAttempt, isMastered, newItemProgress, type Attempt } from '../src/engine/srs'
import { attemptsSince, mergeAttempts, mergeWork, newestAttempt, type AttemptRow } from '../src/storage/sync'
import { emptyDoc, type ProgressDoc } from '../src/storage/progress-schema'
import { newDeviceId } from '../src/storage/device'

const t0 = Date.UTC(2026, 8, 1, 9)
const DAY = 86_400_000

/** Answer a card on a device, the way a sitting does. */
function answer(doc: ProgressDoc, id: string, t: number, ok: boolean, d: string): ProgressDoc {
  const prev = doc.items[id] ?? newItemProgress(id)
  const a: Attempt = { t, ok, v: ok ? 'exact' : 'wrong', m: 'th-en', d }
  return { ...doc, items: { ...doc.items, [id]: applyAttempt(prev, a) } }
}

/** What we actually care about surviving a merge. */
function derived(doc: ProgressDoc) {
  return Object.values(doc.items)
    .map((p) => ({ id: p.id, stage: p.stage, days: [...p.days].sort(), mastered: isMastered(p) }))
    .sort((a, b) => a.id.localeCompare(b.id))
}

describe('attemptsSince', () => {
  it('returns only what is newer than the watermark, oldest first', () => {
    let doc = emptyDoc(t0)
    doc = answer(doc, 'w:maa', t0, true, 'aaa')
    doc = answer(doc, 'w:maa', t0 + 2 * DAY, true, 'aaa')
    doc = answer(doc, 'w:taang', t0 + DAY, true, 'aaa')
    expect(attemptsSince(doc, 0).map((r) => r.a.t)).toEqual([t0, t0 + DAY, t0 + 2 * DAY])
    expect(attemptsSince(doc, t0).map((r) => r.a.t)).toEqual([t0 + DAY, t0 + 2 * DAY])
    expect(attemptsSince(doc, t0 + 2 * DAY)).toEqual([])
    expect(newestAttempt(doc)).toBe(t0 + 2 * DAY)
  })

  it('is 0 on a document with no work in it', () => {
    expect(newestAttempt(emptyDoc(t0))).toBe(0)
  })
})

describe('two devices that were both offline', () => {
  /** A common past, then a week apart, then they meet. */
  function scenario() {
    let base = emptyDoc(t0)
    base = answer(base, 'w:maa', t0, true, 'aaa')

    let laptop = base
    laptop = answer(laptop, 'w:maa', t0 + DAY, true, 'aaa')
    laptop = answer(laptop, 'w:taang', t0 + DAY, true, 'aaa')
    laptop = answer(laptop, 'w:maa', t0 + 2 * DAY, true, 'aaa')

    let phone = base
    phone = answer(phone, 'w:kruu', t0 + 3 * DAY, true, 'bbb')
    phone = answer(phone, 'w:maa', t0 + 3 * DAY, false, 'bbb')

    return { laptop, phone }
  }

  it('converge on the same state whichever way the attempts travel', () => {
    const { laptop, phone } = scenario()
    const onLaptop = mergeAttempts(laptop, attemptsSince(phone, 0), t0 + 9 * DAY)
    const onPhone = mergeAttempts(phone, attemptsSince(laptop, 0), t0 + 9 * DAY)
    expect(derived(onLaptop)).toEqual(derived(onPhone))
  })

  it('keeps both answers when two devices answer in the same millisecond', () => {
    let a = emptyDoc(t0)
    a = answer(a, 'w:maa', t0 + DAY, true, 'aaa')
    let b = emptyDoc(t0)
    b = answer(b, 'w:maa', t0 + DAY, true, 'bbb')
    const merged = mergeAttempts(a, attemptsSince(b, 0), t0 + 2 * DAY)
    expect(merged.items['w:maa']!.history).toHaveLength(2)
    expect(merged.items['w:maa']!.history.map((h) => h.d).sort()).toEqual(['aaa', 'bbb'])
  })

  it('merging the same attempts again changes nothing', () => {
    const { laptop, phone } = scenario()
    const rows = attemptsSince(phone, 0)
    const once = mergeAttempts(laptop, rows, t0 + 9 * DAY)
    const twice = mergeAttempts(once, rows, t0 + 10 * DAY)
    expect(derived(twice)).toEqual(derived(once))
    expect(twice.items['w:maa']!.history).toEqual(once.items['w:maa']!.history)
  })

  /**
   * The invariant that matters, and the one the whole design rests on: a merge
   * must land exactly where a single device would have landed had it seen every
   * attempt itself, in time order. Convergence follows from it, and so does the
   * absence of invented regressions.
   */
  it('lands where one device would have, seeing every attempt in time order', () => {
    const script: Array<{ id: string; t: number; ok: boolean }> = [
      { id: 'w:maa', t: t0, ok: true },
      { id: 'w:taang', t: t0 + DAY, ok: true },
      { id: 'w:maa', t: t0 + DAY + 1, ok: true },
      { id: 'w:kruu', t: t0 + 2 * DAY, ok: false },
      { id: 'w:maa', t: t0 + 3 * DAY, ok: true },
      { id: 'w:taang', t: t0 + 4 * DAY, ok: false },
      { id: 'w:kruu', t: t0 + 5 * DAY, ok: true },
      { id: 'w:maa', t: t0 + 6 * DAY, ok: true },
    ]

    let solo = emptyDoc(t0)
    for (const s of script) solo = answer(solo, s.id, s.t, s.ok, 'solo')

    // The same work, split across two devices that never saw each other.
    let odd = emptyDoc(t0)
    let even = emptyDoc(t0)
    script.forEach((s, i) => {
      if (i % 2 === 0) even = answer(even, s.id, s.t, s.ok, 'eee')
      else odd = answer(odd, s.id, s.t, s.ok, 'ooo')
    })

    const onEven = mergeAttempts(even, attemptsSince(odd, 0), t0 + 9 * DAY)
    const onOdd = mergeAttempts(odd, attemptsSince(even, 0), t0 + 9 * DAY)
    expect(derived(onEven)).toEqual(derived(solo))
    expect(derived(onOdd)).toEqual(derived(solo))
  })

  it('counts a later miss from another device, the way one device would', () => {
    let mine = emptyDoc(t0)
    for (const t of [t0, t0 + DAY, t0 + 2 * DAY, t0 + 3 * DAY]) mine = answer(mine, 'w:maa', t, true, 'aaa')
    expect(isMastered(mine.items['w:maa']!)).toBe(true)

    const sour: AttemptRow[] = [{ id: 'w:maa', a: { t: t0 + 4 * DAY, ok: false, v: 'wrong', m: 'th-en', d: 'bbb' } }]
    const after = mergeAttempts(mine, sour, t0 + 5 * DAY)

    // Not a regression the merge invented: it is what the miss means.
    let solo = mine
    solo = answer(solo, 'w:maa', t0 + 4 * DAY, false, 'aaa')
    expect(after.items['w:maa']!.stage).toBe(solo.items['w:maa']!.stage)
    expect(after.items['w:maa']!.days).toEqual(solo.items['w:maa']!.days)
  })

  it('does not lose mastery to a miss that predates the run', () => {
    let mine = emptyDoc(t0)
    for (const t of [t0, t0 + DAY, t0 + 2 * DAY, t0 + 3 * DAY]) mine = answer(mine, 'w:maa', t, true, 'aaa')
    const old: AttemptRow[] = [{ id: 'w:maa', a: { t: t0 - DAY, ok: false, v: 'wrong', m: 'th-en', d: 'bbb' } }]
    const after = mergeAttempts(mine, old, t0 + 5 * DAY)
    expect(isMastered(after.items['w:maa']!)).toBe(true)
  })

  it('takes nothing on an empty exchange, and returns the same object', () => {
    const { laptop } = scenario()
    expect(mergeAttempts(laptop, [], t0)).toBe(laptop)
  })
})

describe('mergeAttempts guards the catalogue', () => {
  it('skips an id that is not in the course', () => {
    const doc = emptyDoc(t0)
    const rows: AttemptRow[] = [{ id: 'w:not-a-word', a: { t: t0, ok: true, v: 'exact', m: 'th-en', d: 'aaa' } }]
    expect(mergeAttempts(doc, rows, t0)).toBe(doc)
  })

  it('files a retired id under the spelling that replaced it', () => {
    const doc = emptyDoc(t0)
    const rows: AttemptRow[] = [{ id: 'w:krùu', a: { t: t0, ok: true, v: 'exact', m: 'th-en', d: 'aaa' } }]
    const after = mergeAttempts(doc, rows, t0)
    expect(after.items['w:kruu']?.reps).toBe(1)
    expect(after.items['w:krùu']).toBeUndefined()
  })
})

describe('newDeviceId', () => {
  it('is eight hex characters and does not repeat', () => {
    const ids = new Set(Array.from({ length: 200 }, () => newDeviceId()))
    expect(ids.size).toBe(200)
    for (const id of ids) expect(id).toMatch(/^[0-9a-f]{8}$/)
  })
})

describe('mergeWork, which is what reading the mirror file does', () => {
  function fileFrom(doc: ProgressDoc) {
    return {
      version: 1 as const,
      app: 'riankeng' as const,
      exportedAt: new Date(t0).toISOString(),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      settings: { ...doc.settings, silent: true, theme: 'dark' as const },
      items: Object.values(doc.items),
      sessions: [],
    }
  }

  it('adds the work and leaves this device its own settings', () => {
    let theirs = emptyDoc(t0)
    theirs = answer(theirs, 'w:taang', t0 + DAY, true, 'bbb')

    const mine = emptyDoc(t0)
    expect(mine.settings.silent).toBe(false)
    const after = mergeWork(mine, fileFrom(theirs), t0 + 2 * DAY)

    expect(after.items['w:taang']?.reps).toBe(1)
    expect(after.settings.silent).toBe(false)
    expect(after.settings.theme).toBe('light')
  })

  it('keeps days that a capped history could no longer prove', () => {
    // Forty one answers: the oldest falls out of the history window, but the
    // day it happened on is durable and must survive the merge.
    let theirs = emptyDoc(t0)
    for (let i = 0; i < 41; i++) theirs = answer(theirs, 'w:maa', t0 + i * DAY, true, 'bbb')
    const item = theirs.items['w:maa']!
    expect(item.history).toHaveLength(40)
    expect(item.days.length).toBe(41)

    const after = mergeWork(emptyDoc(t0), fileFrom(theirs), t0 + 50 * DAY)
    expect(after.items['w:maa']!.days.length).toBe(41)
    expect(after.items['w:maa']!.reps).toBe(41)
    expect(isMastered(after.items['w:maa']!)).toBe(true)
  })

  it('files a retired id under its replacement', () => {
    let theirs = emptyDoc(t0)
    theirs = answer(theirs, 'w:krùu', t0, true, 'bbb')
    const after = mergeWork(emptyDoc(t0), fileFrom(theirs), t0 + DAY)
    expect(after.items['w:kruu']?.reps).toBe(1)
    expect(after.items['w:krùu']).toBeUndefined()
  })

  it('returns the same object when the file carries nothing usable', () => {
    const mine = emptyDoc(t0)
    const empty = { ...fileFrom(mine), items: [] }
    expect(mergeWork(mine, empty, t0)).toBe(mine)
  })

  it('converges: reading the file twice is reading it once', () => {
    let theirs = emptyDoc(t0)
    theirs = answer(theirs, 'w:maa', t0, true, 'bbb')
    theirs = answer(theirs, 'w:maa', t0 + DAY, false, 'bbb')
    const file = fileFrom(theirs)
    const once = mergeWork(emptyDoc(t0), file, t0 + 2 * DAY)
    const twice = mergeWork(once, file, t0 + 3 * DAY)
    expect(derived(twice)).toEqual(derived(once))
  })
})

describe('a card whose history has outgrown the forty-attempt cap', () => {
  /** Climbs to six, then lives between four and six: a band a fresh seed never reaches. */
  function stubborn(): ProgressDoc {
    let doc = emptyDoc(t0)
    let i = 0
    const push = (ok: boolean) => {
      doc = answer(doc, 'w:maa', t0 + i++ * DAY, ok, 'aaa')
    }
    for (let k = 0; k < 6; k++) push(true)
    for (let r = 0; r < 14; r++) {
      push(false)
      push(true)
      push(true)
    }
    return doc
  }

  function fileOf(doc: ProgressDoc) {
    return {
      version: 1 as const,
      app: 'riankeng' as const,
      exportedAt: new Date(t0).toISOString(),
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      settings: doc.settings,
      items: Object.values(doc.items),
      sessions: [],
    }
  }

  it('is the case the cap cannot replay: mastered at six, forty of forty eight attempts kept', () => {
    const p = stubborn().items['w:maa']!
    expect(p.stage).toBe(6)
    expect(p.reps).toBe(48)
    expect(p.history).toHaveLength(40)
    expect(isMastered(p)).toBe(true)
  })

  it('reading back your own file does not move it', () => {
    const doc = stubborn()
    const before = doc.items['w:maa']!
    const after = mergeWork(doc, fileOf(doc), t0 + 60 * DAY).items['w:maa']!
    expect(after.stage).toBe(before.stage)
    expect(after.due).toBe(before.due)
    expect(isMastered(after)).toBe(true)
  })

  it('restoring it onto a machine that has never seen it keeps it exactly', () => {
    const doc = stubborn()
    const before = doc.items['w:maa']!
    const after = mergeWork(emptyDoc(t0), fileOf(doc), t0 + 60 * DAY).items['w:maa']!
    expect(after.stage).toBe(before.stage)
    expect(after.due).toBe(before.due)
    expect(after.reps).toBe(48)
    expect(isMastered(after)).toBe(true)
  })

  it('carries on exactly when the other machine only adds later answers', () => {
    const laptop = stubborn()
    const later = t0 + 100 * DAY
    let phone = emptyDoc(t0)
    phone = answer(phone, 'w:maa', later, false, 'bbb')
    phone = answer(phone, 'w:maa', later + DAY, true, 'bbb')

    const merged = mergeAttempts(laptop, attemptsSince(phone, 0), later + 2 * DAY).items['w:maa']!
    let expected = laptop
    expected = answer(expected, 'w:maa', later, false, 'bbb')
    expected = answer(expected, 'w:maa', later + DAY, true, 'bbb')
    expect(merged.stage).toBe(expected.items['w:maa']!.stage)
    expect(merged.due).toBe(expected.items['w:maa']!.due)
  })

  it('never moves any card when you read back your own file, over many shapes of history', () => {
    let seed = 7
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648
    for (let trial = 0; trial < 400; trial++) {
      let doc = emptyDoc(t0)
      const n = 20 + Math.floor(rnd() * 60)
      for (let i = 0; i < n; i++) doc = answer(doc, 'w:maa', t0 + i * 3_600_000, rnd() < 0.7, 'aaa')
      const before = doc.items['w:maa']!
      const after = mergeWork(doc, fileOf(doc), t0).items['w:maa']!
      expect(after.stage, `trial ${trial}, ${n} answers`).toBe(before.stage)
      expect(after.due, `trial ${trial}, ${n} answers`).toBe(before.due)
    }
  })
})
