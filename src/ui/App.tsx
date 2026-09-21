import { useEffect, useRef, useState } from 'react'
import { allLevelStatus, reviewEntries, unlockCount } from '@/engine/scheduler'
import {
  canContinue,
  canResumeReview,
  isFinished,
  normalizeSession,
  pauseSession,
  remaining,
  sessionStillValid,
  startReviewSession,
  startSession,
  type LiveSession,
} from '@/engine/session'
import type { TrackId } from '@content/types'
import {
  fromMirror,
  loadDoc,
  loadSession,
  MIRROR_KEY,
  sameDocPayload,
  saveDoc,
  saveSession,
  TAB_CHANNEL,
} from '@/storage/db'
import { emptyDoc, stampDoc, type ProgressDoc } from '@/storage/progress-schema'
import { resetDoc } from '@/storage/import'
import { onVoices } from '@/audio/tts'
import { go, parseHash, replace, type Route } from './hash'
import { applyTheme } from './theme'
import { Account } from './Account'
import { Alphabet } from './Alphabet'
import { Glyphs } from './Glyphs'
import { Journey } from './Journey'
import { TrackPage } from './TrackPage'
import { ReviewPage } from './AlreadyYours'
import { LevelIntro } from './LevelIntro'
import { SessionView } from './Session'
import { Trail } from './bits'

