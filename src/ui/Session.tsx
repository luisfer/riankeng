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
import { prefetchClip, warmClips } from '@/audio/clips'
import { canHearThai, onVoices, speakSlower, speakThai, speechUnlocked } from '@/audio/tts'
import { RomanInput } from '@/input/RomanInput'
import { Commit, HearBtn } from './bits'
import { chrome } from './copy'
import { showThai } from './thai'
import { ToneRom } from './ToneRom'
import { LetterInk, preloadLetters } from './LetterInk'

const TONE_ORDER: Tone[] = TONES

/** Pick shows the English gloss only. Rom would give the answer away. */
/**
 * A wrong pick between two sounds, graded as typing it would be. Hearing máa as mǎa is a near miss:
 * a slip, one stage, the tone named on the line. Hearing g as k is not, and costs what a wrong answer costs.
 */
export function pairMiss(target: string, picked: string): { v: 'tone' | 'length' | 'wrong'; target: string; slips: Map<number, Tone> } {
  const g = gradeThai(target, picked)
  const v = g.verdict === 'tone' || g.verdict === 'length' ? g.verdict : 'wrong'
  return { v, target: g.matchedTarget ?? target, slips: new Map(g.toneSlips.map((s) => [s.syllable, s.got])) }
}

export function pickPrompt(entry: { en: string[] }): string {
  return cleanGloss(entry.en[0] ?? '')
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
  const [slipLine, setSlipLine] = useState<{ target: string; slips: Map<number, Tone> } | null>(null)
  /** Bumped by Hear and Slower, so the pitch lines draw again with the voice. */
  const [drawn, setDrawn] = useState(0)
  const [, setVoiceTick] = useState(0)
  const goNextRef = useRef(() => {})
  const attemptedRef = useRef(false)
  /** The choices on the desk now, by number key: the same numbers the buttons show. */
  const choicesRef = useRef<Map<string, () => void>>(new Map())
  const track = props.session.track ?? 'voice'
  const script = item ? entryTrack(entryOrThrow(item.id)) === 'script' : track === 'script'
  const meeting = Boolean(item?.meet && !props.session.hold)
  const waitingNext = Boolean(props.session.pending && (props.session.pending.ok || !props.session.hold))
  const canAdvance = meeting || waitingNext

  // A new card starts clean. Check does not: what was written stays on the line beside Next.
  useEffect(() => {
    setAnswer('')
    setHeard(false)
    setToneStep(0)
  }, [item?.id, item?.modality, item?.meet, props.session.cursor, props.session.step])

  useEffect(() => {
    attemptedRef.current = Boolean(item?.scored || props.session.pending)
    setAck(props.session.pending ?? null)
    setHint(null)
  }, [item?.id, item?.modality, item?.meet, item?.scored, props.session.pending])

  useEffect(() => onVoices(() => setVoiceTick((n) => n + 1)), [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey || e.metaKey || e.ctrlKey || e.repeat) return
      const target = e.target as HTMLElement | null
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return
      const pick = choicesRef.current.get(e.key)
      if (!pick) return
      e.preventDefault()
      pick()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // A Script sitting fetches the letter outlines early, so the first letter inks in at once.
  useEffect(() => {
    if (track === 'script') void preloadLetters()
  }, [track])

  useEffect(() => {
    for (const q of props.session.queue) prefetchClip(q.id)
    warmClips(props.session.queue.map((q) => q.id))
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
      // By the key, not the character: Option+H on a Mac types ˙, which would land in the answer.
      const key = e.code === 'KeyH' ? 'h' : e.code === 'KeyS' ? 's' : ''
      if (!key) return
      e.preventDefault()
      const card = entryOrThrow(item.id)
      setHeard(true)
      setDrawn((d) => d + 1)
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
        setSlipLine({ target: g.matchedTarget ?? entry.rom, slips: new Map(g.toneSlips.map((s) => [s.syllable, s.got])) })
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
    if (rom === entry.rom) {
      noteAttempt(true, 'exact', 'Right.')
      return
    }
    const miss = pairMiss(entry.rom, rom)
    if (noteAttempt(false, miss.v, `That was ${entry.rom}.`, 'move') && miss.slips.size > 0) {
      setSlipLine({ target: miss.target, slips: miss.slips })
    }
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
            {entry.tags.includes('letter') ? (
              <LetterInk thai={entry.thai} />
            ) : (
              <p className="prompt-thai thai">{showThai(entry.thai)}</p>
            )}
            <p className="prompt-rom rom">
              <ToneRom rom={entry.rom} draw={drawn} voice={entry.id} />
            </p>
            <p className="prompt-en">{cleanGloss(entry.en[0] ?? '')}</p>
            <MeetNotes entry={entry} />
          </>
        )
      }
      return (
        <>
          <p className="prompt-rom rom">
            <ToneRom rom={entry.rom} draw={drawn} voice={entry.id} />
          </p>
          <p className="prompt-en">{cleanGloss(entry.en[0] ?? '')}</p>
          <MeetNotes entry={entry} />
        </>
      )
    }
    if (hold) {
      return (
        <p className="reveal rom">
          <ToneRom rom={hold.target} draw={drawn} voice={entry.id} />
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
          <ToneRom rom={entry.rom} draw={drawn} voice={entry.id} />
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

  // A card answered by choosing: two sounds, a letter, or a tone. Each choice has a number key,
  // and a tone's number is the one the key strip writes it with: 1 low, 2 falling, 3 high, 4 rising, 0 mid.
  const choiceKind: 'pair' | 'glyph' | 'tone' | null =
    meeting || waitingNext
      ? null
      : pairing && hearable && heard && !hold
        ? 'pair'
        : modality === 'pick' && !hold
          ? 'glyph'
          : modality === 'tone' && !hold
            ? 'tone'
            : null
  const choices: { key: string; label: string; pick: () => void }[] =
    choiceKind === 'pair'
      ? pairRoms(entry).map((rom, i) => ({ key: String(i + 1), label: rom, pick: () => submitPair(rom) }))
      : choiceKind === 'glyph'
        ? pickChoices(entry).map((thai, i) => ({ key: String(i + 1), label: showThai(thai), pick: () => submitPick(thai) }))
        : choiceKind === 'tone'
          ? TONE_ORDER.map((t, i) => ({ key: String(i), label: TONE_LABEL[t], pick: () => submitTone(t) }))
          : []
  choicesRef.current = new Map(ack ? [] : choices.map((c) => [c.key, c.pick]))

  const desk = meeting ? (
    <div className="answer-form bare">
      <div />
      <Commit onClick={goNext} autoFocus>
        Continue
      </Commit>
    </div>
  ) : waitingNext ? (
    /* What was written stays on its line, and Next stands where Check stood, with the focus. */
    <div className={answer ? 'answer-form said' : 'answer-form bare'}>
      <p className={`answer-said${voiceEn ? ' en' : ' rom'}`}>{answer}</p>
      <Commit onClick={goNext} autoFocus>
        Next
      </Commit>
    </div>
  ) : pairing && hearable && !heard ? (
    <div className="answer-form bare">
      <div />
    </div>
  ) : choices.length > 0 ? (
    <div className={choiceKind === 'glyph' ? 'glyph-picks' : 'tone-picks'}>
      {choices.map((c) => (
        <button
          key={c.key}
          type="button"
          className={choiceKind === 'glyph' ? 'glyph-pick thai' : choiceKind === 'pair' ? 'tone-word rom' : 'tone-word'}
          aria-keyshortcuts={c.key}
          onClick={c.pick}
        >
          <span className="pop-k">{c.key}</span>
          {c.label}
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
              {pairLine === entry.rom ? <ToneRom rom={entry.rom} draw={drawn} voice={entry.id} /> : pairLine}
            </p>
          )}
          {slipLine && ack && !ack.ok && (
            <p className="slip-line rom">
              <ToneRom rom={slipLine.target} slips={slipLine.slips} voice={entry.id} />
            </p>
          )}
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
                    setDrawn((d) => d + 1)
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
                    setDrawn((d) => d + 1)
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
