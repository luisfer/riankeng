import { ENTRIES } from '@content/index'
import { CONSONANTS, DIGITS, OTHER_SIGNS, VOWELS, type ConsonantClass } from '@content/script/alphabet'
import type { Entry } from '@content/types'
import { progressFor } from '@/engine/scheduler'
import type { ProgressDoc } from '@/storage/progress-schema'
import { showThai } from './thai'

/** The Script card that teaches a given letter or sign, if any. */
function cardFor(thai: string): Entry | undefined {
  return ENTRIES.find((e) => e.track === 'script' && e.tags.includes('letter') && e.thai === thai)
}

type Cell = { char: string; sub: string; level?: number; seen: boolean; retired?: boolean }

function cell(doc: ProgressDoc, char: string, sub: string, retired?: boolean): Cell {
  const card = cardFor(char)
  const seen = card ? progressFor(doc, card.id).reps > 0 : false
  const out: Cell = { char, sub, seen }
  if (card) out.level = card.level
  if (retired) out.retired = true
  return out
}

function Grid(props: { title: string; note?: string; cells: Cell[]; onOpen: (n: number) => void }) {
  return (
    <section className="alpha-block">
      <h2 className="quiet">{props.title}</h2>
      {props.note && <p className="lede alpha-note thai-inline">{props.note}</p>}
      <ul className="alpha-grid">
        {props.cells.map((c) => (
          <li key={c.char}>
            <button
              type="button"
              className={`alpha-cell${c.seen ? ' seen' : ''}${c.retired ? ' retired' : ''}`}
              disabled={c.level === undefined}
              onClick={() => c.level !== undefined && props.onOpen(c.level)}
              title={c.level === undefined ? undefined : `Script level ${c.level}`}
            >
              <span className="thai alpha-char">{showThai(c.char)}</span>
              <span className="rom alpha-sub">{c.sub}</span>
              {c.level !== undefined && <span className="alpha-level">{c.level}</span>}
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

const CLASS_TITLE: Record<ConsonantClass, string> = {
  mid: 'Mid class',
  high: 'High class',
  low: 'Low class',
}

export function Alphabet(props: { doc: ProgressDoc; onOpen: (n: number) => void }) {
  const taught = CONSONANTS.filter((c) => cardFor(c.char) && progressFor(props.doc, cardFor(c.char)!.id).reps > 0).length
  return (
    <main className="page alphabet">
      <h2>The whole script</h2>
      <p className="lede">
        Forty-four consonants, the vowel signs, the marks and the digits. Every one has a card in Script. Lacquer means you
        have met it. Tap a letter to open its level. {taught} of 44 consonants so far.
      </p>
      {(['mid', 'high', 'low'] as ConsonantClass[]).map((cls) => (
        <Grid
          key={cls}
          title={CLASS_TITLE[cls]}
          note={
            cls === 'mid'
              ? 'Nine letters. No mark on a live syllable is mid tone.'
              : cls === 'high'
                ? 'Eleven letters. No mark on a live syllable is rising. ห in front lends this class to a low letter.'
                : 'Twenty-four letters. Many are second shapes for sounds you already read.'
          }
          cells={CONSONANTS.filter((c) => c.cls === cls).map((c) => cell(props.doc, c.char, c.name, c.retired))}
          onOpen={props.onOpen}
        />
      ))}
      <Grid title="Vowels" cells={VOWELS.map((v) => cell(props.doc, v.char, v.reads))} onOpen={props.onOpen} />
      <Grid
        title="Tone marks"
        note="Learned on words, never as cards. On a mid-class letter: ◌่ low, ◌้ falling, ◌๊ high, ◌๋ rising."
        cells={[]}
        onOpen={props.onOpen}
      />
      <Grid title="Other marks" cells={OTHER_SIGNS.map((s) => cell(props.doc, s.char, s.reads))} onOpen={props.onOpen} />
      <Grid title="Digits" cells={DIGITS.map((d, i) => cell(props.doc, d, String(i)))} onOpen={props.onOpen} />
    </main>
  )
}
