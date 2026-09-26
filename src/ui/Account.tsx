import { useRef, useState } from 'react'
import { LEVELS, SCRIPT_LEVELS, getEntry } from '@content/index'
import { isoDay } from '@/engine/srs'
import { activeDays, streak, todayStats, type LevelStatus } from '@/engine/scheduler'
import type { ProgressDoc } from '@/storage/progress-schema'
import { detectVoice } from '@/audio/tts'
import {
  accountConfig,
  changePassword,
  sendPasswordReset,
  signInResult,
  signOutAccount,
  updatePassword,
  type AccountSession,
} from '@/storage/auth'
import type { SyncState } from '@/storage/account-sync'
import { Commit, Meter, TextBtn } from './bits'
import { chrome } from './copy'
import { cleanGloss } from '@/engine/grader-en'

const MONTH_WORD = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

/** Polite title in front of a given name. A name that already starts with it is left as written. */
export function khunName(name: string): string {
  const n = name.trim()
  if (!n) return ''
  if (/^khun\b/i.test(n)) return n
  return `Khun ${n}`
}
const WEEKDAY = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const

export function dayLabel(key: string): string {
  const [y, m, d] = key.split('-').map(Number)
  if (!y || !m || !d) return key
  const date = new Date(y, m - 1, d)
  return `${WEEKDAY[date.getDay()]} ${d} ${MONTH_WORD[m - 1] ?? ''}`
}

export type DayLine = { text: string; miss: boolean }

/** What the log still knows about one calendar day. */
export function dayWork(doc: ProgressDoc, key: string): { label: string; summary: string; lines: DayLine[] } {
  const named: { text: string; miss: boolean; t: number }[] = []
  let unnamed = 0
  let answered = 0
  let correct = 0
  for (const p of Object.values(doc.items)) {
    const attempts = p.history.filter((h) => isoDay(h.t) === key)
    if (attempts.length) {
      answered += attempts.length
      correct += attempts.filter((h) => h.ok).length
      const entry = getEntry(p.id)
      const gloss = entry?.en[0] ? cleanGloss(entry.en[0]) : entry?.rom ?? p.id
      const miss = attempts.some((h) => !h.ok)
      const t = attempts.reduce((n, h) => Math.max(n, h.t), 0)
      named.push({ text: miss ? `${gloss}, missed` : gloss, miss, t })
    } else if (p.days.includes(key)) {
      unnamed += 1
      answered += 1
      correct += 1
    }
  }
  named.sort((a, b) => a.t - b.t)
  const shown = named.slice(0, 5).map(({ text, miss }) => ({ text, miss }))
  const extra = named.length - shown.length
  if (extra > 0) shown.push({ text: extra === 1 ? '1 more card' : `${extra} more cards`, miss: false })
  if (unnamed > 0) {
    shown.push({
      text: unnamed === 1 ? '1 more, no longer in the log' : `${unnamed} more, no longer in the log`,
      miss: false,
    })
  }
  const summary =
    answered === 0
      ? 'Nothing answered.'
      : `${answered === 1 ? '1 answered' : `${answered} answered`}, ${correct === 0 ? 'none right' : correct === 1 ? '1 right' : `${correct} right`}.`
  return { label: dayLabel(key), summary, lines: shown }
}

function HeatDay(props: { doc: ProgressDoc; day: string }) {
  const work = dayWork(props.doc, props.day)
  return (
    <>
      <p className="heat-when">{work.label}</p>
      <p className="heat-sum">{work.summary}</p>
      {work.lines.length > 0 && (
        <ul className="heat-done">
          {work.lines.map((line, i) => (
            <li key={`${i}-${line.text}`} className={line.miss ? 'miss' : undefined}>
              {line.text}
            </li>
          ))}
        </ul>
      )}
    </>
  )
}

export const ERASE_CONFIRM = 'Erase cards on this browser and sign out? The account keeps its copy.'

/** What erasing loses: nothing while the account holds every card, else say so plainly. */
export function eraseConfirm(signedIn: boolean, saved: boolean): string {
  if (signedIn && saved) return ERASE_CONFIRM
  return signedIn ? chrome.eraseUnsaved : chrome.eraseSignedOut
}

/** Where the account stands with this browser's cards. */
export interface AccountSync {
  state: SyncState | 'idle'
  /** When the account last held everything this browser had. 0: not yet. */
  savedAt: number
  /** Cards changed since then, or never saved at all. */
  unsaved: boolean
  /** The session was refused and removed, so saving stopped. */
  sessionEnded: boolean
  /** Another account's cards were set aside on this browser. */
  keptApart: boolean
}

