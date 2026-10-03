/**
 * The whole story of one learner, against a backend: sign in through the gate, sit the course to its
 * end, log out, log in again, open the course on a browser that has never seen it, let the access
 * token run out, share the browser with someone else, lose the connection. After each step the same
 * question: is what the learner did still there, exactly?
 *
 * Checks are collected, not thrown, so one broken step does not hide the next. A soft check is a
 * finding that costs speed or room but loses nothing; it is reported and does not fail the run.
 */
import { randomBytes } from 'node:crypto'
import { vi } from 'vitest'
import clipManifest from '@/audio/clip-manifest.json'
import { clipUrl } from '@/audio/clip-url'
import { levelsFor } from '@content/index'
import { GATE_COOKIE, decideGate } from '@/gate-token'
import { DEMO_IDS } from '@/landing/demo'
import { PREVIEW_IDS } from '@/preview/catalog'
import { allLevelStatus, currentLevel, hereLevel } from '@/engine/scheduler'
import { canContinue, normalizeSession, startSession } from '@/engine/session'
import { ACCOUNT_KEY, readAccount, signInResult, signOutAccount, type AccountSession } from '@/storage/auth'
import { MIRROR_KEY, loadDoc, loadSession, saveSession } from '@/storage/db'
import type { ProgressDoc } from '@/storage/progress-schema'
import { POST as gatePost } from '../../api/gate'
import { POST as logoutPost } from '../../api/logout'
import { GET as sessionGet } from '../../api/session'
import type { Backend } from './backend'
import { restoreIdb, snapshotIdb, wipeIdb } from './idb-mock'
import { Learner, bootLearner, type LearnerOptions, type LearnerStats, type Scope } from './learner'

const DAY = 86_400_000

export interface JourneyOptions {
  scope: Scope
  /** After every sitting, as the app does, or at the end of every n-th day. */
  syncEvery: number | 'sitting'
  trackSize?: boolean
  maxDays?: number
  log?: (line: string) => void
}

export interface Check {
  name: string
  ok: boolean
  soft: boolean
  detail: string
}

export interface Net {
  requests: number
  signIns: number
  refreshes: number
  /** Every read of the progress table. */
  reads: number
  /** Of those, the ones that carry the whole document. The rest ask only when the row was last written. */
  documentReads: number
  stampReads: number
  /** Bytes of document the account sent back, after any compression has been undone. */
  downBytes: number
  uploads: number
  uploadBytes: number
  refused: number
}

export interface Report {
  backend: 'fake' | 'live'
  scope: Scope
  checks: Check[]
  notes: string[]
  facts: [string, string | number][]
  stats: LearnerStats | null
  net: Net
}

/** Object keys sorted at every depth, so a document read back from jsonb compares equal to the one sent. */
export function canon(value: unknown): string {
  return JSON.stringify(value, (_k, v: unknown) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)))
      : v,
  )
}

/** The learner's work: every card, every sitting, every level opened. Not the clock it was stamped with. */
export function sameWork(a: ProgressDoc, b: ProgressDoc): { same: boolean; detail: string } {
  const detail: string[] = []
  const ids = Object.keys(a.items)
  if (ids.length !== Object.keys(b.items).length) detail.push(`${ids.length} cards against ${Object.keys(b.items).length}`)
  const differing = ids.filter((id) => !b.items[id] || canon(a.items[id]) !== canon(b.items[id]))
  if (differing.length) detail.push(`${differing.length} cards differ, first ${differing[0]}`)
  if (canon(a.sessions) !== canon(b.sessions)) detail.push(`${a.sessions.length} sittings against ${b.sessions.length}`)
  if (canon(a.opened) !== canon(b.opened)) detail.push(`opened ${canon(a.opened)} against ${canon(b.opened)}`)
  return { same: detail.length === 0, detail: detail.join('; ') }
}

