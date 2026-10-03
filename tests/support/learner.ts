/**
 * A learner who does the whole course the way the screens let them: visits morning, afternoon and
 * evening, sits the level they are on, meets each new card before it is tested, answers through the
 * real graders, is held to a retype after a typed miss, and ends each sitting with a line in the log.
 *
 * The course's own functions do the work, called in the order the sitting screen (src/ui/Session.tsx)
 * and the app (src/ui/App.tsx) call them: applyMeet, applyAttempt, stampOpened, markScored,
 * markCorrect, requeueCurrent, afterHold. Only the typing is stood in for, by choosing what a
 * learner who knew the card would have typed, and, for some first tries, what one who did not would.
 * Time is the test's clock: Date.now() is faked, so every stamp the course writes agrees with it.
 */
import { vi } from 'vitest'
import { entriesForLevel, entryTrack } from '@content/index'
import { TONES, TONE_LABEL, type Tone } from '@content/system'
import type { Entry, TrackId } from '@content/types'
import { canHearThai } from '@/audio/tts'
import { cleanGloss, gradeEnglish } from '@/engine/grader-en'
import { gradeThai } from '@/engine/grader-thai'
import { analyseRom, expandAlternatives } from '@/engine/normalize'
import {
  SESSION_SIZE,
  afterHold,
  afterMeet,
  currentItem,
  isFinished,
  markCorrect,
  markMissMove,
  markMissStay,
  markScored,
  requeueCurrent,
  sittingModality,
  startReviewSession,
  startSession,
  type Hold,
  type LiveSession,
  type QueueItem,
} from '@/engine/session'
import {
  allLevelStatus,
  currentLevel,
  entryOrThrow,
  hash,
  pairRoms,
  pickChoices,
  reviewDue,
  reviewEntries,
  stampOpened,
  withOpened,
} from '@/engine/scheduler'
import { applyAttempt, applyMeet, isMastered, newItemProgress } from '@/engine/srs'
import { judgeTonePick } from '@/engine/tone-step'
import { enThTarget, twinAnswer } from '@/engine/twins'
import { syncAccount, type SyncResult } from '@/storage/account-sync'
import { readAccount } from '@/storage/auth'
import { loadDoc, saveDoc, sameDocPayload } from '@/storage/db'
import { deviceId } from '@/storage/device'
import { switchOwner } from '@/storage/owner'
import { stampDoc, type ProgressDoc } from '@/storage/progress-schema'
import { pairMiss } from '@/ui/Session'

export interface Scope {
  /** How many levels of each track, from the first, the learner finishes. */
  voice: number
  script: number
}

export interface LearnerOptions {
  scope: Scope
  maxDays?: number
  /**
   * When the learner syncs: after every sitting, as the app does, or at the end of every n-th day,
   * which is quicker to simulate and moves the same work.
   */
  syncEvery?: number | 'sitting'
  /** Measure the document at the end of each sitting, to say what syncing after every card would have moved. */
  trackSize?: boolean
  /** Share of cards missed on their very first test. */
  missRate?: number
  /** Share of those missed again when the sitting brings them back at once. */
  missTwiceRate?: number
  log?: (line: string) => void
}

export interface LearnerStats {
  days: number
  visits: number
  sittings: number
  reviewSittings: number
  looks: number
  tests: number
  right: number
  retypes: number
  misses: Record<'wrong' | 'tone' | 'length' | 'english' | 'pick' | 'practice', number>
  syncs: Record<string, number>
  adopted: number
  /** What a sync after every look and every answer would have sent each way, in bytes: the app before the change. */
  perStepBytes: number
}

const MEET_MS = 12_000
const TEST_MS = 18_000
const RETYPE_MS = 9_000
/** Morning, afternoon, evening. The afternoon is more than four hours after the morning, the first interval. */
const VISIT_HOURS = [9, 14.5, 20]

function advance(ms: number): void {
  vi.setSystemTime(Date.now() + ms)
}

function goTo(t: number): void {
  vi.setSystemTime(Math.max(Date.now(), t))
}

export class Learner {
  doc: ProgressDoc
  readonly stats: LearnerStats = {
    days: 0,
    visits: 0,
    sittings: 0,
    reviewSittings: 0,
    looks: 0,
    tests: 0,
    right: 0,
    retypes: 0,
    misses: { wrong: 0, tone: 0, length: 0, english: 0, pick: 0, practice: 0 },
    syncs: {},
    adopted: 0,
    perStepBytes: 0,
  }
  /** Off while the learner is somewhere with no signal. */
  autoSync = true
  private firstMissed = new Set<string>()
  private secondMissed = new Set<string>()

