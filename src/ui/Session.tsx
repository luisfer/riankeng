import { useEffect, useState } from 'react'
import { TONES, TONE_LABEL, type Tone } from '@content/system'
import { cleanGloss, gradeEnglish } from '@/engine/grader-en'
import { gradeThai } from '@/engine/grader-thai'
import { analyseRom } from '@/engine/normalize'
import {
  afterHold,
  currentItem,
  markCorrect,
  markMissMove,
  markMissStay,
  requeueCurrent,
  type LiveSession,
} from '@/engine/session'
import { applyAttempt, type ItemProgress } from '@/engine/srs'
import type { ProgressDoc } from '@/storage/progress-schema'
import { entryOrThrow, pickChoices } from '@/engine/scheduler'
import { speakThai } from '@/audio/tts'
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
  const track = props.session.track ?? 'voice'
  const script = track === 'script'

  useEffect(() => {
    setAnswer('')
    setAck(null)
  }, [item?.id, item?.modality])

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
    setAck(null)
    setAnswer('')
    if (hold) props.onSession(afterHold(props.session))
    else if (ack?.ok) props.onSession(markCorrect(props.session))
    else props.onSession(requeueCurrent(props.session))
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
    const expected = analyseRom(entry.rom).nuclei[0]?.tone ?? 'mid'
    const ok = tone === expected
    record(ok, ok ? 'exact' : 'tone')
    if (ok) {
      setAck({ ok: true, text: 'Right.' })
    } else {
      props.onSession(markMissMove(props.session))
      setAck({ ok: false, text: `That syllable is ${TONE_LABEL[expected]}.` })
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

  const writeRom = script && (item.modality === 'th-en' || item.modality === 'en-th' || item.modality === 'listen')
  const voiceEn = !script && item.modality === 'th-en'
  const fromVoice = script && entry.tags.some((t) => t.startsWith('voice:w:'))
  const waitingNext = Boolean(ack && (ack.ok || !hold))
  const right = Boolean(ack?.ok)

  const prompt =
    hold?.kind === 'retype-th'
      ? 'Retype the romanization.'
      : item.modality === 'pick'
        ? 'Which one is this?'
        : item.modality === 'en-th'
          ? script
            ? 'Write it in romanization.'
            : 'Say this in Thai.'
          : item.modality === 'th-en'
            ? script
              ? 'Write this the way you already say it.'
              : 'What does this mean?'
            : item.modality === 'listen'
              ? 'Write what you would say.'
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

  const desk = waitingNext ? (
    <div className="answer-form">
      <div />
      <Commit onClick={goNext}>Next</Commit>
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
            onPaste={(e) => e.preventDefault()}
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
        if (writeRom || item.modality === 'en-th' || hold?.kind === 'retype-th') submitThai()
        else submitEn()
      }}
    >
      <RomanInput
        value={answer}
        onChange={setAnswer}
        onSubmit={writeRom || item.modality === 'en-th' || hold?.kind === 'retype-th' ? submitThai : submitEn}
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
              onClick={() => speakThai(entry.thai, entry.id, props.doc.settings.audioRate, { gesture: true })}
            >
              Hear
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
        </div>
        <div className="session-desk">{desk}</div>
        <p className={`feedback session-feedback${ack ? (ack.ok ? ' ok' : ' miss') : ''}`} role="status">
          {ack?.text ?? ''}
        </p>
      </div>
    </main>
  )
}
