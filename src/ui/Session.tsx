import { useEffect, useRef, useState, type ReactNode } from 'react'
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
  sittingModality,
  type Hold,
  type LiveSession,
} from '@/engine/session'
import { applyAttempt, applyMeet, type ItemProgress } from '@/engine/srs'
import { deviceId } from '@/storage/device'
import type { ProgressDoc } from '@/storage/progress-schema'
import { entryOrThrow, fromVoiceKnown, pairRoms, pickChoices, sittingSense, stampOpened } from '@/engine/scheduler'
import { entryTrack } from '@content/index'
import { judgeTonePick, toneBareShow } from '@/engine/tone-step'
import { enThTarget, twinAnswer } from '@/engine/twins'
import { prefetchClip } from '@/audio/clips'
import { canHearThai, onVoices, speakSlower, speakThai, speechUnlocked } from '@/audio/tts'
import { RomanInput } from '@/input/RomanInput'
import { Commit, HearBtn } from './bits'
import { chrome } from './copy'
import { showThai } from './thai'

const TONE_ORDER: Tone[] = TONES

/** Pick shows the English gloss only. Rom would give the answer away. */
export function pickPrompt(entry: { en: string[] }): string {
  return cleanGloss(entry.en[0] ?? '')
}

/**
 * The target as it is written, with the syllables the grader named set in lacquer:
 * the way the tone marks are the only lacquer in the mark. Anything it cannot place stays plain.
 */
export function slipSpans(target: string, slips: number[]): ReactNode {
  if (!slips.length) return target
  const out: ReactNode[] = []
  let at = 0
  for (const [i, chunk] of analyseRom(target).syllables.entries()) {
    // A glottal break is written as a hyphen in the target, not as the apostrophe the skeleton keeps.
    const syllable = chunk.replaceAll("'", '')
    const from = target.indexOf(syllable, at)
    if (from < 0) return target
    if (from > at) out.push(target.slice(at, from))
    out.push(slips.includes(i) ? <span key={i} className="slip">{syllable}</span> : syllable)
    at = from + syllable.length
  }
  if (at < target.length) out.push(target.slice(at))
  return out
}

/** A card's usage note and word-for-word reading, shown when the card is met. Thai in a note sets in the Thai face. */
export function MeetNotes(props: { entry: { note?: string; literal?: string } }) {
  const { note, literal } = props.entry
  if (!note && !literal) return null
  return (
    <>
      {literal && <p className="prompt-note">Literally, {literal}.</p>}
      {note && (
        <p className="prompt-note">
          {note.split(/([\u0E00-\u0E7F]+)/).map((part, i) =>
            /[\u0E00-\u0E7F]/.test(part) ? (
              <span key={i} className="thai" lang="th">
                {showThai(part)}
              </span>
            ) : (
              part
            ),
          )}
        </p>
      )}
    </>
  )
}

