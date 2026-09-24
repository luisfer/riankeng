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
  const heard = useRef<PlaySlot>({ audio: null })
  const card = PREVIEW_VOICE[i]
  const done = !card

  const check = () => {
    if (!card) return
    const g = gradeThai(card.rom, answer)
    setNote(g.correct ? 'Right.' : g.message)
  }

  const next = () => {
    setI(i + 1)
    setPhase('look')
    setAnswer('')
    setNote(null)
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
            <div className="session-stage">
              <p className="account-quiet">
                {i + 1} of {PREVIEW_VOICE.length}
              </p>
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
                <TextBtn rank="quiet" onClick={() => play(card.id, 1, heard.current)}>
                  Hear
                </TextBtn>
                <TextBtn rank="quiet" onClick={() => play(card.id, 0.7, heard.current)}>
                  Slower
                </TextBtn>
              </p>
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
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<Preview />)
