import { useEffect, useRef, useState } from 'react'
import { LEVELS, SCRIPT_LEVELS } from '@content/index'
import { activeDays, streak, todayStats, type LevelStatus } from '@/engine/scheduler'
import type { ProgressDoc } from '@/storage/progress-schema'
import { download, exportCsv, exportJson } from '@/storage/export'
import { applyImport, parseExport, previewImport } from '@/storage/import'
import { detectVoice } from '@/audio/tts'
import { Commit, TextBtn } from './bits'

const MONTH_WORD = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const

export function localDayKey(now = Date.now()): string {
  const day = new Date(now)
  day.setHours(0, 0, 0, 0)
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
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
  onGlyphs: () => void
  onReset: () => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [pending, setPending] = useState<ReturnType<typeof parseExport>>(null)
  const [offlineReady, setOfflineReady] = useState(false)
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

  const set = <K extends keyof ProgressDoc['settings']>(key: K, value: ProgressDoc['settings'][K]) => {
    props.onDoc({ ...props.doc, settings: { ...props.doc.settings, [key]: value } })
  }

  return (
    <main className="page account">
      <h1>Account</h1>
      <p className="lede">
        {s > 0 ? `${s} day streak. ` : ''}
        Today {today.correct} of {today.answered || 0}.
      </p>
      <p className="lede">{offlineReady ? 'Works offline.' : 'Needs the network to open.'}</p>

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
              <span className="rom">{st && st.total > 0 ? `${st.mastered}/${st.total}` : 'soon'}</span>
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
              <span className="rom">{st && st.total > 0 ? `${st.mastered}/${st.total}` : 'soon'}</span>
            </li>
          )
        })}
      </ol>

      <h2>Settings</h2>
      <div className="account-actions">
        <TextBtn current={props.doc.settings.theme === 'light'} onClick={() => set('theme', 'light')}>
          Day
        </TextBtn>
        <TextBtn current={props.doc.settings.theme === 'dark'} onClick={() => set('theme', 'dark')}>
          Night
        </TextBtn>
        <TextBtn current={props.doc.settings.theme === 'system'} onClick={() => set('theme', 'system')}>
          System
        </TextBtn>
      </div>
      <label className="field">
        <span>Your name</span>
        <input className="roman-field en" value={props.doc.settings.name} onChange={(e) => set('name', e.target.value)} placeholder="optional" />
      </label>
      <label className="check">
        <input type="checkbox" checked={props.doc.settings.thaiScript} onChange={(e) => set('thaiScript', e.target.checked)} />
        Show Thai script
      </label>
      <label className="field">
        <span>Hear rate {props.doc.settings.audioRate.toFixed(2)}</span>
        <input type="range" min={0.5} max={1.2} step={0.05} value={props.doc.settings.audioRate} onChange={(e) => set('audioRate', Number(e.target.value))} />
      </label>
      <p className={voice.ready ? 'lede' : 'warn'}>{voice.ready ? `Thai voice: ${voice.name}` : voice.warning}</p>

      <h2>Progress file</h2>
      <p className="lede">JSON is the backup you can import. CSV is a table, not a backup.</p>
      <div className="account-actions">
        <TextBtn onClick={() => download('riankeng-progress-v1.json', exportJson(props.doc), 'application/json')}>Export JSON</TextBtn>
        <TextBtn onClick={() => download('riankeng-progress.csv', exportCsv(props.doc), 'text/csv')}>Export CSV</TextBtn>
        <TextBtn onClick={() => fileRef.current?.click()}>Import JSON</TextBtn>
      </div>
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

      <h2>Reset</h2>
      <TextBtn
        onClick={() => {
          if (confirm('Erase cards and any open sitting.')) props.onReset()
        }}
      >
        Erase this device
      </TextBtn>
    </main>
  )
}
