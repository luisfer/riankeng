import { useEffect, useRef, useState } from 'react'
import { TONES, TONE_LABEL, type Tone } from '@content/system'
import { cleanGloss, gradeEnglish } from '@/engine/grader-en'
import { gradeThai } from '@/engine/grader-thai'
import { analyseRom } from '@/engine/normalize'
import {
  afterHold,
  afterMeet,
  alreadyScored,
  currentItem,
  markCorrect,
  markMissMove,
  markMissStay,
  markScored,
  requeueCurrent,
  type Hold,
  type LiveSession,
} from '@/engine/session'
import { applyAttempt, applyMeet, type ItemProgress } from '@/engine/srs'
import { deviceId } from '@/storage/device'
import type { ProgressDoc } from '@/storage/progress-schema'
import { entryOrThrow, fromVoiceKnown, pairRoms, pickChoices, sittingSense } from '@/engine/scheduler'
import { entryTrack } from '@content/index'
import { judgeTonePick, toneBareShow } from '@/engine/tone-step'
import { prefetchClip } from '@/audio/clips'
import { canHearThai, onVoices, speakSlower, speakThai, speechUnlocked } from '@/audio/tts'
import { RomanInput } from '@/input/RomanInput'
import { Commit, TextBtn } from './bits'
import { chrome } from './copy'
import { showThai } from './thai'

const TONE_ORDER: Tone[] = TONES

