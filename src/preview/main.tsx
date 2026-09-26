import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { clipUrl } from '@/audio/clip-url'
import { stickPlaybackRate } from '@/audio/rate'
import { cleanGloss } from '@/engine/grader-en'
import { gradeThai } from '@/engine/grader-thai'
import { RomanInput } from '@/input/RomanInput'
import { Commit, HearBtn, TextBtn, Trail } from '@/ui/bits'
import { ToneRom } from '@/ui/ToneRom'
import { announceClip } from '@/audio/voice-clock'
import { PREVIEW_IDS, PREVIEW_VOICE } from './catalog'
import { clearProgress, loadProgress, saveProgress } from './progress'
import { rememberRef } from '@/landing/ref'
import '@/styles.css'

type PlaySlot = { audio: HTMLAudioElement | null }

function play(id: string, rate: number, slot: PlaySlot) {
  slot.audio?.pause()
  const audio = new Audio(clipUrl(id))
  stickPlaybackRate(audio, rate)
  slot.audio = audio
  announceClip(id, audio)
  void audio.play()
}

const TOTAL = PREVIEW_VOICE.length

function Finish(props: { slot: PlaySlot; onAgain: () => void }) {
  return (
    <div className="preview-finish">
      <h1 className="preview-finish-h">{TOTAL} words of daily speech, heard and written.</h1>
      <ul className="preview yours-list">
        {PREVIEW_VOICE.map((w) => (
          <li key={w.id} className="quiet-row yours-row">
            <span className="rom" lang="th-Latn">
              {w.rom}
            </span>
            <span>{cleanGloss(w.en[0] ?? '')}</span>
            <span className="thai preview-thai" lang="th">
              {w.thai}
            </span>
            <HearBtn rank="quiet" onClick={() => play(w.id, 1, props.slot)}>
              Hear
            </HearBtn>
          </li>
        ))}
      </ul>
      <p className="preview-finish-lede">The course carries on from these words. It opens to the waitlist first.</p>
      <div className="preview-finish-act">
        <a className="btn commit" href="/#close">
          Join the waitlist
        </a>
        <TextBtn onClick={props.onAgain}>Start over</TextBtn>
      </div>
    </div>
  )
}

