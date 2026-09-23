import { useEffect, useRef, useState } from 'react'
import { LEVELS, SCRIPT_LEVELS } from '@content/index'
import { activeDays, streak, todayStats, type LevelStatus } from '@/engine/scheduler'
import type { ProgressDoc } from '@/storage/progress-schema'
import { download, exportCsv, exportJson } from '@/storage/export'
import { applyImport, parseExport, previewImport } from '@/storage/import'
import { detectVoice } from '@/audio/tts'
import {
  accountConfig,
  changePassword,
  sendPasswordReset,
  signInAccount,
  signOutAccount,
  updatePassword,
  type AccountSession,
} from '@/storage/auth'
import type { MirrorState } from '@/storage/mirror-file'
import { Commit, TextBtn } from './bits'

const MONTH_WORD = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

export const ERASE_CONFIRM = 'Erase cards on this browser and sign out? The account keeps its copy.'

export function localDayKey(now = Date.now()): string {
  const day = new Date(now)
  day.setHours(0, 0, 0, 0)
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
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
  /** The file this device keeps up to date, if the learner has chosen one. */
  mirror: {
    state: MirrorState
    writtenAt: number
    onStart: () => void | Promise<void>
    onStop: () => void | Promise<void>
    onAuthorise: () => void | Promise<void>
  }
  onGlyphs: () => void
  onReset: () => void
  account: AccountSession | null
  onAccount: (session: AccountSession | null) => void
  recovery: boolean
  onRecoveryDone: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [pending, setPending] = useState<ReturnType<typeof parseExport>>(null)
  const [offlineReady, setOfflineReady] = useState(false)
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [nextPassword, setNextPassword] = useState('')
  const [signingIn, setSigningIn] = useState(false)
  const [signInNote, setSignInNote] = useState('')
  const [passwordNote, setPasswordNote] = useState('')
  const days = activeDays(props.doc)
  const cells = lastWeeks(12)
  const months = heatMonthMarks(cells)
  const todayKey = localDayKey()
  const today = todayStats(props.doc)
  const s = streak(props.doc)
  const voice = detectVoice()

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      setOfflineReady(import.meta.env.DEV)
      return
    }
    let cancelled = false
    const mark = () => {
      if (!cancelled) setOfflineReady(true)
    }
    void navigator.serviceWorker.ready.then(mark)
    navigator.serviceWorker.addEventListener('controllerchange', mark)
    if (import.meta.env.DEV) {
      void navigator.serviceWorker.getRegistration().then((reg) => {
        if (!reg) mark()
      })
    }
    return () => {
      cancelled = true
      navigator.serviceWorker.removeEventListener('controllerchange', mark)
    }
  }, [])

  useEffect(() => {
    const up = () => setOnline(true)
    const down = () => setOnline(false)
    window.addEventListener('online', up)
    window.addEventListener('offline', down)
    return () => {
      window.removeEventListener('online', up)
      window.removeEventListener('offline', down)
    }
  }, [])

  const set = <K extends keyof ProgressDoc['settings']>(key: K, value: ProgressDoc['settings'][K]) => {
    props.onDoc({ ...props.doc, settings: { ...props.doc.settings, [key]: value } })
  }

  const cards = Object.keys(props.doc.items).length
  const mirroring = props.mirror.state === 'granted'
  const signedIn = Boolean(props.account)
  const stale = !mirroring && backupStale(props.doc.settings.lastBackupAt)
  const where = signedIn
    ? mirroring
      ? 'this device, your file, and your account'
      : 'this device, and your account'
    : mirroring
      ? 'this device, and your file'
      : 'this device'
  const submitSignIn = () => {
    if (!accountConfig()) {
      setSignInNote('Sign in is not set up on this copy.')
      return
    }
    setSigningIn(true)
    setSignInNote('')
    void signInAccount(email, password).then((session) => {
      setSigningIn(false)
      if (!session) {
        setSignInNote('Could not sign in.')
        return
      }
      setPassword('')
      props.onAccount(session)
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
  const backUp = () => {
    download('riankeng-progress-v1.json', exportJson(props.doc), 'application/json')
    set('lastBackupAt', Date.now())
  }

  return (
    <main className="page account">
      <h1>Account</h1>
      <p className="lede">
        {s > 0 ? `${s} day streak. ` : ''}
        Today {today.correct} of {today.answered || 0}.
      </p>
      <h2>{signedIn ? 'Signed in' : 'Sign in'}</h2>
      {signedIn ? (
        <>
          <p className="lede">{props.account?.displayName || props.account?.email}</p>
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
            <TextBtn disabled={signingIn} onClick={submitReset}>
              Send a reset link
            </TextBtn>
          </div>
          {signInNote && <p className="lede">{signInNote}</p>}
        </form>
      )}

      <h2>Your progress</h2>
      <ul className="status">
        <li>
          <span>Where it lives</span>
          <span className="status-value">{where}</span>
        </li>
        <li>
          <span>Cards with progress</span>
          <span className="status-value">{cards}</span>
        </li>
        <li>
          <span>Last saved</span>
          <span className="status-value">{agoWords(props.doc.updatedAt)}</span>
        </li>
        <li>
          <span>Opens without network</span>
          <span className={offlineReady ? 'status-value' : 'status-value warn'}>
            {offlineReady ? 'yes' : 'not yet'}
          </span>
        </li>
        <li>
          <span>Network now</span>
          <span className="status-value">{online ? 'online' : 'offline'}</span>
        </li>
        <li>
          <span>Backup file</span>
          {props.mirror.state === 'granted' ? (
            <span className="status-value">kept up to date, {agoWords(props.mirror.writtenAt)}</span>
          ) : props.mirror.state === 'needs-permission' ? (
            <span className="status-value warn">needs permission again</span>
          ) : (
            <span className={stale ? 'status-value warn' : 'status-value'}>
              {agoWords(props.doc.settings.lastBackupAt)}
            </span>
          )}
        </li>
      </ul>
      <p className="lede status-note">
        {signedIn
          ? 'Saved on this browser and on the account.'
          : mirroring
            ? 'Saved on this browser and in the file.'
            : 'Saved on this browser.'}
      </p>
      <div className="account-actions">
        <Commit onClick={backUp}>Back up now</Commit>
        {props.mirror.state === 'off' && (
          <TextBtn onClick={() => void props.mirror.onStart()}>Keep a file up to date</TextBtn>
        )}
        {props.mirror.state === 'needs-permission' && (
          <TextBtn onClick={() => void props.mirror.onAuthorise()}>Authorise the file again</TextBtn>
        )}
        {mirroring && <TextBtn onClick={() => void props.mirror.onStop()}>Stop writing to the file</TextBtn>}
        <TextBtn onClick={() => fileRef.current?.click()}>Restore from a file</TextBtn>
        <TextBtn onClick={() => download('riankeng-progress.csv', exportCsv(props.doc), 'text/csv')}>
          Export CSV
        </TextBtn>
      </div>

      <div className="heat-wrap">
        <div className="heat" aria-label="twelve week heatmap, Sunday first">
          {cells.map((key) => {
            const n = days.get(key) ?? 0
            const band = n === 0 ? 0 : n < 4 ? 1 : n < 10 ? 2 : 3
            const todayCell = key === todayKey
            return (
              <span
                key={key}
                className={`heat-c c${band}${todayCell ? ' today' : ''}`}
                title={`${key}, ${n}`}
              />
            )
          })}
        </div>
        <div className="heat-months" aria-hidden>
          {months.map((m, i) => (
            <span key={`m-${i}`}>{m ?? ''}</span>
          ))}
        </div>
      </div>
      <p className="heat-legend">Each column is a week. Sunday at the top.</p>

      <h2>Voice</h2>
      <ol className="mini-index" start={0}>
        {LEVELS.map((lvl) => {
          const st = props.voice[lvl.n]
          return (
            <li key={`v-${lvl.n}`}>
              <span>{lvl.n}</span>
              <span>{lvl.title}</span>
              <span className="rom">{st && st.total > 0 ? `${st.seen}/${st.total}` : 'soon'}</span>
            </li>
          )
        })}
      </ol>
      <h2>Script</h2>
      <ol className="mini-index" start={0}>
        {SCRIPT_LEVELS.map((lvl) => {
          const st = props.script[lvl.n]
          return (
            <li key={`s-${lvl.n}`}>
              <span>{lvl.n}</span>
              <span>{lvl.title}</span>
              <span className="rom">{st && st.total > 0 ? `${st.seen}/${st.total}` : 'soon'}</span>
            </li>
          )
        })}
      </ol>

      <h2>Settings</h2>
      <label className="field">
        <span>Your name</span>
        <input className="roman-field en" value={props.doc.settings.name} onChange={(e) => set('name', e.target.value)} placeholder="optional" />
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
      <label className="field">
        <span>Hear rate {props.doc.settings.audioRate.toFixed(2)}</span>
        <input type="range" min={0.5} max={1.2} step={0.05} value={props.doc.settings.audioRate} onChange={(e) => set('audioRate', Number(e.target.value))} />
      </label>
      <p className={voice.ready ? 'lede' : 'warn'}>{voice.ready ? `Thai voice: ${voice.name}` : voice.warning}</p>
      <p className="lede">Clips when they exist. The Mac voice misses tones.</p>

      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const file = e.target.files?.[0]
          if (!file) return
          const raw = await file.text()
          const parsed = parseExport(raw)
          setPending(parsed)
          setPreview(parsed ? previewImport(props.doc, parsed).message : 'Not a riankeng progress file.')
          e.target.value = ''
        }}
      />
      {preview && (
        <div className="import-box">
          <p>{preview}</p>
          {pending && (
            <Commit
              onClick={() => {
                props.onDoc(applyImport(props.doc, pending))
                setPreview(previewImport(props.doc, pending).message.replace('would merge', 'merged'))
                setPending(null)
              }}
            >
              Apply import
            </Commit>
          )}
        </div>
      )}

      <h2>Type</h2>
      <div className="account-actions">
        <TextBtn onClick={props.onGlyphs}>Glyph coverage</TextBtn>
      </div>

      <h2>Course password</h2>
      <p className="lede">Ends the password on this browser. Cards stay on this device.</p>
      <TextBtn
        onClick={() => {
          void fetch('/api/logout', { method: 'POST' }).then((res) => {
            if (res.ok) window.location.assign('/')
          })
        }}
      >
        Log out
      </TextBtn>

      <h2>Reset</h2>
      <TextBtn
        onClick={() => {
          if (confirm(ERASE_CONFIRM)) props.onReset()
        }}
      >
        Erase this device
      </TextBtn>
    </main>
  )
}