export function syncLine(sync: AccountSync, now = Date.now()): string {
  if (sync.unsaved || sync.state === 'failed' || !sync.savedAt) return chrome.notSaved
  return `${chrome.savedTo} ${agoWords(sync.savedAt, now)}.`
}

export function localDayKey(now = Date.now()): string {
  const day = new Date(now)
  day.setHours(0, 0, 0, 0)
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
}

/** 0.85 is the clip as recorded. The words follow that, not the decimal. */
export function hearPace(rate: number): string {
  if (rate < 0.68) return 'Much slower'
  if (rate < 0.82) return 'Slower'
  if (rate <= 0.92) return 'As recorded'
  if (rate < 1.08) return 'Faster'
  return 'Much faster'
}

function LevelCount(props: { seen: number; total: number; title: string }) {
  if (props.total <= 0) return <span className="mini-soon">soon</span>
  return (
    <span className="mini-count">
      <span>
        {props.seen} of {props.total}
      </span>
      <Meter value={props.seen / props.total} label={`${props.seen} of ${props.total} in ${props.title}`} />
    </span>
  )
}

/** How long ago, in the plainest words that still say it. */
export function agoWords(then: number, now = Date.now()): string {
  if (!then) return 'never'
  const s = Math.max(0, Math.round((now - then) / 1000))
  if (s < 45) return 'just now'
  const m = Math.round(s / 60)
  if (m < 60) return m === 1 ? 'a minute ago' : `${m} minutes ago`
  const h = Math.round(m / 60)
  if (h < 24) return h === 1 ? 'an hour ago' : `${h} hours ago`
  const d = Math.round(h / 24)
  if (d === 1) return 'yesterday'
  return `${d} days ago`
}

/** A backup older than a week, or none at all, is worth saying in lacquer. */
export function backupStale(lastBackupAt: number, now = Date.now()): boolean {
  return lastBackupAt === 0 || now - lastBackupAt > 7 * 24 * 60 * 60 * 1000
}

/** Twelve week columns, Sunday first, ending on this week. */
export function lastWeeks(n: number, now = Date.now()): string[] {
  const out: string[] = []
  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const start = new Date(today)
  start.setDate(start.getDate() - start.getDay() - (n - 1) * 7)
  for (let i = 0; i < n * 7; i++) {
    out.push(localDayKey(start.getTime()))
    start.setDate(start.getDate() + 1)
  }
  return out
}

/** Quiet month word under the first Sunday column of each new month. */
export function heatMonthMarks(keys: string[]): (string | null)[] {
  const cols = Math.floor(keys.length / 7)
  const marks: (string | null)[] = Array.from({ length: cols }, () => null)
  let prev = ''
  for (let col = 0; col < cols; col++) {
    const key = keys[col * 7]
    if (!key) continue
    const month = key.slice(5, 7)
    if (month === prev) continue
    const n = Number(month)
    marks[col] = MONTH_WORD[n - 1] ?? null
    prev = month
  }
  return marks
}

