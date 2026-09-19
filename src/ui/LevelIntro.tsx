import { entriesForLevel, levelsFor } from '@content/index'
import type { TrackId } from '@content/types'
import { Commit, TextBtn } from './bits'
import { ToneCharts } from './ToneCharts'
import { showParts, showThai } from './thai'

const THAI = /[\u0E00-\u0E7F]/
const PHONETIC = /[àâáǎèêéěìîíǐòôóǒùûúǔÀÂÁǍεɔəụ]/

function tidyFocus(line: string): string {
  return line.replaceAll(' · ', ', ').replaceAll('·', ', ')
}

/** A period+space splits a lead from its one-line note. */
function lessonPoint(line: string): { lead: string; note?: string } {
  const text = tidyFocus(line)
  const split = text.indexOf('. ')
  if (split === -1) return { lead: text.replace(/\.$/, '') }
  return { lead: text.slice(0, split), note: text.slice(split + 2) }
}

function leadClass(lead: string, hasNote: boolean): string | undefined {
  if (THAI.test(lead)) return 'thai'
  if (hasNote || PHONETIC.test(lead)) return 'rom'
  return undefined
}

export function LevelIntro(props: {
  n: number
  track: TrackId
  locked?: boolean
  canContinue?: boolean
  onStart: () => void
  onContinue?: () => void
}) {
  const meta = levelsFor(props.track)[props.n]
  if (!meta) {
    return (
      <main className="page">
        <p>Unknown level.</p>
      </main>
    )
  }
  const all = entriesForLevel(props.n, props.track)
  const preview = all.slice(0, 8)
  const empty = all.length === 0
  const script = props.track === 'script'
  const voiceSound = props.track === 'voice' && props.n === 0

  return (
    <main className="page intro">
      <h1>
        Level {meta.n}, {meta.title}
      </h1>
      <p className="lede">{meta.blurb}</p>
      {voiceSound && <ToneCharts />}
      <section className="lesson">
        <h2>In this lesson</h2>
        <ul className="focus">
          {meta.focus.map((f) => {
            const { lead, note } = lessonPoint(f)
            const cls = leadClass(lead, Boolean(note))
            return (
              <li key={f}>
                <span className={cls}>{showThai(lead)}</span>
                {note && (
                  <span className={THAI.test(note) ? 'note thai-inline' : 'note'}>{showThai(note)}</span>
                )}
              </li>
            )
          })}
        </ul>
      </section>
      {script && all.some((e) => e.compose?.length) && (
        <section className="examples">
          <h2 className="quiet">How a word is built</h2>
          <ul className="compose">
            {all
              .filter((e) => e.compose?.length)
              .map((e) => (
                <li key={`compose-${e.id}`}>
                  <span className="thai compose-parts">{showParts(e.compose!)}</span>
                  <span className="compose-then">then</span>
                  <span className="thai compose-word">{e.thai}</span>
                </li>
              ))}
          </ul>
        </section>
      )}
      {preview.length > 0 && (
        <section className="examples">
          <h2 className="quiet">Examples</h2>
          <ul className="preview">
            {preview.map((e) => (
              <li key={e.id} className="quiet-row">
                {script && <span className="thai preview-thai">{showThai(e.thai)}</span>}
                <span className="rom">{e.rom}</span>
                <span>{e.en[0]}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
      <div className="intro-actions">
        {props.locked ? (
          <p className="warn">Clear the previous level first.</p>
        ) : empty ? (
          <p className="warn">This level is not authored yet.</p>
        ) : (
          <>
            {props.canContinue && props.onContinue && <Commit onClick={props.onContinue}>Continue</Commit>}
            {props.canContinue ? (
              <TextBtn onClick={props.onStart}>Begin again</TextBtn>
            ) : (
              <Commit onClick={props.onStart}>Begin</Commit>
            )}
          </>
        )}
      </div>
    </main>
  )
}
