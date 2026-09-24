import { useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { clipUrl } from '@/audio/clip-url'
import { stickPlaybackRate } from '@/audio/rate'
import { gradeThai } from '@/engine/grader-thai'
import { RomanInput } from '@/input/RomanInput'
import { Commit, TextBtn, Trail } from '@/ui/bits'
import { PREVIEW_VOICE } from './catalog'
import '@/styles.css'

type PlaySlot = { audio: HTMLAudioElement | null }

function Speaker() {
  return (
    <svg className="hear-mark" viewBox="0 0 16 16" aria-hidden="true">
      <path
        fill="currentColor"
        d="M2 6.2h2.2L8 3.2v9.6L4.2 9.8H2V6.2zm7.1-1.5a3.6 3.6 0 0 1 0 6.6l-.7-1.1a2.2 2.2 0 0 0 0-4.4l.7-1.1zm1.8-1.6a6 6 0 0 1 0 9.8l-.7-1.1a4.6 4.6 0 0 0 0-7.6l.7-1.1z"
      />
    </svg>
  )
}

function play(id: string, rate: number, slot: PlaySlot) {
  slot.audio?.pause()
  const audio = new Audio(clipUrl(id))
  stickPlaybackRate(audio, rate)
  slot.audio = audio
  void audio.play()
}

function Preview() {
  const [i, setI] = useState(0)
  const [phase, setPhase] = useState<'look' | 'write'>('look')
  const [answer, setAnswer] = useState('')
  const [note, setNote] = useState<string | null>(null)
  const [hint, setHint] = useState<string | null>(null)
  const [hintOpen, setHintOpen] = useState(false)
  const heard = useRef<PlaySlot>({ audio: null })
  const card = PREVIEW_VOICE[i]
  const done = !card

  const check = () => {
    if (!card) return
    const g = gradeThai(card.rom, answer)
    const close = g.verdict === 'tone' || g.verdict === 'length'
    setNote(g.correct ? 'Right.' : close ? 'Almost right.' : g.message)
    setHint(close ? g.message : null)
    setHintOpen(false)
  }

  const next = () => {
    setI(i + 1)
    setPhase('look')
    setAnswer('')
    setNote(null)
    setHint(null)
    setHintOpen(false)
  }

  return (
    <div className="app in-session">
      <div className="shell">
        <Trail
          onHome={() => {
            location.assign('/')
          }}
        />
        <main className="page session">
          {done ? (
            <a className="btn commit" href="/#close">
              Join the waitlist
            </a>
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
                      {card.rom}
                    </p>
                  </>
                ) : null}
                <p className="prompt-en">{card.en[0]}</p>
                <p className="prompt-tools">
                  <TextBtn className="hear-key" onClick={() => play(card.id, 1, heard.current)}>
                    Hear
                    <Speaker />
                  </TextBtn>
                  <TextBtn className="hear-key" onClick={() => play(card.id, 0.7, heard.current)}>
                    Slower
                    <Speaker />
                  </TextBtn>
                </p>
              </div>
              <div className="preview-desk">
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
                    <RomanInput key={card.id} value={answer} onChange={setAnswer} onSubmit={check} autoFocus />
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
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Preview />)
