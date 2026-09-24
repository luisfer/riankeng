import { useEffect, useRef, useState } from 'react'
import { allLevelStatus, reviewEntries, stampOpened, unlockCount, withOpened } from '@/engine/scheduler'
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
  normalizeDoc,
  sameDocPayload,
  saveDoc,
  saveSession,
  TAB_CHANNEL,
} from '@/storage/db'
import { emptyDoc, stampDoc, type ProgressDoc } from '@/storage/progress-schema'
import { resetDoc } from '@/storage/import'
import { exportJson } from '@/storage/export'
import { mergeWork } from '@/storage/sync'
import { readAccount, signOutAccount, takeRecoverySession, type AccountSession } from '@/storage/auth'
import { syncAccount } from '@/storage/account-sync'
import { setMirrorWrittenAt } from '@/storage/device'
import * as mirrorFile from '@/storage/mirror-file'
import type { MirrorState } from '@/storage/mirror-file'
import { onVoices } from '@/audio/tts'
import { go, parseHash, replace, type Route } from './hash'
import { Account, khunName } from './Account'
import { Alphabet } from './Alphabet'
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
  const [mirror, setMirror] = useState<FileSystemFileHandle | null>(null)
  const [mirrorState, setMirrorState] = useState<MirrorState>(() =>
    mirrorFile.supported() ? 'off' : 'unsupported',
  )
  const [boot] = useState(() => {
    const recovered = takeRecoverySession()
    return { session: recovered ?? readAccount(), recovery: Boolean(recovered) }
  })
  const [account, setAccount] = useState<AccountSession | null>(boot.session)
  const [recovery, setRecovery] = useState(boot.recovery)
  const mirrorRead = useRef(false)
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
      const nextDoc = stampOpened(result.doc ?? emptyDoc())
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
    if (loadState !== 'ready' || mirrorRead.current) return
    mirrorRead.current = true
    void (async () => {
      const handle = await mirrorFile.held()
      if (!handle) return
      setMirror(handle)
      const state = await mirrorFile.permission(handle)
      setMirrorState(state)
      if (state !== 'granted') return
      const file = await mirrorFile.read(handle)
      if (file) setDoc((d) => stampDoc(mergeWork(d, file)))
    })()
  }, [loadState])

  // Every change goes to the file too, once the typing has settled.
  useEffect(() => {
    if (loadState !== 'ready' || !mirror || mirrorState !== 'granted') return
    const timer = setTimeout(() => {
      void (async () => {
        const file = await mirrorFile.read(mirror)
        if (file && Object.keys(doc.items).length === 0 && file.items.length > 0) return
        const payload = file ? mergeWork(doc, file) : doc
        if (file && !sameDocPayload(payload, doc)) setDoc(stampDoc(payload))
        if (await mirrorFile.write(mirror, exportJson(payload))) {
          const t = Date.now()
          setMirrorWrittenAt(t)
        } else {
          setMirrorState('needs-permission')
        }
      })()
    }, 1500)
    return () => clearTimeout(timer)
  }, [doc, mirror, mirrorState, loadState])

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
    if (loadState !== 'ready' || !account) return
    let cancelled = false
    const timer = setTimeout(() => {
      void syncAccount(docRef.current).then((next) => {
        if (cancelled || !next) return
        if (sameDocPayload(next, docRef.current)) return
        skipSave.current = false
        setDoc(next)
      })
    }, 400)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [doc, loadState, account])

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
        if (parsed.app === 'riankeng') applyRemote(normalizeDoc(parsed))
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

  useEffect(() => onVoices(() => undefined), [])

  const voiceStatuses = allLevelStatus(doc, Date.now(), 'voice')
  const scriptStatuses = allLevelStatus(doc, Date.now(), 'script')
  const yours = reviewEntries(doc)
  const accountLabel = khunName(doc.settings.name) || 'Account'

  const beginLevel = (n: number, track: TrackId) => {
    const list = track === 'script' ? scriptStatuses : voiceStatuses
    if (list[n] && !list[n].unlocked) return
    setDoc((d) => stampDoc(withOpened(d, track, n)))
    const next = startSession(doc, Date.now(), n, track)
    setSession(next)
    go(next.queue.length ? { name: 'session' } : { name: 'journey' })
  }

  const sitThese = (ids: string[]) => {
    const next = startReviewSession(doc, Date.now(), ids, 'voice')
    setSession(next)
    go(next.queue.length ? { name: 'session' } : { name: 'review' })
  }

  const commitDoc = (next: ProgressDoc) => setDoc(stampDoc(stampOpened(next)))

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
    signOutAccount()
    setAccount(null)
    setRecovery(false)
    void mirrorFile.forget()
    setMirror(null)
    setMirrorState(mirrorFile.supported() ? 'off' : 'unsupported')
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
    <div className={`app${inSession ? ' in-session' : ''}${loadState === 'ready' && route.name === 'journey' ? ' home' : ''}`}>
      <div className="shell">
        <Trail
          onHome={inSession ? leaveSitting : () => go({ name: 'journey' })}
          accountLabel={accountLabel}
          onAccount={!inSession && !inIntro && loadState === 'ready' ? () => go({ name: 'account' }) : undefined}
          level={trailLevel}
          remaining={inSession && session ? remaining(session) : undefined}
          correct={inSession && session ? session.correct : undefined}
          lessonDone={lessonStatus ? unlockCount(lessonStatus, trailTrack ?? 'voice') : undefined}
          lessonTotal={lessonStatus?.total}
          onPause={inSession || inIntro ? leaveSitting : undefined}
          place={route.name === 'track' ? undefined : trailPlace}
          track={route.name === 'track' ? route.track : trailTrack}
          onSwitchTrack={route.name === 'track' ? (track) => go({ name: 'track', track }) : undefined}
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
            onReset={eraseDevice}
            account={account}
            onAccount={setAccount}
            recovery={recovery}
            onRecoveryDone={() => setRecovery(false)}
          />
        )}
      </div>
    </div>
  )
}