export function App() {
  const [doc, setDoc] = useState<ProgressDoc>(() => emptyDoc())
  const [session, setSession] = useState<LiveSession | null>(null)
  const [loadState, setLoadState] = useState<'pending' | 'ready' | 'failed'>('pending')
  const [route, setRoute] = useState<Route>(() => parseHash())
  const persistOk = useRef(false)
  const skipSave = useRef(false)
  const hydratedSnapshot = useRef<ProgressDoc | null>(null)
  const docRef = useRef(doc)
  docRef.current = doc

  useEffect(() => {
    const onHash = () => setRoute(parseHash())
    window.addEventListener('hashchange', onHash)
    if (!window.location.hash) window.location.hash = '#/'
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (loadState !== 'ready') return
    if (route.name !== 'session') return
    if (session && !isFinished(session)) return
    replace({ name: 'journey' })
  }, [loadState, route.name, session])

  useEffect(() => {
    let alive = true
    void (async () => {
      const result = await loadDoc()
      const stored = await loadSession()
      if (!alive) return
      const live = stored ? normalizeSession(stored) : null
      if ((result.status === 'timeout' || result.status === 'failed') && !result.doc) {
        persistOk.current = false
        setSession(null)
        setLoadState('failed')
        return
      }
      const nextDoc = result.doc ?? emptyDoc()
      setDoc(nextDoc)
      hydratedSnapshot.current = nextDoc
      persistOk.current = true
      setSession(live && sessionStillValid(live, nextDoc.createdAt) ? live : null)
      setLoadState('ready')
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    if (!persistOk.current || loadState !== 'ready') return
    if (skipSave.current) {
      skipSave.current = false
      return
    }
    const snap = hydratedSnapshot.current
    if (snap && sameDocPayload(snap, doc)) return
    hydratedSnapshot.current = null
    void saveDoc(doc)
  }, [doc, loadState])

  useEffect(() => {
    if (loadState !== 'ready') return
    void saveSession(session)
  }, [session, loadState])

  useEffect(() => {
    const applyRemote = (incoming: ProgressDoc) => {
      if (incoming.updatedAt <= docRef.current.updatedAt) return
      skipSave.current = true
      persistOk.current = true
      setLoadState('ready')
      setDoc(incoming)
    }
    let ch: BroadcastChannel | null = null
    try {
      ch = new BroadcastChannel(TAB_CHANNEL)
      ch.onmessage = (ev: MessageEvent) => {
        const at = (ev.data as { updatedAt?: number } | null)?.updatedAt
        if (typeof at !== 'number' || at <= docRef.current.updatedAt) return
        const mirrored = fromMirror()
        if (mirrored) applyRemote(mirrored)
      }
    } catch {
      /* unsupported */
    }
    const onStorage = (ev: StorageEvent) => {
      if (ev.key !== MIRROR_KEY || !ev.newValue) return
      try {
        const parsed = JSON.parse(ev.newValue) as ProgressDoc
        if (parsed.app === 'riankeng') applyRemote(parsed)
      } catch {
        /* ignore */
      }
    }
    window.addEventListener('storage', onStorage)
    return () => {
      ch?.close()
      window.removeEventListener('storage', onStorage)
    }
  }, [])

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
  const yours = reviewEntries(doc)
  const accountLabel = doc.settings.name.trim() || 'Account'

  const beginLevel = (n: number, track: TrackId) => {
    const list = track === 'script' ? scriptStatuses : voiceStatuses
    if (list[n] && !list[n].unlocked) return
    const next = startSession(doc, Date.now(), n, track)
    setSession(next)
    go(next.queue.length ? { name: 'session' } : { name: 'journey' })
  }

  const sitThese = (ids: string[]) => {
    const next = startReviewSession(doc, Date.now(), ids, 'voice')
    setSession(next)
    go(next.queue.length ? { name: 'session' } : { name: 'review' })
  }

  const commitDoc = (next: ProgressDoc) => setDoc(stampDoc(next))

  const onSession = (s: LiveSession) => {
    if (isFinished(s) && s.answered > 0) {
      setDoc((d) =>
        stampDoc({
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
        }),
      )
      setSession(null)
      go({ name: 'journey' })
      return
    }
    setSession(s)
  }

  const eraseDevice = () => {
    const next = resetDoc()
    persistOk.current = true
    setLoadState('ready')
    setDoc(next)
    setSession(null)
    void saveSession(null)
    go({ name: 'journey' })
  }

  const inSession = route.name === 'session' && session && !isFinished(session)
  const inIntro = route.name === 'intro'
  const trailTrack =
    inSession && session && !session.review
      ? (session.track ?? 'voice')
      : inIntro && route.name === 'intro'
        ? route.track
        : undefined
  const trailLevel =
    inSession && session && !session.review ? session.level : inIntro && route.name === 'intro' ? route.n : undefined
  const trailPlace =
    route.name === 'review' || (inSession && session?.review)
      ? 'Already yours'
      : route.name === 'alphabet'
        ? 'The whole script'
        : route.name === 'track'
          ? route.track === 'script'
            ? 'Script'
            : 'Voice'
          : undefined
  const lessonStatus =
    inSession && session && !session.review
      ? (session.track === 'script' ? scriptStatuses : voiceStatuses)[session.level]
      : inIntro && route.name === 'intro'
        ? (route.track === 'script' ? scriptStatuses : voiceStatuses)[route.n]
        : undefined
  const leaveSitting = () => {
    if (inSession && session) {
      const next = pauseSession(session)
      if (next !== session) {
        onSession(next)
        if (isFinished(next)) return
      }
    }
    go({ name: 'journey' })
  }

  return (
    <div className={`app${inSession ? ' in-session' : ''}`}>
      <div className="shell">
        <Trail
          onHome={inSession ? leaveSitting : () => go({ name: 'journey' })}
          accountLabel={accountLabel}
          onAccount={!inSession && !inIntro && loadState === 'ready' ? () => go({ name: 'account' }) : undefined}
          track={trailTrack}
          level={trailLevel}
          remaining={inSession && session ? remaining(session) : undefined}
          correct={inSession && session ? session.correct : undefined}
          lessonDone={lessonStatus ? unlockCount(lessonStatus, trailTrack ?? 'voice') : undefined}
          lessonTotal={lessonStatus?.total}
          onPause={inSession || inIntro ? leaveSitting : undefined}
          place={trailPlace}
        />
        {loadState === 'pending' && <main className="page" />}
        {loadState === 'failed' && (
          <main className="page">
            <p className="lede">Progress did not load.</p>
          </main>
        )}
        {loadState === 'ready' && route.name === 'journey' && (
          <Journey
            voice={voiceStatuses}
            script={scriptStatuses}
            onTrack={(track) => go({ name: 'track', track })}
            onReview={() => go({ name: 'review' })}
            onAlphabet={() => go({ name: 'alphabet' })}
          />
        )}
        {loadState === 'ready' && route.name === 'track' && (
          <TrackPage
            track={route.track}
            statuses={route.track === 'script' ? scriptStatuses : voiceStatuses}
            onOpen={(track, n) => {
              const list = track === 'script' ? scriptStatuses : voiceStatuses
              if (list[n] && list[n].total > 0 && !list[n].unlocked) return
              go({ name: 'intro', n, track })
            }}
          />
        )}
        {loadState === 'ready' && route.name === 'review' && (
          <ReviewPage
            pool={yours}
            audioRate={doc.settings.audioRate}
            onSit={sitThese}
            canResume={canResumeReview(session)}
            onResume={() => go({ name: 'session' })}
          />
        )}
        {loadState === 'ready' && route.name === 'alphabet' && (
          <Alphabet
            doc={doc}
            unlocked={(n) => {
              const s = scriptStatuses[n]
              return !s || s.total === 0 || s.unlocked
            }}
            onOpen={(n) => {
              const s = scriptStatuses[n]
              if (s && s.total > 0 && !s.unlocked) return
              go({ name: 'intro', n, track: 'script' })
            }}
          />
        )}
        {loadState === 'ready' && route.name === 'intro' && (
          <LevelIntro
            n={route.n}
            track={route.track}
            locked={Boolean(
              (route.track === 'script' ? scriptStatuses : voiceStatuses)[route.n] &&
                !(route.track === 'script' ? scriptStatuses : voiceStatuses)[route.n]!.unlocked,
            )}
            canContinue={canContinue(session, route.track, route.n)}
            seen={lessonStatus?.seen}
            done={lessonStatus ? unlockCount(lessonStatus, route.track) : undefined}
            total={lessonStatus?.total}
            onStart={() => beginLevel(route.n, route.track)}
            onContinue={() => go({ name: 'session' })}
          />
        )}
        {loadState === 'ready' && route.name === 'session' && session && (
          <SessionView doc={doc} session={session} onDoc={commitDoc} onSession={onSession} />
        )}
        {loadState === 'ready' && route.name === 'account' && (
          <Account
            doc={doc}
            voice={voiceStatuses}
            script={scriptStatuses}
            onDoc={commitDoc}
            onGlyphs={() => go({ name: 'glyphs' })}
            onReset={eraseDevice}
          />
        )}
        {loadState === 'ready' && route.name === 'glyphs' && <Glyphs />}
      </div>
    </div>
  )
}