function levels(doc: ProgressDoc): string {
  return (['voice', 'script'] as const)
    .map((track) =>
      allLevelStatus(doc, Date.now(), track)
        .map((s) => `${s.n}:${s.mastered}/${s.total}${s.unlocked ? 'o' : 'l'}${s.complete ? 'c' : ''}`)
        .join(','),
    )
    .join('|')
}

function attempts(doc: ProgressDoc): number {
  return Object.values(doc.items).reduce((n, p) => n + p.history.length, 0)
}

function bytes(value: unknown): number {
  return Buffer.byteLength(JSON.stringify(value))
}

function asRequest(headers: Record<string, string>): Request {
  const all = new Map(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]))
  return { url: 'https://riangeng.com/api', headers: { get: (k: string) => all.get(k.toLowerCase()) ?? null } } as unknown as Request
}

/**
 * Run a handler and keep the headers it set. The test environment's Response hides Set-Cookie from
 * anyone who reads it back, as a browser does, so the init is read on its way in.
 */
async function callHandler(fn: () => Response | Promise<Response>): Promise<{ status: number; body: unknown; setCookie: string | null }> {
  const original = Response.json
  let setCookie: string | null = null
  Object.defineProperty(Response, 'json', {
    configurable: true,
    writable: true,
    value: (data: unknown, init?: ResponseInit) => {
      const h = init?.headers
      const cookie =
        h instanceof Headers
          ? h.get('Set-Cookie')
          : Array.isArray(h)
            ? (h.find(([k]) => k.toLowerCase() === 'set-cookie')?.[1] ?? null)
            : ((h as Record<string, string> | undefined)?.['Set-Cookie'] ?? null)
      if (cookie) setCookie = cookie
      return original.call(Response, data, init)
    },
  })
  try {
    const res = await fn()
    return { status: res.status, body: await res.clone().json().catch(() => null), setCookie }
  } finally {
    Object.defineProperty(Response, 'json', { configurable: true, writable: true, value: original })
  }
}

function counting(real: typeof fetch, net: Net): typeof fetch {
  return async (input, init) => {
    const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url)
    const method = (init?.method ?? 'GET').toUpperCase()
    net.requests++
    if (url.pathname === '/auth/v1/token') {
      if (url.searchParams.get('grant_type') === 'refresh_token') net.refreshes++
      else net.signIns++
    }
    const select = url.searchParams.get('select') ?? '*'
    const progress = url.pathname === '/rest/v1/progress'
    if (progress) {
      if (method === 'POST') {
        net.uploads++
        net.uploadBytes += Buffer.byteLength(String(init?.body ?? ''))
      } else {
        net.reads++
        if (select.includes('doc') || select === '*') net.documentReads++
        else net.stampReads++
      }
    }
    const res = await real(input, init)
    if (!res.ok) net.refused++
    if (progress && method !== 'POST' && res.ok) net.downBytes += Buffer.byteLength(await res.clone().text())
    return res
  }
}

function wipeBrowser(): void {
  wipeIdb()
  localStorage.clear()
  sessionStorage.clear()
}

/** One browser's storage, to put back when the test goes back to that device. */
interface Browser {
  local: [string, string][]
  session: [string, string][]
  idb: Map<string, unknown>
}

function snapshotBrowser(): Browser {
  const entries = (s: Storage) => Array.from({ length: s.length }, (_, i) => s.key(i)!).map((k): [string, string] => [k, s.getItem(k)!])
  return { local: entries(localStorage), session: entries(sessionStorage), idb: snapshotIdb() }
}

function restoreBrowser(b: Browser): void {
  localStorage.clear()
  sessionStorage.clear()
  for (const [k, v] of b.local) localStorage.setItem(k, v)
  for (const [k, v] of b.session) sessionStorage.setItem(k, v)
  restoreIdb(b.idb)
}

/** Every answer in a document, named by card, moment and device, so two copies can be compared answer by answer. */
function answerKeys(doc: ProgressDoc): Set<string> {
  const keys = new Set<string>()
  for (const p of Object.values(doc.items)) for (const h of p.history) keys.add(`${p.id}|${h.t}|${h.d ?? ''}`)
  return keys
}

