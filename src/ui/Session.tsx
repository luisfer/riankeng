import { useEffect, useRef, useState } from 'react'
import { TONES, TONE_LABEL, type Tone } from '@content/system'
import { cleanGloss, gradeEnglish } from '@/engine/grader-en'
import { gradeThai } from '@/engine/grader-thai'
import { analyseRom } from '@/engine/normalize'
import {
  afterHold,
  afterMeet,
  currentItem,
  markCorrect,
  markMissMove,
  markMissStay,
  requeueCurrent,
  type LiveSession,
} from '@/engine/session'
import { applyAttempt, type ItemProgress } from '@/engine/srs'
import type { ProgressDoc } from '@/storage/progress-schema'
import { entryOrThrow, pairRoms, pickChoices, sittingSense } from '@/engine/scheduler'
import { judgeTonePick, toneSyllableShow } from '@/engine/tone-step'
import { canHearThai, onVoices, speakSlower, speakThai, speechUnlocked } from '@/audio/tts'
import { RomanInput } from '@/input/RomanInput'
import { Commit, TextBtn } from './bits'
import { showThai } from './thai'

const TONE_ORDER: Tone[] = TONES

export function SessionView(props: {
  doc: ProgressDoc
  session: LiveSession
  onDoc: (doc: ProgressDoc) => void
  onSession: (s: LiveSession) => void
}) {
  const item = currentItem(props.session)
  const [answer, setAnswer] = useState('')
  const [ack, setAck] = useState<{ ok: boolean; text: string } | null>(null)
  const [heard, setHeard] = useState(false)
  const [toneStep, setToneStep] = useState(0)
  const [, setVoiceTick] = useState(0)
  const goNextRef = useRef(() => {})
  const track = props.session.track ?? 'voice'
  const script = track === 'script'
  const meeting = Boolean(item?.meet && !props.session.hold)
  const waitingNext = Boolean(ack && (ack.ok || !props.session.hold))
  const canAdvance = meeting || waitingNext

  useEffect(() => {
    setAnswer('')
    setAck(null)
    setHeard(false)
    setToneStep(0)
  }, [item?.id, item?.modality, item?.meet])

  useEffect(() => onVoices(() => setVoiceTick((n) => n + 1)), [])

  useEffect(() => {
    if (!item) return
    if (!props.doc.settings.autoplay || !speechUnlocked()) return
    const card = entryOrThrow(item.id)
    void speakThai(card.thai, card.id, props.doc.settings.audioRate, { gesture: false })
    setHeard(true)
  }, [item?.id, item?.modality, item?.meet, props.doc.settings.autoplay, props.doc.settings.audioRate])

  useEffect(() => {
    if (!canAdvance) return
    let armed = false
    const frame = requestAnimationFrame(() => {
      armed = true
    })
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.repeat || !armed) return
      e.preventDefault()
      goNextRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', onKey)
    }
  }, [canAdvance])

  if (!item) {
    return (
      <main className="page session">
        <p className="lede">This session is empty. Come back when a level has words.</p>
      </main>
    )
  }

  const entry = entryOrThrow(item.id)
  const hold = props.session.hold

  const record = (ok: boolean, v: string) => {
    const now = Date.now()
    const prev = props.doc.items[entry.id] ?? ({ id: entry.id, stage: 0, due: 0, reps: 0, lapses: 0, lastSeen: 0, days: [], history: [] } satisfies ItemProgress)
    const nextItem = applyAttempt(prev, { t: now, ok, v, m: item.modality })
    props.onDoc({ ...props.doc, items: { ...props.doc.items, [entry.id]: nextItem } })
  }

  const goNext = () => {
    if (item.meet && !hold && !ack) {
      props.onSession(afterMeet(props.session))
      return
    }
    setAck(null)
    setAnswer('')
    if (hold) props.onSession(afterHold(props.session))
    else if (ack?.ok) props.onSession(markCorrect(props.session))
    else props.onSession(requeueCurrent(props.session))
  }
  goNextRef.current = goNext

  const submitThai = () => {
    if (hold?.kind === 'retype-th') {
      const g = gradeThai(hold.target, answer)
      if (g.correct) goNext()
      else setAck({ ok: false, text: `Type it exactly: ${hold.target}` })
      return
    }
    const g = gradeThai(entry.rom, answer)
    if (g.correct) {
      record(true, g.verdict)
      setAck({ ok: true, text: 'Right.' })
    } else {
      record(false, 'wrong')
      props.onSession(markMissStay(props.session, { kind: 'retype-th', id: entry.id, target: g.matchedTarget }))
      setAck({ ok: false, text: g.message })
      setAnswer('')
    }
  }

  const submitEn = () => {
    if (ack) return
    const g = gradeEnglish(entry.en, answer)
    if (g.correct) {
      record(true, 'en-ok')
      setAck({ ok: true, text: 'Right.' })
    } else {
      // Show the meaning and move on; the card comes back later in the sitting.
      record(false, 'en-wrong')
      props.onSession(markMissMove(props.session))
      setAck({ ok: false, text: g.message })
    }
  }

  const submitTone = (tone: Tone) => {
    if (ack) return
    const nuclei = analyseRom(entry.rom).nuclei
    if (nuclei.length <= 1) {
      const expected = nuclei[0]?.tone ?? 'mid'
      const ok = tone === expected
      record(ok, ok ? 'exact' : 'tone')
      if (ok) {
        setAck({ ok: true, text: 'Right.' })
      } else {
        props.onSession(markMissMove(props.session))
        setAck({ ok: false, text: `That syllable is ${TONE_LABEL[expected]}.` })
      }
      return
    }
    const judged = judgeTonePick(entry.rom, toneStep, tone)
    if (judged.kind === 'advance') {
      setToneStep(judged.next)
      return
    }
    if (judged.kind === 'right') {
      record(true, 'exact')
      setAck({ ok: true, text: 'Right.' })
      return
    }
    record(false, 'tone')
    props.onSession(markMissMove(props.session))
    setAck({ ok: false, text: judged.line })
  }

  const submitPair = (rom: string) => {
    if (ack) return
    const ok = rom === entry.rom
    record(ok, ok ? 'exact' : 'wrong')
    if (ok) {
      setAck({ ok: true, text: 'Right.' })
    } else {
      props.onSession(markMissMove(props.session))
      setAck({ ok: false, text: `That was ${entry.rom}.` })
    }
  }

  const submitPick = (thai: string) => {
    if (ack) return
    const ok = thai === entry.thai
    record(ok, ok ? 'exact' : 'wrong')
    if (ok) {
      setAck({ ok: true, text: 'Right.' })
    } else {
      props.onSession(markMissMove(props.session))
      setAck({ ok: false, text: `That one is ${showThai(entry.thai)}.` })
    }
  }

  const writeRom =
    item.modality === 'listen' || (script && (item.modality === 'th-en' || item.modality === 'en-th'))
  const voiceEn = !script && item.modality === 'th-en'
  const hearable = canHearThai(entry.id)
  const pairing = item.modality === 'listen' && Boolean(entry.minimalPairOf?.length) && !hold && !meeting
  const listenLocked = item.modality === 'listen' && !heard && !hold && !meeting && hearable
  const multiTone = item.modality === 'tone' && analyseRom(entry.rom).nuclei.length > 1
  const sense = meeting ? null : sittingSense(entry, item.modality)
  const fromVoice = script && entry.tags.some((t) => t.startsWith('voice:w:'))
  const right = Boolean(ack?.ok)

  const prompt =
    meeting
      ? 'Here it is.'
      : hold?.kind === 'retype-th'
      ? 'Retype the romanization.'
      : item.modality === 'pick'
        ? 'Which one is this?'
        : pairing && heard && hearable
          ? 'Which did you hear?'
        : item.modality === 'en-th'
          ? script
            ? 'Write it in romanization.'
            : 'Write it so you can say it.'
          : item.modality === 'th-en'
            ? script
              ? 'Write this the way you already say it.'
              : 'What does this mean?'
            : item.modality === 'listen'
              ? 'Write what you would say.'
              : multiTone
                ? 'What tone is this syllable.'
                : 'What tone is the first syllable?'

  /** The other half of the card, shown in lacquer once the answer is right. */
  const pairLine = (() => {
    if (!right) return null
    if (item.modality === 'th-en') return cleanGloss(entry.en[0] ?? '')
    if (item.modality === 'en-th' || item.modality === 'listen' || item.modality === 'tone') return entry.rom
    if (item.modality === 'pick') return showThai(entry.thai)
    return null
  })()

  const stimulus = (() => {
    if (meeting) {
      if (script) {
        return (
          <>
            <p className="prompt-thai thai">{showThai(entry.thai)}</p>
            <p className="prompt-rom rom">{entry.rom}</p>
            <p className="prompt-en">{cleanGloss(entry.en[0] ?? '')}</p>
          </>
        )
      }
      return (
        <>
          <p className="prompt-rom rom">{entry.rom}</p>
          <p className="prompt-en">{cleanGloss(entry.en[0] ?? '')}</p>
        </>
      )
    }
    if (hold) {
      return (
        <p className="reveal rom">
          {hold.target}
          {props.doc.settings.thaiScript && <span className="thai"> {entry.thai}</span>}
        </p>
      )
    }
    if (item.modality === 'pick') {
      return (
        <p className="prompt-en">
          {cleanGloss(entry.en[0] ?? '')}
          <span className="rom pick-rom"> {entry.rom}</span>
        </p>
      )
    }
    if (item.modality === 'listen') return <p className="prompt-listen" />
    if (item.modality === 'tone') {
      if (multiTone && !ack) {
        return <p className="prompt-rom rom">{toneSyllableShow(entry.rom, toneStep)}</p>
      }
      return props.doc.settings.thaiScript ? (
        <p className="prompt-thai thai">{showThai(entry.thai)}</p>
      ) : (
        <p className="prompt-rom rom">{entry.rom}</p>
      )
    }
    if (item.modality === 'en-th') return <p className="prompt-en">{cleanGloss(entry.en[0] ?? '')}</p>
    if (item.modality === 'th-en' && script) return <p className="prompt-thai thai">{showThai(entry.thai)}</p>
    if (item.modality === 'th-en') {
      return (
        <p className="prompt-rom rom">
          {entry.rom}
          {props.doc.settings.thaiScript && <span className="thai"> {entry.thai}</span>}
        </p>
      )
    }
    return null
  })()

  const onPaste = () => {
    if (!ack) setAck({ ok: false, text: 'Type it.' })
  }

  const trySubmitThai = () => {
    if (listenLocked) {
      setAck({ ok: false, text: 'Hear it first.' })
      return
    }
    submitThai()
  }

  const trySubmitEn = () => {
    if (listenLocked) {
      setAck({ ok: false, text: 'Hear it first.' })
      return
    }
    submitEn()
  }

  const desk = meeting ? (
    <div className="answer-form">
      <div />
      <Commit onClick={goNext}>Continue</Commit>
    </div>
  ) : waitingNext ? (
    <div className="answer-form">
      <div />
      <Commit onClick={goNext}>Next</Commit>
    </div>
  ) : pairing && hearable && !heard ? (
    <div className="answer-form">
      <div />
    </div>
  ) : pairing && hearable && heard && !hold ? (
    <div className="tone-picks">
      {pairRoms(entry).map((rom) => (
        <button key={rom} type="button" className="tone-word rom" onClick={() => submitPair(rom)}>
          {rom}
        </button>
      ))}
    </div>
  ) : item.modality === 'pick' && !hold ? (
    <div className="glyph-picks">
      {pickChoices(entry).map((thai, i) => (
        <button key={`${thai}-${i}`} type="button" className="glyph-pick thai" onClick={() => submitPick(thai)}>
          {showThai(thai)}
        </button>
      ))}
    </div>
  ) : item.modality === 'tone' && !hold ? (
    <div className="tone-picks">
      {TONE_ORDER.map((t) => (
        <button key={t} type="button" className="tone-word" onClick={() => submitTone(t)}>
          {TONE_LABEL[t]}
        </button>
      ))}
    </div>
  ) : voiceEn ? (
    <form
      className="answer-form"
      onSubmit={(e) => {
        e.preventDefault()
        submitEn()
      }}
    >
      <div className="roman">
        <div className="roman-line">
          <input
            className="roman-field en"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            onPaste={(e) => {
              e.preventDefault()
              onPaste()
            }}
            autoFocus
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>
        <div className="strip" aria-hidden />
      </div>
      <Commit type="submit">Check</Commit>
    </form>
  ) : (
    <form
      className="answer-form"
      onSubmit={(e) => {
        e.preventDefault()
        if (writeRom || item.modality === 'en-th' || hold?.kind === 'retype-th') trySubmitThai()
        else trySubmitEn()
      }}
    >
      <RomanInput
        value={answer}
        onChange={setAnswer}
        onSubmit={writeRom || item.modality === 'en-th' || hold?.kind === 'retype-th' ? trySubmitThai : trySubmitEn}
        onPasteBlock={onPaste}
        autoFocus
      />
      <Commit type="submit">Check</Commit>
    </form>
  )

  return (
    <main className="page session">
      <div className="session-stage">
        <p className="prompt session-prompt">
          {prompt}
          <span className="prompt-tools">
            <TextBtn
              current={listenLocked}
              onClick={() => {
                setHeard(true)
                if (ack?.text === 'Hear it first.') setAck(null)
                void speakThai(entry.thai, entry.id, props.doc.settings.audioRate, { gesture: true })
              }}
            >
              Hear
            </TextBtn>
            <TextBtn
              onClick={() => {
                setHeard(true)
                if (ack?.text === 'Hear it first.') setAck(null)
                void speakSlower(entry.thai, entry.id, props.doc.settings.audioRate, { gesture: true })
              }}
            >
              Slower
            </TextBtn>
            {fromVoice && <span className="from-voice">You know this from Voice</span>}
          </span>
        </p>
        <div className={`session-stimulus${right ? ' right' : ''}`}>
          {stimulus}
          {pairLine && (
            <p className={`pair-line${item.modality === 'pick' ? ' thai' : item.modality === 'th-en' ? '' : ' rom'}`}>
              {pairLine}
            </p>
          )}
          {sense && !right && (
            <p className="sense-line">{sense}</p>
          )}
          {item.modality === 'listen' && !hearable && !meeting && (
            <p className="sense-line">No Thai voice on this device.</p>
          )}
        </div>
        <p className={`feedback session-feedback${ack ? (ack.ok ? ' ok' : ' miss') : ''}`} role="status">
          {ack?.text ?? ''}
        </p>
        <div className="session-desk">{desk}</div>
      </div>
    </main>
  )
}
