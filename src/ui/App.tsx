import { useEffect, useState } from 'react'
import { allLevelStatus, seenEntries } from '@/engine/scheduler'
import { isFinished, normalizeSession, remaining, startSession, type LiveSession } from '@/engine/session'
import type { TrackId } from '@content/types'
import { loadDoc, loadSession, saveDoc, saveSession } from '@/storage/db'
import { emptyDoc, type ProgressDoc } from '@/storage/progress-schema'
import { onVoices } from '@/audio/tts'
import { go, parseHash, type Route } from './hash'
import { applyTheme, resolvedTheme } from './theme'
import { Account } from './Account'
import { Alphabet } from './Alphabet'
import { Glyphs } from './Glyphs'
import { Journey } from './Journey'
import { ReviewPage } from './AlreadyYours'
import { LevelIntro } from './LevelIntro'
import { SessionView } from './Session'
import { Trail } from './bits'

export function App() {
  const [doc, setDoc] = useState<ProgressDoc>(() => emptyDoc())
  const [session, setSession] = useState<LiveSession | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [route, setRoute] = useState<Route>(() => parseHash())

  useEffect(() => {
    const onHash = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHash)
    if (!window.location.hash) window.location.hash = '#/'
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    let alive = true
    void (async () => {
      const [d, s] = await Promise.all([loadDoc(), loadSession()])
      if (!alive) return
      setDoc(d)
      setSession(s ? normalizeSession(s) : s)
      setHydrated(true)
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!hydrated) return
    void saveDoc(doc)
  }, [doc, hydrated])

  useEffect(() => {
    if (!hydrated) return
    void saveSession(session)
  }, [session, hydrated])

  useEffect(() => {
    applyTheme(doc.settings.theme)
  }, [doc.settings.theme])

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const sync = () => applyTheme(doc.settings.theme)
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [doc.settings.theme])

  useEffect(() => onVoices(() => undefined), [])

  const voiceStatuses = allLevelStatus(doc, Date.now(), 'voice')
  const scriptStatuses = allLevelStatus(doc, Date.now(), 'script')
  const yours = seenEntries(doc, 'voice')
  const accountLabel = doc.settings.name.trim() || 'Account'
  const resolved = resolvedTheme(doc.settings.theme)

  const beginLevel = (n: number, track: TrackId) => {
    const list = track === 'script' ? scriptStatuses : voiceStatuses
    if (list[n] && !list[n].unlocked) return
    const next = startSession(doc, Date.now(), n, track)
    setSession(next)
    go(next.queue.length ? { name: 'session' } : { name: 'journey' })
  }

  const onSession = (s: LiveSession) => {
    if (isFinished(s) && s.answered > 0) {
      setDoc((d) => ({
        ...d,
        sessions: [
          ...d.sessions,
          {
            startedAt: s.startedAt,
            endedAt: Date.now(),
            level: s.level,
            track: s.track ?? 'voice',
            answered: s.answered,
            correct: s.correct,
          },
        ],
      }))
      setSession(null)
      go({ name: 'journey' })
      return
    }
    setSession(s)
  }

  const flipTheme = () => {
    setDoc((d) => ({
      ...d,
      settings: { ...d.settings, theme: resolvedTheme(d.settings.theme) === 'dark' ? 'light' : 'dark' },
    }))
  }

  const inSession = route.name === 'session' && session && !isFinished(session)
  const inIntro = route.name === 'intro'
  const trailTrack = inSession && session ? (session.track ?? 'voice') : inIntro && route.name === 'intro' ? route.track : undefined
  const trailLevel = inSession && session ? session.level : inIntro && route.name === 'intro' ? route.n : undefined
  const trailPlace = route.name === 'review' ? 'Already yours' : route.name === 'alphabet' ? 'The whole script' : undefined

  return (
    <div className={`app${inSession ? ' in-session' : ''}`}>
      <div className="shell">
        <Trail
          onHome={() => go({ name: 'journey' })}
          accountLabel={accountLabel}
          onAccount={!inSession && !inIntro ? () => go({ name: 'account' }) : undefined}
          track={trailTrack}
          level={trailLevel}
          remaining={inSession && session ? remaining(session) : undefined}
          correct={inSession && session ? session.correct : undefined}
          onPause={inSession || inIntro ? () => go({ name: 'journey' }) : undefined}
          themeLabel={resolved === 'dark' ? 'Day' : 'Night'}
          onTheme={flipTheme}
          place={trailPlace}
        />
        {route.name === 'journey' && (
          <Journey
            voice={voiceStatuses}
            script={scriptStatuses}
            onOpen={(track, n) => {
              const list = track === 'script' ? scriptStatuses : voiceStatuses
              if (list[n] && list[n].total > 0 && !list[n].unlocked) return
              go({ name: 'intro', n, track })
            }}
            onReview={() => go({ name: 'review' })}
            onAlphabet={() => go({ name: 'alphabet' })}
          />
        )}
        {route.name === 'review' && <ReviewPage pool={yours} />}
        {route.name === 'alphabet' && <Alphabet doc={doc} onOpen={(n) => go({ name: 'intro', n, track: 'script' })} />}
        {route.name === 'intro' && (
          <LevelIntro
            n={route.n}
            track={route.track}
            locked={Boolean(
              (route.track === 'script' ? scriptStatuses : voiceStatuses)[route.n] &&
                !(route.track === 'script' ? scriptStatuses : voiceStatuses)[route.n]!.unlocked,
            )}
            onStart={() => beginLevel(route.n, route.track)}
          />
        )}
        {route.name === 'session' && session && <SessionView doc={doc} session={session} onDoc={setDoc} onSession={onSession} />}
        {route.name === 'account' && (
          <Account
            doc={doc}
            voice={voiceStatuses}
            script={scriptStatuses}
            onDoc={setDoc}
            onGlyphs={() => go({ name: 'glyphs' })}
          />
        )}
        {route.name === 'glyphs' && <Glyphs />}
      </div>
    </div>
  )
}