export async function runJourney(backend: Backend, opts: JourneyOptions): Promise<Report> {
  const net: Net = { requests: 0, signIns: 0, refreshes: 0, reads: 0, documentReads: 0, stampReads: 0, downBytes: 0, uploads: 0, uploadBytes: 0, refused: 0 }
  const report: Report = { backend: backend.kind, scope: opts.scope, checks: [], notes: [], facts: [], stats: null, net }
  const check = (name: string, ok: boolean, detail = '', soft = false) => report.checks.push({ name, ok, soft, detail: ok ? '' : detail })
  const fact = (label: string, value: string | number) => report.facts.push([label, value])
  const note = (text: string) => report.notes.push(text)
  const clock = performance.now()
  const phase = async (name: string, fn: () => Promise<void>) => {
    const t0 = performance.now()
    try {
      await fn()
    } catch (err) {
      check(`${name}: ran to its end`, false, err instanceof Error ? err.message : String(err))
    }
    fact(`seconds, ${name}`, Math.round((performance.now() - t0) / 100) / 10)
  }

  const secret = `sim-${randomBytes(8).toString('hex')}`
  vi.stubEnv('VITE_SUPABASE_URL', backend.origin)
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', backend.anon)
  vi.stubEnv('SUPABASE_URL', backend.origin)
  vi.stubEnv('SITE_PASSWORD', secret)
  vi.stubEnv('VERCEL', '1')
  vi.stubGlobal('fetch', counting(backend.fetch, net))
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 5, 9, 0, 0))
  wipeBrowser()

  const learnerOpts: LearnerOptions = { scope: opts.scope, syncEvery: opts.syncEvery, trackSize: opts.trackSize, maxDays: opts.maxDays, log: opts.log }
  const made: string[] = []
  const email = `sim.${randomBytes(4).toString('hex')}@example.test`
  const password = randomBytes(12).toString('base64url')
  const NAME = 'Sim Learner'
  let userId = ''
  let session: AccountSession | null = null
  let learner: Learner | null = null
  let finished: ProgressDoc | null = null

  /** What the landing page does after a password is accepted: the gate, then the course. */
  async function throughTheGate(s: AccountSession, label: string): Promise<string> {
    const opened = await callHandler(() => gatePost(asRequest({ authorization: `Bearer ${s.accessToken}` })))
    const cookie = opened.setCookie?.split(';')[0] ?? ''
    check(`${label}: the gate takes a signed-in account`, opened.status === 200 && cookie.startsWith(`${GATE_COOKIE}=`), `status ${opened.status}`)
    check(`${label}: the course opens with that cookie`, (await decideGate('/learn/', cookie, secret, true)).kind === 'shell')
    const refused = await decideGate('/learn/', null, secret, true)
    check(`${label}: a visitor with no cookie is sent to sign in`, refused.kind === 'redirect' && refused.to === '/?signin', JSON.stringify(refused))
    const inSession = await callHandler(() => sessionGet(asRequest({ cookie })))
    const outSession = await callHandler(() => sessionGet(asRequest({})))
    check(`${label}: /api/session answers in, and out without the cookie`, (inSession.body as { in?: boolean })?.in === true && (outSession.body as { in?: boolean })?.in === false)
    return cookie
  }

  try {
    // 1. The door.
    await phase('sign in', async () => {
      userId = await backend.createUser(email, password, NAME)
      made.push(userId)
      const bad = await signInResult(email, 'not-the-password')
      check('a wrong password is refused and keeps no session', 'refused' in bad && readAccount() === null)
      const good = await signInResult(email, password)
      if (!('session' in good)) throw new Error('the right password was not accepted')
      session = good.session
      check('the right password opens a session for this learner', session.userId === userId && session.email === email)
      check('the account name comes with the session', session.displayName === NAME, session.displayName)
      const cookie = await throughTheGate(session, 'sign in')
      const privateClip = clipManifest.ids.find((id) => !DEMO_IDS.includes(id) && !PREVIEW_IDS.includes(id))
      if (privateClip) {
        const gated = await decideGate(clipUrl(privateClip), null, secret, true)
        check("the course's own audio is gated", gated.kind === 'redirect', JSON.stringify(gated))
        check('and opens with the cookie', (await decideGate(clipUrl(privateClip), cookie, secret, true)).kind === 'shell')
      }
      const demo = DEMO_IDS[0]
      check("the landing's clips are public", demo !== undefined && (await decideGate(clipUrl(demo), null, secret, true)).kind === 'pass')
    })
    if (!session) throw new Error('no session, so nothing else can run')

    // 2. A sitting closed halfway comes back where it stopped.
    await phase('a sitting left halfway', async () => {
      const booted = await bootLearner(learnerOpts)
      learner = booted.learner
      check('a first visit opens an empty course', booted.status === 'empty' && Object.keys(learner.doc.items).length === 0, booted.status)
      // The learner opens Account and sets how the course behaves.
      learner.commit({
        ...learner.doc,
        settings: { ...learner.doc.settings, name: 'Luis Sim', thaiScript: true, autoplay: false, newPerSession: 10, audioRate: 0.9 },
      })
      const first = startSession(learner.doc, Date.now(), 0, 'voice')
      const half = learner.playSteps(first, 7)
      await saveSession(half)
      const back = await loadSession()
      check('a sitting saved halfway reads back as it was', back !== null && canon(back) === canon(half))
      check('and Continue is offered on its level', back !== null && canContinue(normalizeSession(back), 'voice', 0))
      await learner.play(normalizeSession(back ?? half))
      await saveSession(null)
    })
    if (!learner) throw new Error('no learner, so nothing else can run')
    const sim: Learner = learner

    // 3. The course.
    await phase('the course, start to finish', async () => {
      await sim.run()
      report.stats = sim.stats
    })
    const doc1 = sim.doc
    finished = doc1

    // 4. Everything the learner did is on the device and in the account.
    await phase('after the last card', async () => {
      for (const track of ['voice', 'script'] as const) {
        const statuses = allLevelStatus(doc1, Date.now(), track)
        const left = statuses.slice(0, opts.scope[track]).filter((s) => s.total > 0 && !s.complete).length
        check(`every ${track} level in scope is complete`, left === 0, `${left} left`)
        if (opts.scope[track] === levelsFor(track).length) {
          check(`the ${track} track has nothing left to continue`, hereLevel(statuses, track) === null, `level ${hereLevel(statuses, track)}`)
          check(`every ${track} level has been opened`, doc1.opened?.[track] === levelsFor(track).length, JSON.stringify(doc1.opened))
        }
      }
      const device = await loadDoc()
      const onDevice = device.status === 'ready' ? sameWork(device.doc, doc1) : { same: false, detail: device.status }
      check("the device's copy is exactly what the learner has", onDevice.same, onDevice.detail)
      const remote = await backend.remoteDoc(userId)
      const inAccount = remote ? sameWork(remote, doc1) : { same: false, detail: 'the account holds nothing' }
      check("the account's copy is exactly what the learner has", inAccount.same, inAccount.detail)
      check('the account names this learner as the owner', remote?.owner === userId)
      const size = bytes(doc1)
      const mirror = localStorage.getItem(MIRROR_KEY)?.length ?? 0
      fact('cards met', Object.keys(doc1.items).length)
      fact('cards mastered', Object.values(doc1.items).filter((p) => p.stage >= 3 && p.days.length >= 3).length)
      fact('answers kept', attempts(doc1))
      fact('sittings logged', doc1.sessions.length)
      fact('progress document, KB', Math.round(size / 1024))
      fact('copy in localStorage, KB', Math.round(mirror / 1024))
      check('the localStorage copy fits a 5 MB browser quota', mirror > 0 && mirror < 4_500_000, `${mirror} characters`, true)
      check('the account copy stays under 5 MB', size < 5_000_000, `${size} bytes`, true)
    })

    // 5. Log out, as the Account page does it.
    await phase('log out', async () => {
      signOutAccount()
      const out = await callHandler(() => logoutPost())
      check('log out is accepted and clears the cookie', out.status === 200 && /Max-Age=0/.test(out.setCookie ?? ''), `status ${out.status}`)
      check('no session is left in the browser', readAccount() === null)
      const refused = await decideGate('/learn/', null, secret, true)
      check('the course sends the browser to sign in', refused.kind === 'redirect' && refused.to === '/?signin')
      const device = await loadDoc()
      const kept = device.status === 'ready' ? sameWork(device.doc, doc1) : { same: false, detail: device.status }
      check('the cards stay on the device after logging out', kept.same, kept.detail)
      note('The rk_gate cookie is a hash of one secret and the same for every learner, so logging out clears it in this browser and nowhere else. A copy kept elsewhere keeps opening /learn/ until the secret changes. This is the shared-cookie gap listed as P1 in 04-codebase.md.')
    })

    // 6. Log in again on the same browser.
    await phase('log in again, same browser', async () => {
      const again = await signInResult(email, password)
      if (!('session' in again)) throw new Error('the password was not accepted a second time')
      session = again.session
      await throughTheGate(again.session, 'log in again')
      const booted = await bootLearner(learnerOpts)
      const reopened = sameWork(booted.learner.doc, doc1)
      check('the course opens with every card as it was left', booted.status === 'ready' && !booted.switched && reopened.same, `${booted.status} ${reopened.detail}`)
      check('the levels stand where they stood', levels(booted.learner.doc) === levels(doc1))
      check('Continue offers the same place', currentLevel(booted.learner.doc, Date.now(), 'voice') === currentLevel(doc1, Date.now(), 'voice'))
      const sent = net.uploads
      const read = net.documentReads
      const asked = net.stampReads
      const synced = await booted.learner.sync()
      check('the first sync after logging in reports saved', synced.state === 'saved', synced.state)
      check(
        'a sync with nothing new asks one small question, and moves no document either way',
        net.uploads === sent && net.documentReads === read && net.stampReads === asked + 1,
        `${net.uploads - sent} uploads, ${net.documentReads - read} document reads, ${net.stampReads - asked} small questions`,
      )
      const remote = await backend.remoteDoc(userId)
      check('the account still holds exactly the same work', remote !== null && sameWork(remote, doc1).same)
      sim.doc = booted.learner.doc
    })

    // 7. A browser that has never seen the course: a new phone.
    await phase('a new device', async () => {
      wipeBrowser()
      const fresh = await bootLearner(learnerOpts)
      check('a new browser starts with an empty course', fresh.status === 'empty' && Object.keys(fresh.learner.doc.items).length === 0, fresh.status)
      const signed = await signInResult(email, password)
      if (!('session' in signed)) throw new Error('the password was not accepted on the new device')
      session = signed.session
      await throughTheGate(signed.session, 'new device')
      const synced = await fresh.learner.sync()
      check('the first sync on the new device reports saved', synced.state === 'saved', synced.state)
      const restored = sameWork(fresh.learner.doc, doc1)
      check('every card, sitting and opened level comes back from the account', restored.same, restored.detail)
      check('the levels stand where they stood', levels(fresh.learner.doc) === levels(doc1))
      check('the new device now owns the cards for this account', fresh.learner.doc.owner === userId)
      const device = await loadDoc()
      check("and keeps them on its own, for the next time it is offline", device.status === 'ready' && sameWork(device.doc, doc1).same, device.status)
      const kept = canon({ ...fresh.learner.doc.settings, name: '' }) === canon({ ...doc1.settings, name: '' })
      check("the learner's settings come back from the account", kept, `got ${canon(fresh.learner.doc.settings)}, had ${canon(doc1.settings)}`)
      check("and so does the name they chose", fresh.learner.doc.settings.name === doc1.settings.name, `got "${fresh.learner.doc.settings.name}", had "${doc1.settings.name}"`)
      const remote = await backend.remoteDoc(userId)
      check("the account's settings were not overwritten by the new device's defaults", remote !== null && canon(remote.settings) === canon(doc1.settings), remote ? `the account now holds ${canon(remote.settings)}` : 'no account copy')
      sim.doc = fresh.learner.doc
    })

    // 8. Back to learning on the new device a month later.
    await phase('a month later, on the new device', async () => {
      vi.setSystemTime(Date.now() + 30 * DAY)
      const before = attempts(sim.doc)
      await sim.visit()
      check('a month away, the learner has cards due and reviews them', attempts(sim.doc) > before, `${attempts(sim.doc) - before} new answers`)
      const synced = await sim.sync()
      check('the sync after that reports saved', synced.state === 'saved', synced.state)
      const remote = await backend.remoteDoc(userId)
      const same = remote ? sameWork(remote, sim.doc) : { same: false, detail: 'the account holds nothing' }
      check('the account holds what the new device did, on top of what the old one did', same.same && attempts(remote ?? sim.doc) > attempts(doc1), same.detail)
    })

    // 8b. Two devices, each used while the other is away, then both sync, one after the other.
    await phase('two devices used at once', async () => {
      const x = snapshotBrowser()
      // A second browser: a new phone, signed in, and brought up to date.
      wipeBrowser()
      const second = await signInResult(email, password)
      if (!('session' in second)) throw new Error('the second device could not sign in')
      const yBoot = await bootLearner(learnerOpts)
      await yBoot.learner.sync()
      const y = snapshotBrowser()
      const fork = answerKeys(yBoot.learner.doc)

      // The first device is used, with no signal.
      restoreBrowser(x)
      const a = (await bootLearner(learnerOpts)).learner
      a.autoSync = false
      vi.setSystemTime(Date.now() + 2 * DAY)
      await a.visit()
      const fromA = [...answerKeys(a.doc)].filter((k) => !fork.has(k))
      const xAfter = snapshotBrowser()

      // So is the second, a little later.
      restoreBrowser(y)
      const b = (await bootLearner(learnerOpts)).learner
      b.autoSync = false
      vi.setSystemTime(Date.now() + 3_600_000)
      await b.visit()
      const fromB = [...answerKeys(b.doc)].filter((k) => !fork.has(k))
      check('each device answered something the other did not see', fromA.length > 0 && fromB.length > 0, `${fromA.length} and ${fromB.length} answers`)
      const bSynced = await b.sync()
      check('the second device sends its work', bSynced.state === 'saved', bSynced.state)
      const yAfter = snapshotBrowser()

      // The first device is back. The account moved while it was away, and it has work of its own.
      restoreBrowser(xAfter)
      const a2 = (await bootLearner(learnerOpts)).learner
      const readsBefore = net.documentReads
      const aSynced = await a2.sync()
      check('the first device reads the account, merges, and sends the result', aSynced.state === 'saved' && net.documentReads === readsBefore + 1, `${aSynced.state}, ${net.documentReads - readsBefore} document reads`)

      // And the second takes what the first sent.
      restoreBrowser(yAfter)
      const b2 = (await bootLearner(learnerOpts)).learner
      const uploadsBefore = net.uploads
      const bSynced2 = await b2.sync()
      check('the second device takes the merged work and sends nothing', bSynced2.state === 'saved' && net.uploads === uploadsBefore, `${bSynced2.state}, ${net.uploads - uploadsBefore} uploads`)

      const together = sameWork(a2.doc, b2.doc)
      check('both devices end with exactly the same work', together.same, together.detail)
      const remote = await backend.remoteDoc(userId)
      check('and so does the account', remote !== null && sameWork(remote, b2.doc).same)
      const kept = answerKeys(b2.doc)
      const lost = [...fromA, ...fromB].filter((k) => !kept.has(k))
      check('every answer from either device is still there', lost.length === 0, `${lost.length} missing, first ${lost[0]}`)
      sim.doc = b2.doc
    })

    // 9. The access token runs out, then the refresh token does.
    await phase('tokens that run out', async () => {
      const stored = readAccount()
      if (!stored) throw new Error('no session to run out')
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ ...stored, expiresAt: Date.now() - 3_600_000 }))
      const refreshes = net.refreshes
      const synced = await sim.sync()
      check('an access token that ran out is refreshed, and the sync still saves', synced.state === 'saved' && net.refreshes > refreshes, `${synced.state}, ${net.refreshes - refreshes} refreshes`)
      const spent = readAccount()
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify({ ...(spent ?? stored), refreshToken: 'a-refresh-token-that-was-never-issued', expiresAt: Date.now() - 3_600_000 }))
      const refused = await sim.sync()
      check('a refresh token the server refuses ends the session', refused.state === 'signed-out' && readAccount() === null, refused.state)
      const device = await loadDoc()
      check("and the cards on the device are untouched", device.status === 'ready' && sameWork(device.doc, sim.doc).same, device.status)
      const back = await signInResult(email, password)
      check('the learner signs in again and carries on', 'session' in back)
      if ('session' in back) session = back.session
    })

    // 10. Someone else signs in on the same browser.
    await phase('a second account on the same browser', async () => {
      const mine = sim.doc
      const emailB = `sim.${randomBytes(4).toString('hex')}@example.test`
      const passwordB = randomBytes(12).toString('base64url')
      const idB = await backend.createUser(emailB, passwordB, 'Sim Learner B')
      made.push(idB)
      signOutAccount()
      const b = await signInResult(emailB, passwordB)
      if (!('session' in b)) throw new Error('the second learner could not sign in')
      const foreign = await sim.sync()
      check("the first learner's cards are never sent to the second account", foreign.state === 'foreign' && (await backend.remoteDoc(idB)) === null, foreign.state)
      check('the browser sets them aside and opens the second learner a course of their own', (await sim.afterSignIn(b.session.userId)) && Object.keys(sim.doc.items).length === 0 && sim.doc.owner === idB)
      const startB = startSession(sim.doc, Date.now(), 0, 'voice')
      await sim.play(startB)
      const savedB = await sim.sync()
      check("the second learner's first sitting reaches their own account", savedB.state === 'saved' && Object.keys((await backend.remoteDoc(idB))?.items ?? {}).length > 0, savedB.state)
      const stillMine = await backend.remoteDoc(userId)
      check("the first learner's account is untouched by that", stillMine !== null && sameWork(stillMine, mine).same)
      signOutAccount()
      const a = await signInResult(email, password)
      if (!('session' in a)) throw new Error('the first learner could not sign back in')
      check('the first learner signs back in and gets every card back', (await sim.afterSignIn(userId)) && sameWork(sim.doc, mine).same, sameWork(sim.doc, mine).detail)
      const resynced = await sim.sync()
      check('and their account is still whole', resynced.state === 'saved' && sameWork((await backend.remoteDoc(userId)) ?? mine, mine).same, resynced.state)
    })

    // 11. The connection drops mid-visit (only a backend that can be cut off).
    if (backend.setOffline) {
      await phase('a dropped connection', async () => {
        backend.setOffline?.(true)
        await sim.visit()
        const failed = await sim.sync()
        check('a sync with no connection reports failed, and the cards stay', failed.state === 'failed', failed.state)
        const device = await loadDoc()
        check('what was learned offline is on the device', device.status === 'ready' && sameWork(device.doc, sim.doc).same, device.status)
        backend.setOffline?.(false)
        const caught = await sim.sync()
        const remote = await backend.remoteDoc(userId)
        check('the next sync with a connection sends all of it', caught.state === 'saved' && remote !== null && sameWork(remote, sim.doc).same, caught.state)
      })
    }
  } finally {
    // 12. Nothing is left behind.
    for (const id of made) {
      try {
        await backend.deleteUser(id)
      } catch (err) {
        check('the throwaway learner was removed', false, err instanceof Error ? err.message : String(err))
      }
    }
    for (const id of made) {
      try {
        check('removing a learner removes their progress with them', (await backend.remoteDoc(id)) === null)
      } catch (err) {
        check('removing a learner removes their progress with them', false, err instanceof Error ? err.message : String(err))
      }
    }
    vi.useRealTimers()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
    wipeBrowser()
  }

  if (finished) fact('answers kept at the end of the course', attempts(finished))
  fact('requests', net.requests)
  fact('sign-ins', net.signIns)
  fact('token refreshes', net.refreshes)
  fact('uploads of the progress document', net.uploads)
  fact('whole documents read', net.documentReads)
  fact('small questions (when was the row written)', net.stampReads)
  fact('uploaded, MB', Math.round(net.uploadBytes / 1024 / 102.4) / 10)
  fact('read back, MB (documents, uncompressed)', Math.round(net.downBytes / 1024 / 102.4) / 10)
  const wire = backend.wire?.()
  if (wire) {
    fact('on the wire, up, MB', Math.round(wire.up / 1024 / 102.4) / 10)
    fact('on the wire, down, MB (compressed)', Math.round(wire.down / 1024 / 102.4) / 10)
  }
  if (report.stats && opts.trackSize) {
    const mb = Math.round(report.stats.perStepBytes / 1024 / 102.4) / 10
    fact('syncing after every card would have sent, MB', mb)
    fact('and read back, MB (uncompressed)', mb)
  }
  fact('seconds in all', Math.round((performance.now() - clock) / 100) / 10)
  return report
}

