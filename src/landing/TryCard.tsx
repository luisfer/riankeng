import { useEffect, useRef, useState } from 'react'
import { clipUrl } from '@/audio/clip-url'
import { stickPlaybackRate } from '@/audio/rate'
import { gradeThai, type ThaiGrade } from '@/engine/grader-thai'
import { RomanInput } from '@/input/RomanInput'
import { Commit, TextBtn } from '@/ui/bits'
import { chrome } from '@/ui/copy'
import { landing } from './copy'
import { sceneSrc, sceneSrcSet, type DemoCard } from './demo'

/** A panel on the page was clicked. detail is its stem. */
export const TRY_EVENT = 'riankeng:try'

/**
 * One real card from Voice. Unseen cards on the course open on Look; this
 * does the same, then the write. The grader and the clips are the course's.
 */
export function TryCard(props: { deck: DemoCard[] }) {
  const [at, setAt] = useState(0)
  const [phase, setPhase] = useState<'look' | 'write'>('look')
  const [value, setValue] = useState('')
  const [grade, setGrade] = useState<ThaiGrade | null>(null)
  const [pasted, setPasted] = useState(false)
  const [focusField, setFocusField] = useState(false)
  const audio = useRef<HTMLAudioElement | null>(null)
  const card = props.deck[at] ?? props.deck[0]!

  const reset = () => {
    setPhase('look')
    setValue('')
    setGrade(null)
    setPasted(false)
    setFocusField(false)
    audio.current?.pause()
  }

  useEffect(() => {
    const onTry = (e: Event) => {
      const stem = (e as CustomEvent<string>).detail
      const k = props.deck.findIndex((d) => d.stem === stem)
      if (k < 0) return
      setAt(k)
      reset()
    }
    window.addEventListener(TRY_EVENT, onTry)
    return () => window.removeEventListener(TRY_EVENT, onTry)
  }, [props.deck])

  const play = (rate: number) => {
    audio.current?.pause()
    const a = new Audio(clipUrl(card.id))
    stickPlaybackRate(a, rate)
    audio.current = a
    void a.play().catch(() => undefined)
  }

  const goWrite = () => {
    setPhase('write')
    setFocusField(true)
  }

  const check = () => {
    setGrade(gradeThai(card.rom, value))
  }

  const next = () => {
    setAt((at + 1) % props.deck.length)
    reset()
  }

  const right = grade?.correct === true
  const look = phase === 'look' && !right
  const line = right ? landing.right : grade ? grade.message : pasted ? landing.pasteOff : ''
  const letter = look || right

  return (
    <div className="try" data-stem={card.stem} data-phase={look ? 'look' : right ? 'right' : 'write'}>
      <div className="try-panel" data-scene={card.stem}>
        <img
          className="try-art"
          src={sceneSrc(card.stem)}
          srcSet={sceneSrcSet(card.stem)}
          sizes="(max-width: 720px) calc(100vw - 48px), 420px"
          width={980}
          height={980}
          alt={card.alt}
          loading="lazy"
          decoding="async"
        />
        {letter && (
          <span
            className="balloon"
            lang="th"
            style={{ ['--em' as string]: card.balloon.em, ['--lines' as string]: card.balloon.lines.length }}
          >
            {card.balloon.lines.map((line, i) => (
              <span key={line}>
                {i > 0 && <br />}
                {line}
              </span>
            ))}
          </span>
        )}
      </div>
      <div className="try-desk">
        <div className="try-stage">
          {!right && (
            <p className="prompt">
              {look ? null : chrome.writeRom}
              <span className="prompt-tools">
                <TextBtn onClick={() => play(1)}>{landing.hear}</TextBtn>
                <TextBtn onClick={() => play(0.6)}>{landing.slower}</TextBtn>
              </span>
            </p>
          )}
          <div className="try-copy">
            {look && (
              <p className="try-rom rom" lang="th-Latn">
                {card.rom}
              </p>
            )}
            <p className="try-en">{card.en}</p>
            {right && (
              <div className="try-pair">
                <p className="pair-line rom">
                  <span lang="th-Latn">{card.rom}</span>
                  <span className="prompt-tools">
                    <TextBtn onClick={() => play(1)}>{landing.hear}</TextBtn>
                    <TextBtn onClick={() => play(0.6)}>{landing.slower}</TextBtn>
                  </span>
                </p>
                <p className="pair-line thai" lang="th">
                  {card.thai}
                </p>
              </div>
            )}
            {!look && !right && (
              <form
                className="answer-form"
                onSubmit={(e) => {
                  e.preventDefault()
                  check()
                }}
              >
                <RomanInput
                  value={value}
                  onChange={(v) => {
                    setValue(v)
                    if (grade) setGrade(null)
                  }}
                  onSubmit={check}
                  onPasteBlock={() => setPasted(true)}
                  autoFocus={focusField}
                />
                <Commit type="submit">{landing.check}</Commit>
              </form>
            )}
          </div>
          <div className="try-act">
            {look && (
              <div className="try-go">
                <Commit onClick={goWrite}>{landing.continue}</Commit>
              </div>
            )}
            {line && (
              <p className={`feedback session-feedback${right ? ' ok' : ' miss'}`} role="status">
                {line}
              </p>
            )}
            {right && (
              <div className="try-next">
                <Commit onClick={next}>{landing.next}</Commit>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