/** Pick shows the English gloss only. Rom would give the answer away. */
export function pickPrompt(entry: { en: string[] }): string {
  return cleanGloss(entry.en[0] ?? '')
}

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
  const attemptedRef = useRef(false)
  const track = props.session.track ?? 'voice'
  const script = item ? entryTrack(entryOrThrow(item.id)) === 'script' : track === 'script'
  const meeting = Boolean(item?.meet && !props.session.hold)
  const waitingNext = Boolean(ack && (ack.ok || !props.session.hold))
  const canAdvance = meeting || waitingNext

  useEffect(() => {
    attemptedRef.current = Boolean(item?.scored || props.session.pending)
    setAnswer('')
    setAck(props.session.pending ?? null)
    setHeard(false)
    setToneStep(0)
  }, [item?.id, item?.modality, item?.meet, item?.scored, props.session.pending])

  useEffect(() => onVoices(() => setVoiceTick((n) => n + 1)), [])

  useEffect(() => {
    for (const q of props.session.queue) prefetchClip(q.id)
  }, [props.session.queue])

  useEffect(() => {
    if (!item) return
    if (props.doc.settings.silent) return
    if (!props.doc.settings.autoplay || !speechUnlocked()) return
    const card = entryOrThrow(item.id)
    void speakThai(card.thai, card.id, props.doc.settings.audioRate, { gesture: false })
    setHeard(true)
  }, [item?.id, item?.modality, item?.meet, props.doc.settings.autoplay, props.doc.settings.silent, props.doc.settings.audioRate])

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
        <p className="lede">{chrome.emptySitting}</p>
      </main>
    )
  }

  const entry = entryOrThrow(item.id)
  const hold = props.session.hold

  const goNext = () => {
    if (item.meet && !hold && !ack) {
      const now = Date.now()
      const prev = props.doc.items[entry.id] ?? ({ id: entry.id, stage: 0, due: 0, reps: 0, lapses: 0, lastSeen: 0, days: [], history: [] } satisfies ItemProgress)
      props.onDoc({ ...props.doc, items: { ...props.doc.items, [entry.id]: applyMeet(prev, now) } })
      props.onSession(afterMeet(props.session))
      return
    }
    const verdict = ack ?? props.session.pending
    setAck(null)
    setAnswer('')
    if (hold) props.onSession(afterHold(props.session))
    else if (verdict?.ok) props.onSession(markCorrect(props.session))
    else props.onSession(requeueCurrent(props.session))
  }
  goNextRef.current = goNext

  const noteAttempt = (ok: boolean, v: string, text: string, miss?: 'move' | 'stay', holdNext?: Hold) => {
    if (attemptedRef.current || alreadyScored(props.session)) return false
    attemptedRef.current = true
    const now = Date.now()
    const prev = props.doc.items[entry.id] ?? ({ id: entry.id, stage: 0, due: 0, reps: 0, lapses: 0, lastSeen: 0, days: [], history: [] } satisfies ItemProgress)
    props.onDoc({ ...props.doc, items: { ...props.doc.items, [entry.id]: applyAttempt(prev, { t: now, ok, v, m: item.modality, d: deviceId() }) } })
    let next = markScored(props.session, { ok, text })
    if (miss === 'move') next = markMissMove(next)
    if (miss === 'stay' && holdNext) next = markMissStay(next, holdNext)
    props.onSession(next)
    setAck({ ok, text })
    return true
  }

  const submitThai = () => {
    if (hold?.kind === 'retype-th') {
      const g = gradeThai(hold.target, answer)
      if (g.correct) goNext()
      else setAck({ ok: false, text: `Type it exactly: ${hold.target}` })
      return
    }
    const g = gradeThai(entry.rom, answer)
    if (g.correct) {
      noteAttempt(true, g.verdict, 'Right.')
    } else if (g.verdict === 'tone' || g.verdict === 'length') {
      noteAttempt(false, g.verdict, g.message, 'move')
    } else {
      if (noteAttempt(false, g.verdict === 'empty' || g.verdict === 'invalid' ? g.verdict : 'wrong', g.message, 'stay', { kind: 'retype-th', id: entry.id, target: g.matchedTarget })) {
        setAnswer('')
      }
    }
  }

  const submitEn = () => {
    if (ack || alreadyScored(props.session)) return
    const g = gradeEnglish(entry.en, answer)
    if (g.correct) noteAttempt(true, 'en-ok', 'Right.')
    else noteAttempt(false, 'en-wrong', g.message, 'move')
  }

  const submitTone = (tone: Tone) => {
    if (ack || alreadyScored(props.session)) return
    const nuclei = analyseRom(entry.rom).nuclei
    if (nuclei.length <= 1) {
      const expected = nuclei[0]?.tone ?? 'mid'
      const ok = tone === expected
      noteAttempt(ok, ok ? 'exact' : 'tone', ok ? 'Right.' : `That syllable is ${TONE_LABEL[expected]}.`, ok ? undefined : 'move')
      return
    }
    const judged = judgeTonePick(entry.rom, toneStep, tone)
    if (judged.kind === 'advance') {
      setToneStep(judged.next)
      return
    }
    if (judged.kind === 'right') {
      noteAttempt(true, 'exact', 'Right.')
      return
    }
    noteAttempt(false, 'tone', judged.line, 'move')
  }

  const submitPair = (rom: string) => {
    if (ack || alreadyScored(props.session)) return
    const ok = rom === entry.rom
    noteAttempt(ok, ok ? 'exact' : 'wrong', ok ? 'Right.' : `That was ${entry.rom}.`, ok ? undefined : 'move')
  }

  const submitPick = (thai: string) => {
    if (ack || alreadyScored(props.session)) return
    const ok = thai === entry.thai
    noteAttempt(ok, ok ? 'exact' : 'wrong', ok ? 'Right.' : `That one is ${showThai(entry.thai)}.`, ok ? undefined : 'move')
  }

  const writeRom =
    item.modality === 'listen' || (script && (item.modality === 'th-en' || item.modality === 'en-th'))
  const voiceEn = !script && item.modality === 'th-en'
  const hearable = !props.doc.settings.silent && canHearThai(entry.id)
  const pairing = item.modality === 'listen' && Boolean(entry.minimalPairOf?.length) && !hold && !meeting
  const listenLocked = item.modality === 'listen' && !heard && !hold && !meeting && hearable
  const multiTone = item.modality === 'tone' && analyseRom(entry.rom).nuclei.length > 1
  const sense = meeting ? null : sittingSense(entry, item.modality)
  const fromVoice = script && fromVoiceKnown(props.doc, entry)
  const right = Boolean(ack?.ok)

  const prompt =
    meeting
      ? chrome.meet
      : hold?.kind === 'retype-th'
      ? chrome.retype
      : item.modality === 'pick'
        ? chrome.pick
        : pairing && heard && hearable
          ? chrome.hearWhich
        : item.modality === 'en-th'
          ? chrome.writeRom
          : item.modality === 'th-en'
            ? script
              ? chrome.writeRom
              : chrome.writeMeaning
            : item.modality === 'listen'
              ? chrome.writeHeard
              : multiTone
                ? chrome.toneThis
                : chrome.toneFirst

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
      return <p className="prompt-en">{pickPrompt(entry)}</p>
    }
    if (item.modality === 'listen') return <p className="prompt-listen" />
    if (item.modality === 'tone') {
      const shown = multiTone && !ack ? toneBareShow(entry.rom, toneStep) : toneBareShow(entry.rom)
      return <p className="prompt-rom rom">{shown}</p>
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
    if (!hold && alreadyScored(props.session)) return
    submitThai()
  }

  const trySubmitEn = () => {
    if (listenLocked) {
      setAck({ ok: false, text: 'Hear it first.' })
      return
    }
    if (alreadyScored(props.session)) return
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
            {!props.doc.settings.silent && (
              <>
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
              </>
            )}
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