  constructor(
    doc: ProgressDoc,
    readonly opts: LearnerOptions,
  ) {
    this.doc = doc
  }

  /** As the Account page does it: the document changes, stamped and with every opened level kept. */
  commit(next: ProgressDoc): void {
    this.doc = stampDoc(stampOpened(next))
  }

  private trackDone(track: TrackId): boolean {
    return allLevelStatus(this.doc, Date.now(), track)
      .slice(0, this.opts.scope[track])
      .every((s) => s.total === 0 || s.complete)
  }

  done(): boolean {
    return this.trackDone('voice') && this.trackDone('script')
  }

  /** Days until the course is done, visit by visit, with a sync at the end of the day. */
  async run(): Promise<void> {
    const start = new Date(Date.now())
    const at = (day: number, hour: number) =>
      new Date(start.getFullYear(), start.getMonth(), start.getDate() + day, Math.floor(hour), Math.round((hour % 1) * 60)).getTime()
    const maxDays = this.opts.maxDays ?? 900
    const syncEvery = this.opts.syncEvery ?? 1
    for (let day = 0; !this.done(); day++) {
      if (day >= maxDays) throw new Error(this.stuck(day))
      for (const hour of VISIT_HOURS) {
        goTo(at(day, hour))
        await this.visit()
        if (this.done()) break
      }
      this.stats.days++
      if (typeof syncEvery === 'number' && (day + 1) % syncEvery === 0) await this.sync()
      if (this.opts.log && day % 20 === 19) this.opts.log(this.progressLine(day + 1))
    }
    await saveDoc(this.doc)
    await this.sync()
  }

  /** One time the learner opens the course: a sitting or two on each track, then what is due. */
  async visit(): Promise<void> {
    this.stats.visits++
    for (const track of ['voice', 'script'] as const) {
      for (let i = 0; i < 2; i++) {
        if (this.trackDone(track)) break
        const level = currentLevel(this.doc, Date.now(), track)
        const session = startSession(this.doc, Date.now(), level, track)
        if (session.queue.length === 0) break
        // Begin, as beginLevel in the app does it.
        this.doc = stampDoc(withOpened(this.doc, track, level))
        await this.play(session)
      }
    }
    const due = reviewDue(this.doc, Date.now())
    if (due > 0) {
      const ids = reviewEntries(this.doc, Date.now())
        .slice(0, Math.min(due, SESSION_SIZE))
        .map((e) => e.id)
      const session = startReviewSession(this.doc, Date.now(), ids, 'voice')
      if (session.queue.length > 0) {
        this.stats.reviewSittings++
        await this.play(session)
      }
    }
    await saveDoc(this.doc)
  }

  /** Card by card to the end of the sitting, then its line in the log. */
  async play(first: LiveSession): Promise<void> {
    const changesBefore = this.stats.looks + this.stats.tests
    let s = first
    for (let guard = 0; !isFinished(s); guard++) {
      if (guard > 5000) throw new Error('a sitting did not end')
      s = this.step(s)
    }
    if (s.answered > 0) {
      this.doc = stampDoc({
        ...this.doc,
        sessions: [
          ...this.doc.sessions,
          { startedAt: s.startedAt, endedAt: Date.now(), level: s.level, track: s.track ?? 'voice', answered: s.answered, correct: s.correct },
        ],
      })
    }
    this.stats.sittings++
    if (this.opts.trackSize) this.stats.perStepBytes += (this.stats.looks + this.stats.tests - changesBefore) * Buffer.byteLength(JSON.stringify(this.doc))
    // A finished sitting is sent as a whole, as the app does: one sync, not one a card.
    if (this.autoSync && this.opts.syncEvery === 'sitting') await this.sync()
  }

  /** A few cards in, then stop: the learner closes the tab. */
  playSteps(first: LiveSession, steps: number): LiveSession {
    let s = first
    for (let i = 0; i < steps && !isFinished(s); i++) s = this.step(s)
    return s
  }

  private step(s: LiveSession): LiveSession {
    const item = currentItem(s)
    if (!item) return s
    const entry = entryOrThrow(item.id)
    const hold = s.hold
    if (item.meet && !hold && !s.pending) {
      const prev = this.doc.items[entry.id] ?? newItemProgress(entry.id)
      this.commit({ ...this.doc, items: { ...this.doc.items, [entry.id]: applyMeet(prev, Date.now()) } })
      advance(MEET_MS)
      this.stats.looks++
      return afterMeet(s)
    }
    if (hold) {
      // After a typed miss the card waits for its answer, typed exactly.
      if (!gradeThai(hold.target, hold.target).correct) throw new Error(`the card's own answer was refused: ${hold.target}`)
      advance(RETYPE_MS)
      this.stats.retypes++
      return afterHold(s)
    }
    const scored = this.test(s, item, entry)
    advance(TEST_MS)
    // A typed miss holds the card for its retype. Anything else, the learner presses Next.
    if (scored.hold) return scored
    return scored.pending?.ok ? markCorrect(scored) : requeueCurrent(scored)
  }