function Preview() {
  const [saved] = useState(() => loadProgress(PREVIEW_IDS))
  const [i, setI] = useState(saved.at)
  const [learned, setLearned] = useState<ReadonlySet<string>>(() => new Set(saved.done))
  const [phase, setPhase] = useState<'look' | 'write'>('look')
  const [answer, setAnswer] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [hintOpen, setHintOpen] = useState(false)
  const [misses, setMisses] = useState(0)
  const [finished, setFinished] = useState(saved.done.length === TOTAL)
  const heard = useRef<PlaySlot>({ audio: null })
  /** Bumped by Hear and Slower, so the pitch lines draw again with the voice. */
  const [drawn, setDrawn] = useState(0)
  const card = PREVIEW_VOICE[i]!

  useEffect(() => {
    saveProgress({ at: i, done: PREVIEW_IDS.filter((id) => learned.has(id)) })
  }, [i, learned])

  const check = () => {
    const g = gradeThai(card.rom, answer)
    const close = g.verdict === 'tone' || g.verdict === 'length'
    setNote(g.correct ? 'Right.' : close ? 'Almost right.' : g.message)
    setHint(close ? g.message : null)
    setHintOpen(false)
    if (g.correct) setLearned((s) => new Set(s).add(card.id))
    else setMisses((n) => n + 1)
  }

  const goTo = (k: number) => {
    setI(Math.min(Math.max(k, 0), TOTAL - 1))
    setPhase('look')
    setAnswer('')
    setNote(null)
    setHint(null)
    setHintOpen(false)
  }

  /** After a right answer: the next card, after the last the first one still to learn, and once all are learned the close. */
  const next = () => {
    if (learned.size === TOTAL) return setFinished(true)
    if (i + 1 < TOTAL) return goTo(i + 1)
    const open = PREVIEW_VOICE.findIndex((w) => !learned.has(w.id))
    if (open >= 0) goTo(open)
  }

  const startOver = () => {
    clearProgress()
    setLearned(new Set())
    setFinished(false)
    goTo(0)
  }

  const canContinue = !finished && (phase === 'look' || note === 'Right.')
  const goOn = useRef<() => void>(next)
  goOn.current = phase === 'look' ? () => setPhase('write') : next

  useEffect(() => {
    if (!canContinue) return
    let armed = false
    const frame = requestAnimationFrame(() => {
      armed = true
    })
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat || e.isComposing || !armed) return
      e.preventDefault()
      goOn.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKey)
    }
  }, [canContinue, i, phase])

  return (
    <div className="app in-session">
      <div className="shell">
        <Trail
          onHome={() => {
            location.assign('/')
          }}
          place="Preview"
          lessonDone={learned.size}
          lessonTotal={TOTAL}
        />
        <main className="page session">
          {finished ? (
            <Finish slot={heard.current} onAgain={startOver} />
          ) : (
            <div className="preview-stage">
              <span className="session-no" aria-hidden="true">
                {i + 1}
              </span>
              <div className={`preview-word${note === 'Right.' ? ' right' : ''}`}>
                {phase === 'look' || note === 'Right.' ? (
                  <>
                    <p className="prompt-thai" lang="th">
                      {card.thai}
                    </p>
                    <p className="prompt-rom rom" lang="th-Latn">
                      <ToneRom rom={card.rom} draw={drawn} voice={card.id} />
                    </p>
                  </>
                ) : null}
                <p className="prompt-en">{cleanGloss(card.en[0] ?? '')}</p>
                <p className="prompt-tools">
                  <HearBtn
                    onClick={() => {
                      setDrawn((d) => d + 1)
                      play(card.id, 1, heard.current)
                    }}
                  >
                    Hear
                  </HearBtn>
                  <HearBtn
                    onClick={() => {
                      setDrawn((d) => d + 1)
                      play(card.id, 0.7, heard.current)
                    }}
                  >
                    Slower
                  </HearBtn>
                </p>
              </div>
              <div className="preview-desk">
                {learned.has(card.id) && note !== 'Right.' && <p className="preview-learned">Learned</p>}
                {phase === 'look' ? (
                  <Commit onClick={() => setPhase('write')}>Continue</Commit>
                ) : note === 'Right.' ? (
                  <>
                    <p className="feedback session-feedback ok" role="status">
                      Right.
                    </p>
                    <Commit onClick={next}>Continue</Commit>
                  </>
                ) : (
                  <form
                    className="answer-form"
                    onSubmit={(e) => {
                      e.preventDefault()
                      check()
                    }}
                  >
                    <RomanInput
                      key={card.id}
                      value={answer}
                      onChange={setAnswer}
                      onSubmit={check}
                      autoFocus
                      focusToken={misses}
                    />
                    <Commit type="submit">Check</Commit>
                  </form>
                )}
                {note && note !== 'Right.' && (
                  <p className="feedback session-feedback miss" role="status">
                    {note}
                  </p>
                )}
                {hint && !hintOpen && <TextBtn onClick={() => setHintOpen(true)}>Hint</TextBtn>}
                {hintOpen && hint && <p className="preview-hint">{hint}</p>}
                <p className="preview-nav">
                  <TextBtn onClick={() => goTo(i - 1)} disabled={i === 0}>
                    Previous word
                  </TextBtn>
                  <span className="preview-count">
                    {i + 1} of {TOTAL}
                  </span>
                  <TextBtn onClick={() => goTo(i + 1)} disabled={i === TOTAL - 1}>
                    Next word
                  </TextBtn>
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

// A link straight to the preview keeps its tag for the waitlist it leads to.
rememberRef()
createRoot(document.getElementById('root')!).render(<Preview />)