export function Account(props: {
  doc: ProgressDoc
  voice: LevelStatus[]
  script: LevelStatus[]
  onDoc: (doc: ProgressDoc) => void
  onReset: () => void
  account: AccountSession | null
  onAccount: (session: AccountSession | null) => void
  sync: AccountSync
  recovery: boolean
  onRecoveryDone: () => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [signInNote, setSignInNote] = useState('')
  const [passwordNote, setPasswordNote] = useState('')
  const [hotDay, setHotDay] = useState<string | null>(null)
  const eraseRef = useRef<HTMLDialogElement>(null)
  const days = activeDays(props.doc)
  const cells = lastWeeks(12)
  const months = heatMonthMarks(cells)
  const todayKey = localDayKey()
  const today = todayStats(props.doc)
  const s = streak(props.doc)
  const voice = detectVoice()

  const set = <K extends keyof ProgressDoc['settings']>(key: K, value: ProgressDoc['settings'][K]) => {
    props.onDoc({ ...props.doc, settings: { ...props.doc.settings, [key]: value } })
  }

  const signedIn = Boolean(props.account)
  const submitSignIn = () => {
    if (!accountConfig()) {
      setSignInNote('Sign in is not set up on this copy.')
      return
    }
    setSigningIn(true)
    setSignInNote('')
    void signInResult(email, password).then((result) => {
      setSigningIn(false)
      if (!('session' in result)) {
        setSignInNote(
          'refused' in result
            ? 'Wrong email or password.'
            : navigator.onLine === false
              ? 'No connection.'
              : 'Could not sign in.',
        )
        return
      }
      setPassword('')
      props.onAccount(result.session)
    })
  }
  const submitPassword = () => {
    if (!accountConfig()) {
      setPasswordNote('Sign in is not set up on this copy.')
      return
    }
    setSigningIn(true)
    setPasswordNote('')
    const run = props.recovery
      ? props.account
        ? updatePassword(nextPassword, props.account)
        : Promise.resolve(false)
      : changePassword(currentPassword, nextPassword)
    void run.then((ok) => {
      setSigningIn(false)
      if (!ok) {
        setPasswordNote('Could not change this.')
        return
      }
      setCurrentPassword('')
      setNextPassword('')
      setPasswordNote('Password changed.')
      if (props.recovery) props.onRecoveryDone()
    })
  }
  const submitReset = () => {
    if (!accountConfig()) {
      setSignInNote('Sign in is not set up on this copy.')
      return
    }
    setSigningIn(true)
    setSignInNote('')
    const redirect = `${window.location.origin}/learn/`
    void sendPasswordReset(email, redirect).then((ok) => {
      setSigningIn(false)
      setSignInNote(ok ? 'Check your email.' : 'Could not send this.')
    })
  }
  return (
    <main className="page account">
      <h1>Account</h1>
      {(s > 0 || today.answered > 0) && (
        <div className="account-now">
          {s > 0 && (
            <p>
              <span className="account-n">{s}</span>
              <span className="account-k">{s === 1 ? 'day' : 'days'}</span>
            </p>
          )}
          {today.answered > 0 ? (
            <p>
              <span className={s > 0 ? 'account-n ink' : 'account-n'}>{today.correct} of {today.answered}</span>
              <span className="account-k">today</span>
            </p>
          ) : (
            <p className="account-quiet">Nothing answered today.</p>
          )}
        </div>
      )}
      <section className="account-block">
      <h2>{signedIn ? 'Signed in' : 'Sign in'}</h2>
      {signedIn ? (
        <>
          <p className="lede">{props.account?.displayName || props.account?.email}</p>
          <p className="account-quiet" role="status">
            {syncLine(props.sync)}
          </p>
          {props.sync.keptApart && <p className="account-quiet">{chrome.keptApart}</p>}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submitPassword()
            }}
          >
            {props.recovery ? null : (
              <label className="field">
                <span>Current password</span>
                <input
                  className="roman-field en"
                  type="password"
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                />
              </label>
            )}
            <label className="field">
              <span>New password</span>
              <input
                className="roman-field en"
                type="password"
                autoComplete="new-password"
                value={nextPassword}
                onChange={(e) => setNextPassword(e.target.value)}
              />
            </label>
            <div className="account-actions">
              <Commit type="submit" disabled={signingIn}>
                Change password
              </Commit>
            </div>
            {passwordNote && <p className="lede">{passwordNote}</p>}
          </form>
          <div className="account-actions">
            <TextBtn
              onClick={() => {
                signOutAccount()
                props.onAccount(null)
                props.onRecoveryDone()
              }}
            >
              Sign out
            </TextBtn>
          </div>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            submitSignIn()
          }}
        >
          {props.sync.sessionEnded && <p className="lede">{chrome.sessionEnded}</p>}
          <label className="field">
            <span>Email</span>
            <input
              className="roman-field en"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <label className="field">
            <span>Password</span>
            <input
              className="roman-field en"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <div className="account-actions">
            <Commit type="submit" disabled={signingIn}>
              Sign in
            </Commit>
            <TextBtn rank="secondary" disabled={signingIn} onClick={submitReset}>
              Send a reset link
            </TextBtn>
          </div>
          {signInNote && <p className="lede">{signInNote}</p>}
        </form>
      )}
      </section>

      <section className="account-block">
      <h2>Your progress</h2>
      <div className="heat-wrap" onMouseLeave={() => setHotDay(null)}>
        <div className="heat" aria-label="twelve week heatmap, Sunday first">
          {cells.map((key) => {
            const n = days.get(key) ?? 0
            const band = n === 0 ? 0 : n < 4 ? 1 : n < 10 ? 2 : 3
            const todayCell = key === todayKey
            return (
              <button
                key={key}
                type="button"
                tabIndex={-1}
                className={`heat-c c${band}${todayCell ? ' today' : ''}${hotDay === key ? ' on' : ''}`}
                onMouseEnter={() => setHotDay(key)}
                onClick={() => setHotDay(key)}
              />
            )
          })}
        </div>
        <div className="heat-months" aria-hidden>
          {months.map((m, i) => (
            <span key={`m-${i}`}>{m ?? ''}</span>
          ))}
        </div>
        <div className="heat-day" aria-live="polite">
          {hotDay && <HeatDay doc={props.doc} day={hotDay} />}
        </div>
      </div>
      </section>

      <section className="account-block">
      <h2>Voice</h2>
      <ol className="mini-index" start={0}>
        {LEVELS.map((lvl) => {
          const st = props.voice[lvl.n]
          return (
            <li key={`v-${lvl.n}`}>
              <span>{lvl.n}</span>
              <span>{lvl.title}</span>
              <LevelCount seen={st?.seen ?? 0} total={st?.total ?? 0} title={lvl.title} />
            </li>
          )
        })}
      </ol>
      </section>

      <section className="account-block">
      <h2>Script</h2>
      <ol className="mini-index" start={0}>
        {SCRIPT_LEVELS.map((lvl) => {
          const st = props.script[lvl.n]
          return (
            <li key={`s-${lvl.n}`}>
              <span>{lvl.n}</span>
              <span>{lvl.title}</span>
              <LevelCount seen={st?.seen ?? 0} total={st?.total ?? 0} title={lvl.title} />
            </li>
          )
        })}
      </ol>
      </section>

      <section className="account-block">
      <h2>Settings</h2>
      <label className="field">
        <span>Your name</span>
        <span className="name-line">
          <span className="name-khun">Khun</span>
          <input
            className="roman-field en"
            value={props.doc.settings.name}
            onChange={(e) => set('name', e.target.value.replace(/^khun\s+/i, ''))}
          />
        </span>
      </label>
      <label className="check">
        <input type="checkbox" checked={props.doc.settings.thaiScript} onChange={(e) => set('thaiScript', e.target.checked)} />
        Show Thai script
      </label>
      <label className="check">
        <input
          type="checkbox"
          checked={props.doc.settings.autoplay}
          disabled={props.doc.settings.silent}
          onChange={(e) => set('autoplay', e.target.checked)}
        />
        Play each card when it appears
      </label>
      <label className="check">
        <input type="checkbox" checked={props.doc.settings.silent} onChange={(e) => set('silent', e.target.checked)} />
        Silent. No listening exercises, no sound, no Hear
      </label>
      <label className="field rate">
        <span className="rate-name">
          <span>Speaking</span>
          <span>{hearPace(props.doc.settings.audioRate)}</span>
        </span>
        <input
          type="range"
          min={0.5}
          max={1.2}
          step={0.05}
          disabled={props.doc.settings.silent}
          value={props.doc.settings.audioRate}
          style={{ ['--at' as string]: String((props.doc.settings.audioRate - 0.5) / 0.7) }}
          onChange={(e) => set('audioRate', Number(e.target.value))}
        />
      </label>
      <p className={voice.ready ? 'lede' : 'warn'}>{voice.ready ? `Thai voice: ${voice.name}` : voice.warning}</p>
      </section>

      <section className="account-block">
      <h2>Sign out</h2>
      <p className="lede">The password is the account password. Cards stay on this device.</p>
      <TextBtn
        rank="secondary"
        onClick={() => {
          signOutAccount()
          props.onAccount(null)
          props.onRecoveryDone()
          void fetch('/api/logout', { method: 'POST' }).then((res) => {
            if (res.ok) window.location.assign('/')
          })
        }}
      >
        Log out
      </TextBtn>
      </section>

      <section className="account-block">
      <h2>Reset</h2>
      <TextBtn rank="danger" onClick={() => eraseRef.current?.showModal()}>
        Erase this device
      </TextBtn>
      <dialog
        ref={eraseRef}
        className="confirm"
        aria-labelledby="erase-title"
        onClick={(event) => {
          if (event.target === event.currentTarget) event.currentTarget.close()
        }}
      >
        <div className="confirm-sheet">
          <h2 id="erase-title">Erase this device</h2>
          <p>{eraseConfirm(signedIn, signedIn && !props.sync.unsaved && props.sync.savedAt > 0)}</p>
          <div className="confirm-acts">
            <button type="button" className="btn secondary" autoFocus onClick={() => eraseRef.current?.close()}>
              Keep the cards
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={() => {
                eraseRef.current?.close()
                props.onReset()
              }}
            >
              Erase
            </button>
          </div>
        </div>
      </dialog>
      </section>
    </main>
  )
}