  private wantsMiss(entry: Entry, item: QueueItem): boolean {
    const first = this.opts.missRate ?? 0.12
    const again = this.opts.missTwiceRate ?? 0.02
    if (item.penalized) {
      if (this.secondMissed.has(entry.id) || hash(`again:${entry.id}`) >= again) return false
      this.secondMissed.add(entry.id)
      return true
    }
    // Only a card's very first test is missed, so the course can still be finished.
    if (this.firstMissed.has(entry.id) || hash(`first:${entry.id}`) >= first) return false
    if ((this.doc.items[entry.id]?.history.length ?? 0) > 0) return false
    this.firstMissed.add(entry.id)
    return true
  }

  /** Another card on the level that is plainly not this one, typed in its place. */
  private wrongRom(entry: Entry, target: string): string | null {
    const pool = entriesForLevel(entry.level, entryTrack(entry))
    if (pool.length < 2) return null
    const from = Math.floor(hash(`wrong:${entry.id}`) * pool.length)
    for (let k = 0; k < pool.length; k++) {
      const other = pool[(from + k) % pool.length]!
      if (other.id === entry.id) continue
      const candidate = expandAlternatives(other.rom)[0] ?? other.rom
      if (gradeThai(target, candidate).verdict === 'wrong') return candidate
    }
    return null
  }

  private count(verdict: string): void {
    if (verdict === 'tone') this.stats.misses.tone++
    else if (verdict === 'length') this.stats.misses.length++
    else this.stats.misses.wrong++
  }

  /** Check, as the sitting screen does it for each kind of card. Returns the sitting after the attempt. */
  private test(s: LiveSession, item: QueueItem, entry: Entry): LiveSession {
    const script = entryTrack(entry) === 'script'
    const hearable = !this.doc.settings.silent && canHearThai(entry.id)
    const modality = sittingModality(item, hearable)
    const miss = this.wantsMiss(entry, item)
    this.stats.tests++

    const note = (ok: boolean, v: string, text: string, how?: 'move' | 'stay', hold?: Hold): LiveSession => {
      const prev = this.doc.items[entry.id] ?? newItemProgress(entry.id)
      const practice = !ok && Boolean(item.penalized)
      if (practice) this.stats.misses.practice++
      this.commit({
        ...this.doc,
        items: {
          ...this.doc.items,
          [entry.id]: applyAttempt(
            prev,
            { t: Date.now(), ok, v, m: modality, d: deviceId(), ...(practice ? { p: 1 as const } : {}) },
            { practice },
          ),
        },
      })
      if (ok) this.stats.right++
      let next = markScored(s, { ok, text })
      if (how === 'move') next = markMissMove(next)
      if (how === 'stay' && hold) next = markMissStay(next, hold)
      return next
    }

    // Two sounds to choose between: "Which did you hear?"
    if (modality === 'listen' && Boolean(entry.minimalPairOf?.length) && hearable) {
      const rom = miss ? (pairRoms(entry).find((r) => r !== entry.rom) ?? entry.rom) : entry.rom
      if (rom === entry.rom) return note(true, 'exact', 'Right.')
      const m = pairMiss(entry.rom, rom)
      this.count(m.v)
      return note(false, m.v, `That was ${entry.rom}.`, 'move')
    }

    // The tone of each syllable, picked.
    if (modality === 'tone') {
      const nuclei = analyseRom(entry.rom).nuclei
      const other = (t: Tone): Tone => TONES.find((x) => x !== t) ?? t
      if (nuclei.length <= 1) {
        const expected = nuclei[0]?.tone ?? 'mid'
        const pick = miss ? other(expected) : expected
        const ok = pick === expected
        if (!ok) this.stats.misses.tone++
        return note(ok, ok ? 'exact' : 'tone', ok ? 'Right.' : `That syllable is ${TONE_LABEL[expected]}.`, ok ? undefined : 'move')
      }
      for (let step = 0; ; ) {
        const expected = nuclei[step]?.tone ?? 'mid'
        const judged = judgeTonePick(entry.rom, step, miss && step === 0 ? other(expected) : expected)
        if (judged.kind === 'advance') {
          step = judged.next
          continue
        }
        if (judged.kind === 'right') return note(true, 'exact', 'Right.')
        this.stats.misses.tone++
        return note(false, 'tone', judged.line, 'move')
      }
    }

    // A Script card: the letter that fits the English, picked.
    if (modality === 'pick') {
      const thai = miss ? (pickChoices(entry).find((t) => t !== entry.thai) ?? entry.thai) : entry.thai
      const ok = thai === entry.thai
      if (!ok) this.stats.misses.pick++
      return note(ok, ok ? 'exact' : 'wrong', ok ? 'Right.' : `That one is ${entry.thai}.`, ok ? undefined : 'move')
    }

    // A Voice card shown in romanization: its meaning in English, typed.
    if (!script && modality === 'th-en') {
      const g = gradeEnglish(entry.en, miss ? 'qqq zzz' : cleanGloss(entry.en[0] ?? ''))
      if (g.correct) return note(true, 'en-ok', 'Right.')
      this.stats.misses.english++
      return note(false, 'en-wrong', g.message, 'move')
    }

    // The rest is typed romanization: what was heard, what the English asks for, or a letter's sound.
    const fromEnglish = modality === 'en-th'
    const target = fromEnglish ? enThTarget(entry) : entry.rom
    let answer = expandAlternatives(target)[0] ?? target
    if (miss) answer = this.wrongRom(entry, target) ?? answer
    const g = gradeThai(target, answer)
    if (g.verdict === 'empty' || g.verdict === 'invalid') {
      throw new Error(`the card's answer was not accepted as typing: "${answer}" for "${target}" (${g.verdict})`)
    }
    const twin = !g.correct && fromEnglish ? twinAnswer(entry, answer, (id) => Boolean(this.doc.items[id])) : null
    if (g.correct) return note(true, g.verdict, 'Right.')
    if (twin) return note(true, 'exact', `Also right. ${entry.rom}.`)
    if (g.verdict === 'tone' || g.verdict === 'length') {
      this.count(g.verdict)
      return note(false, g.verdict, g.message, 'move')
    }
    this.stats.misses.wrong++
    return note(false, 'wrong', g.message, 'stay', { kind: 'retype-th', id: entry.id, target: g.matchedTarget })
  }