/** The card's place in the sitting: every card finished so far, a Look included, plus this one. */
export function cardNumber(session: LiveSession): number {
  return (session.step ?? session.answered) + 1
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
  const [hint, setHint] = useState<string | null>(null)
  const [heard, setHeard] = useState(false)
  const [toneStep, setToneStep] = useState(0)
  const [slipLine, setSlipLine] = useState<{ target: string; slips: number[] } | null>(null)
  const [, setVoiceTick] = useState(0)
  const goNextRef = useRef(() => {})
  const attemptedRef = useRef(false)
  const track = props.session.track ?? 'voice'
  const script = item ? entryTrack(entryOrThrow(item.id)) === 'script' : track === 'script'
  const meeting = Boolean(item?.meet && !props.session.hold)
  const waitingNext = Boolean(props.session.pending && (props.session.pending.ok || !props.session.hold))
  const canAdvance = meeting || waitingNext

  useEffect(() => {
    attemptedRef.current = Boolean(item?.scored || props.session.pending)
    setAnswer('')
    setAck(props.session.pending ?? null)
    setHint(null)
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
    if (!item || props.doc.settings.silent) return
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.metaKey || e.ctrlKey || e.repeat) return
      const key = e.key.toLowerCase()
      if (key !== 'h' && key !== 's') return
      e.preventDefault()
      const card = entryOrThrow(item.id)
      setHeard(true)
      setHint(null)
      if (key === 'h') void speakThai(card.thai, card.id, props.doc.settings.audioRate, { gesture: true })
      else void speakSlower(card.thai, card.id, props.doc.settings.audioRate, { gesture: true })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [item, props.doc.settings.silent, props.doc.settings.audioRate])

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
      props.onDoc(stampOpened({ ...props.doc, items: { ...props.doc.items, [entry.id]: applyMeet(prev, now) } }))
      props.onSession(afterMeet(props.session))
      return
    }
    const verdict = ack ?? props.session.pending
    setAck(null)
    setAnswer('')
    setSlipLine(null)
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
    const practice = !ok && Boolean(item.penalized)
    const canHearNow = !props.doc.settings.silent && canHearThai(entry.id)
    const modality = sittingModality(item, canHearNow)
    props.onDoc(
      stampOpened({
        ...props.doc,
        items: {
          ...props.doc.items,
          [entry.id]: applyAttempt(prev, { t: now, ok, v, m: modality, d: deviceId(), ...(practice ? { p: 1 as const } : {}) }, { practice }),
        },
      }),
    )
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
    const writingFromEnglish = modality === 'en-th'
    const g = gradeThai(writingFromEnglish ? enThTarget(entry) : entry.rom, answer)
    if (g.verdict === 'empty' || g.verdict === 'invalid' || /[\u0E00-\u0E7F]/.test(answer)) {
      setHint(g.verdict === 'empty' || !answer.trim() ? chrome.typeAnswer : g.verdict === 'invalid' ? g.message : chrome.writeRom)
      return
    }
    // The English had two right answers, and this is the other one. It counts, and the card names its own.
    const twin = !g.correct && writingFromEnglish ? twinAnswer(entry, answer, (id) => Boolean(props.doc.items[id])) : null
    if (g.correct) {
      noteAttempt(true, g.verdict, chrome.right)
    } else if (twin) {
      noteAttempt(true, 'exact', `${chrome.alsoRight} ${entry.rom}.`)
    } else if (g.verdict === 'tone' || g.verdict === 'length') {
      if (noteAttempt(false, g.verdict, g.message, 'move')) {
        setSlipLine({ target: g.matchedTarget ?? entry.rom, slips: g.toneSlips.map((s) => s.syllable) })
      }
    } else {
      if (noteAttempt(false, 'wrong', g.message, 'stay', { kind: 'retype-th', id: entry.id, target: g.matchedTarget })) {
        setAnswer('')
      }
    }
  }

  const submitEn = () => {
    if (ack || alreadyScored(props.session)) return
    const g = gradeEnglish(entry.en, answer)
    if (!answer.trim() || /[\u0E00-\u0E7F]/.test(answer)) {
      setHint(chrome.typeAnswer)
      return
    }
    if (g.correct) noteAttempt(true, 'en-ok', chrome.right)
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
      noteAttempt(true, 'exact', chrome.right)
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

  const hearable = !props.doc.settings.silent && canHearThai(entry.id)
  const modality = sittingModality(item, hearable)
  const writeRom =
    modality === 'listen' || (script && (modality === 'th-en' || modality === 'en-th'))
  const voiceEn = !script && modality === 'th-en'
  const pairing = modality === 'listen' && Boolean(entry.minimalPairOf?.length) && !hold && !meeting
  const listenLocked = modality === 'listen' && !heard && !hold && !meeting && hearable
  const multiTone = modality === 'tone' && analyseRom(entry.rom).nuclei.length > 1
  const sense = meeting ? null : sittingSense(entry, modality)
  const fromVoice = script && fromVoiceKnown(props.doc, entry)
  const right = Boolean(ack?.ok)

  const prompt =
    meeting
      ? chrome.meet
      : hold?.kind === 'retype-th'
      ? chrome.retype
      : modality === 'pick'
        ? chrome.pick
        : pairing && heard && hearable
          ? chrome.hearWhich
        : modality === 'en-th'
          ? chrome.writeRom
          : modality === 'th-en'
            ? script
              ? chrome.writeRom
              : chrome.writeMeaning
            : modality === 'listen'
              ? chrome.writeHeard
              : multiTone
                ? chrome.toneThis
                : chrome.toneFirst

  /** The other half of the card, shown in lacquer once the answer is right. */
  const pairLine = (() => {
    if (!right) return null
    if (modality === 'th-en') return cleanGloss(entry.en[0] ?? '')
    if (modality === 'en-th' || modality === 'listen' || modality === 'tone') return entry.rom
    if (modality === 'pick') return showThai(entry.thai)
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
            <MeetNotes entry={entry} />
          </>
        )
      }
      return (
        <>
          <p className="prompt-rom rom">{entry.rom}</p>
          <p className="prompt-en">{cleanGloss(entry.en[0] ?? '')}</p>
          <MeetNotes entry={entry} />
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
    if (modality === 'pick') {
      return <p className="prompt-en">{pickPrompt(entry)}</p>
    }
    if (modality === 'listen') return <p className="prompt-listen" />
    if (modality === 'tone') {
      const shown = multiTone && !ack ? toneBareShow(entry.rom, toneStep) : toneBareShow(entry.rom)
      return <p className="prompt-rom rom">{shown}</p>
    }
    if (modality === 'en-th') return <p className="prompt-en">{cleanGloss(entry.en[0] ?? '')}</p>
    if (modality === 'th-en' && script) return <p className="prompt-thai thai">{showThai(entry.thai)}</p>
    if (modality === 'th-en') {
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
    if (!ack) setHint(chrome.typeIt)
  }

  const trySubmitThai = () => {
    if (listenLocked) {
      setHint(chrome.hearFirst)
      return
    }
    if (!hold && alreadyScored(props.session)) return
    submitThai()
  }

  const trySubmitEn = () => {
    if (listenLocked) {
      setHint(chrome.hearFirst)
      return
    }
    if (alreadyScored(props.session)) return
    submitEn()
  }

  const desk = meeting ? (
    <div className="answer-form bare">
      <div />
      <Commit onClick={goNext}>Continue</Commit>
    </div>
  ) : waitingNext ? (
    /* What was written stays on its line, and Next stands where Check stood. */
    <div className={answer ? 'answer-form said' : 'answer-form bare'}>
      <p className={`answer-said${voiceEn ? ' en' : ' rom'}`}>{answer}</p>
      <Commit onClick={goNext}>Next</Commit>
    </div>
  ) : pairing && hearable && !heard ? (
    <div className="answer-form bare">
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
  ) : modality === 'pick' && !hold ? (
    <div className="glyph-picks">
      {pickChoices(entry).map((thai, i) => (
        <button key={`${thai}-${i}`} type="button" className="glyph-pick thai" onClick={() => submitPick(thai)}>
          {showThai(thai)}
        </button>
      ))}
    </div>
  ) : modality === 'tone' && !hold ? (
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
        if (writeRom || modality === 'en-th' || hold?.kind === 'retype-th') trySubmitThai()
        else trySubmitEn()
      }}
    >
      <RomanInput
        value={answer}
        onChange={setAnswer}
        onSubmit={writeRom || modality === 'en-th' || hold?.kind === 'retype-th' ? trySubmitThai : trySubmitEn}
        onPasteBlock={onPaste}
        autoFocus
        focusToken={ack?.ok === false ? ack : undefined}
      />
      <Commit type="submit">Check</Commit>
    </form>
  )

  return (
    <main className="page session">
      <div className="session-stage">
        <p className="prompt session-prompt">{prompt}</p>
        {/* The card's place in this sitting, hung in the margin the way a primer numbers its exercises. */}
        <span className="session-no" aria-hidden="true">
          {cardNumber(props.session)}
        </span>
        <div className={`session-stimulus${right ? ' right' : ''}`}>
          {stimulus}
          {pairLine && (
            <p className={`pair-line${modality === 'pick' ? ' thai' : modality === 'th-en' ? '' : ' rom'}`}>
              {pairLine}
            </p>
          )}
          {slipLine && ack && !ack.ok && <p className="slip-line rom">{slipSpans(slipLine.target, slipLine.slips)}</p>}
          {sense && !right && <p className="sense-line">{sense}</p>}
        </div>
        {(!props.doc.settings.silent || fromVoice) && (
          <p className="prompt-tools">
            {!props.doc.settings.silent && (
              <>
                <HearBtn
                  current={listenLocked}
                  ariaKeyshortcuts="Alt+H"
                  onClick={() => {
                    setHeard(true)
                    if (hint === chrome.hearFirst) setHint(null)
                    void speakThai(entry.thai, entry.id, props.doc.settings.audioRate, { gesture: true })
                  }}
                >
                  Hear
                </HearBtn>
                <HearBtn
                  ariaKeyshortcuts="Alt+S"
                  onClick={() => {
                    setHeard(true)
                    setHint(null)
                    void speakSlower(entry.thai, entry.id, props.doc.settings.audioRate, { gesture: true })
                  }}
                >
                  Slower
                </HearBtn>
              </>
            )}
            {fromVoice && <span className="from-voice">You know this from Voice</span>}
          </p>
        )}
        <div className="session-desk">{desk}</div>
        <p className={`feedback session-feedback${ack ? (ack.ok ? ' ok' : ' miss') : hint ? ' miss' : ''}`} role="status">
          {hint ?? ack?.text ?? ''}
        </p>
      </div>
    </main>
  )
}
