import { Fragment, useEffect, useRef, useState } from 'react'
import { clipUrl } from '@/audio/clip-url'
import { SLOWER, stickPlaybackRate } from '@/audio/rate'
import { gradeThai, type ThaiGrade } from '@/engine/grader-thai'
import { RomanInput } from '@/input/RomanInput'
import { Commit, HearBtn } from '@/ui/bits'
import { chrome } from '@/ui/copy'
import { ToneRom } from '@/ui/ToneRom'
import { announceClip } from '@/audio/voice-clock'
import { landing } from './copy'
import { sceneSrc, sceneSrcSet, type DemoCard } from './demo'
import type { Track } from './events'

/** A panel on the page was clicked. detail is its stem. */
export const TRY_EVENT = 'riankeng:try'

/**
 * One real card from Voice. Unseen cards on the course open on Look; this
 * does the same, then the write. The grader and the clips are the course's.
 * track, when given, counts each play and each Check (src/landing/events.ts).
 */
export function TryCard(props: { deck: DemoCard[]; track?: Track }) {
  const [at, setAt] = useState(0)
  const [phase, setPhase] = useState<'look' | 'write'>('look')
  const [value, setValue] = useState('')
  const [grade, setGrade] = useState<ThaiGrade | null>(null)
  const [pasted, setPasted] = useState(false)
  const [focusField, setFocusField] = useState(false)
  /** Bumped by Hear and Slower, so the pitch lines draw again with the voice. */
  const [drawn, setDrawn] = useState(0)
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

  const play = (rate: number, how: 'normal' | 'slow' | 'auto') => {
    setDrawn((d) => d + 1)
    audio.current?.pause()
    const a = new Audio(clipUrl(card.id))
    stickPlaybackRate(a, rate)
    audio.current = a
    announceClip(card.id, a)
    void a.play()?.catch(() => undefined)
    props.track?.('hear', { card: card.id, detail: how })
  }

  const goWrite = () => {
    setPhase('write')
    setFocusField(true)
    // Continue is a tap, so the browser lets the clip play: nobody writes a card unheard.
    play(1, 'auto')
    // The panel shrinks on a phone in the write phase; bring that frame to the top so the
    // picture and the field share the first screen.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        document.querySelector<HTMLElement>('.try[data-phase="write"]')?.scrollIntoView({
          block: 'start',
          behavior: 'smooth',
        })
      })
    })
  }

  const check = () => {
    const g = gradeThai(card.rom, value)
    setGrade(g)
    props.track?.('check', { card: card.id, detail: g.verdict, typed: g.correct ? undefined : value })
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
            {/* Text and breaks straight in the balloon, as comic.ts letters it. A span per line
                would make each line its own flex item, side by side. */}
            {card.balloon.lines.map((line, i) => (
              <Fragment key={line}>
                {i > 0 && <br />}
                {line}
              </Fragment>
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
                <HearBtn onClick={() => play(1, 'normal')}>{landing.hear}</HearBtn>
                <HearBtn onClick={() => play(SLOWER, 'slow')}>{landing.slower}</HearBtn>
              </span>
            </p>
          )}
          <div className="try-copy">
            {look && (
              <p className="try-rom rom" lang="th-Latn">
                <ToneRom rom={card.rom} draw={drawn} voice={card.id} />
              </p>
            )}
            <p className="try-en">{card.en}</p>
            {right && (
              <div className="try-pair">
                <p className="pair-line rom">
                  <span lang="th-Latn">
                    <ToneRom rom={card.rom} draw={drawn} voice={card.id} />
                  </span>
                  <span className="prompt-tools">
                    <HearBtn onClick={() => play(1, 'normal')}>{landing.hear}</HearBtn>
                    <HearBtn onClick={() => play(SLOWER, 'slow')}>{landing.slower}</HearBtn>
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
                  focusToken={grade && !grade.correct ? grade : undefined}
                />
                <Commit type="submit">{landing.check}</Commit>
              </form>
            )}
            {grade?.verdict === 'tone' && grade.toneSlips.length > 0 && (
              <p className="slip-line rom" lang="th-Latn">
                <ToneRom rom={grade.matchedTarget} slips={new Map(grade.toneSlips.map((s) => [s.syllable, s.got]))} voice={card.id} />
              </p>
            )}
          </div>
          <div className="try-act">
            {look && (
              <div className="try-go">
                <Commit onClick={goWrite}>{landing.continue}</Commit>
              </div>
            )}
            {/* While writing, the line is there empty, so a miss fills it without moving the card. */}
            {(line || !look) && (
              <p className={`feedback session-feedback${right ? ' ok' : ' miss'}`} role="status">
                {line}
              </p>
            )}
            {right && (
              <div className="try-next">
                {/* The next step after a card, beside the next card. The page opens the form at #close. */}
                <a className="text-btn try-wait" href="#close" onClick={() => props.track?.('cta', { detail: 'waitlist-card' })}>
                  {landing.waitlist}
                </a>
                <Commit onClick={next}>{landing.next}</Commit>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