  /** Pull, merge and upload, then take what the merge brought, as the app does after a change. */
  async sync(): Promise<SyncResult> {
    const result = await syncAccount(this.doc)
    this.stats.syncs[result.state] = (this.stats.syncs[result.state] ?? 0) + 1
    if (result.doc && !sameDocPayload(result.doc, this.doc)) {
      this.doc = result.doc
      await saveDoc(this.doc)
      this.stats.adopted++
    }
    return result
  }

  /** Signing in as someone other than the owner of these cards sets them aside, as the app does. */
  async afterSignIn(userId: string): Promise<boolean> {
    const owner = this.doc.owner
    if (!owner || owner === userId) return false
    const theirs = await switchOwner(this.doc, userId)
    if (!theirs) return false
    this.doc = stampOpened(theirs)
    await saveDoc(this.doc)
    return true
  }

  progressLine(day: number): string {
    const done = (track: TrackId) => allLevelStatus(this.doc, Date.now(), track).filter((s) => s.complete).length
    const mastered = Object.values(this.doc.items).filter(isMastered).length
    return `day ${day}: voice ${done('voice')} of ${this.opts.scope.voice} levels, script ${done('script')} of ${this.opts.scope.script}, ${mastered} cards mastered, ${this.stats.sittings} sittings`
  }

  private stuck(day: number): string {
    const rows: string[] = []
    for (const track of ['voice', 'script'] as const) {
      for (const s of allLevelStatus(this.doc, Date.now(), track).slice(0, this.opts.scope[track])) {
        if (s.total > 0 && !s.complete) rows.push(`${track} ${s.n}: ${s.mastered} of ${s.total} mastered, ${s.seen} seen, ${s.unlocked ? 'open' : 'locked'}`)
      }
    }
    return `the course was not finished after ${day} days. ${rows.slice(0, 6).join('; ')}`
  }
}

/** As the app boots: the cards on this browser, set aside if another account owns them. */
export async function bootLearner(opts: LearnerOptions): Promise<{ learner: Learner; status: string; switched: boolean }> {
  const result = await loadDoc()
  if (!result.doc) throw new Error(`the course could not read this browser's storage (${result.status})`)
  let doc = stampOpened(result.doc)
  let switched = false
  const signed = readAccount()
  if (signed && doc.owner && doc.owner !== signed.userId) {
    const theirs = await switchOwner(doc, signed.userId)
    if (theirs) {
      doc = stampOpened(theirs)
      switched = true
    }
  }
  if (switched) await saveDoc(doc)
  return { learner: new Learner(doc, opts), status: result.status, switched }
}