export function formatReport(report: Report): string {
  const hard = report.checks.filter((c) => !c.ok && !c.soft)
  const soft = report.checks.filter((c) => !c.ok && c.soft)
  const lines: string[] = []
  lines.push(`Learner simulation, ${report.backend === 'live' ? 'the real Supabase project' : 'an in-memory Supabase'}`)
  lines.push(`Course finished: ${report.scope.voice} Voice levels, ${report.scope.script} Script levels`)
  lines.push('')
  const s = report.stats
  if (s) {
    lines.push(
      `${s.days} days, ${s.visits} visits, ${s.sittings} sittings (${s.reviewSittings} of them review), ${s.looks} looks, ${s.tests} tests, ${s.right} right, ${s.retypes} retypes`,
    )
    lines.push(`misses: ${Object.entries(s.misses).map(([k, v]) => `${k} ${v}`).join(', ')}`)
    lines.push(`syncs: ${Object.entries(s.syncs).map(([k, v]) => `${k} ${v}`).join(', ')}; documents adopted from the account: ${s.adopted}`)
    lines.push('')
  }
  for (const [label, value] of report.facts) lines.push(`${label.padEnd(44)} ${value}`)
  lines.push('')
  for (const c of report.checks) lines.push(`${c.ok ? 'PASS' : c.soft ? 'NOTE' : 'FAIL'}  ${c.name}${c.detail ? `  [${c.detail}]` : ''}`)
  if (report.notes.length) {
    lines.push('')
    for (const n of report.notes) lines.push(`NOTE  ${n}`)
  }
  lines.push('')
  lines.push(`${report.checks.length - hard.length - soft.length} passed, ${hard.length} failed, ${soft.length} findings that lose nothing`)
  return lines.join('\n')
}

export function failures(report: Report): string[] {
  return report.checks.filter((c) => !c.ok && !c.soft).map((c) => `${c.name}${c.detail ? ` [${c.detail}]` : ''}`)
}

