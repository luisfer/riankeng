import { useState, type ReactNode } from 'react'
import { ENTRIES } from '@content/index'
import { CONSONANTS, DIGITS, OTHER_SIGNS, VOWELS, type Consonant, type ConsonantClass } from '@content/script/alphabet'
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

/** The example word in a letter's name: gɔɔ gài → gài. */
function exampleWord(name: string): string {
  const parts = name.split(' ')
  return parts[parts.length - 1] ?? name
}

/**
 * The sound a letter makes at the start of a syllable, then the word that carries it.
 * When it says something else at the end (ด ends in t, ร in n), that too. Glides are left alone.
 */
function consonantLine(c: Consonant): string {
  const word = exampleWord(c.name)
  const line = c.initial ? `${c.initial}, ${word}` : word
  const ends = c.final && c.final !== c.initial && /^(k|p|t|n)$/.test(c.final)
  return ends ? `${line}, ends ${c.final}` : line
}

function Grid(props: { cells: Cell[]; onOpen: (n: number) => void; unlocked?: (n: number) => boolean }) {
  return (
      <ul className="alpha-grid">
        {props.cells.map((c) => (
          <li key={c.char}>
            <button
              type="button"
              className={`alpha-cell${c.seen ? ' seen' : ''}${c.retired ? ' retired' : ''}`}
              disabled={c.level === undefined || (props.unlocked ? !props.unlocked(c.level) : false)}
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
  )
}

const CLASS_TITLE: Record<ConsonantClass, string> = {
  mid: 'Mid class',
  high: 'High class',
  low: 'Low class',
}

function classNote(cls: ConsonantClass): ReactNode {
  if (cls === 'mid') {
    return 'With no mark, a live syllable is mid and a dead one low. ก starts it as g, as in gài.'
  }
  if (cls === 'high') {
    return (
      <>
        With no mark, a live syllable is rising and a dead one low. <span className="thai">ห</span> in front lends this class to a low letter. ข starts it as k, as in kài.
      </>
    )
  }
  return 'Twenty-four letters. With no mark, a live syllable is mid, and a dead one is high when short and falling when long. ค starts a syllable as k, as in kwaai.'
}

export function Alphabet(props: { doc: ProgressDoc; onOpen: (n: number) => void; unlocked?: (n: number) => boolean }) {
  const [open, setOpen] = useState<string>('mid')
  const toggle = (id: string) => setOpen((cur) => (cur === id ? '' : id))

  const sections: Array<{ id: string; title: string; count: number; note: ReactNode; body: ReactNode }> = [
    ...(['mid', 'high', 'low'] as ConsonantClass[]).map((cls) => {
      const letters = CONSONANTS.filter((c) => c.cls === cls)
      return {
        id: cls,
        title: CLASS_TITLE[cls],
        count: letters.length,
        note: classNote(cls),
        body: (
          <Grid
            cells={letters.map((c) => cell(props.doc, c.char, consonantLine(c), c.retired))}
            onOpen={props.onOpen}
            unlocked={props.unlocked}
          />
        ),
      }
    }),
    {
      id: 'vowels',
      title: 'Vowels',
      count: VOWELS.length,
      note: 'The sign, and the sound it writes on a consonant.',
      body: <Grid cells={VOWELS.map((v) => cell(props.doc, v.char, v.reads))} onOpen={props.onOpen} unlocked={props.unlocked} />,
    },
    {
      id: 'tones',
      title: 'Tone marks',
      count: 4,
      note: (
        <>
          On a mid letter, <span className="thai">{showThai('่')}</span> is low, <span className="thai">{showThai('้')}</span> falling,{' '}
          <span className="thai">{showThai('๊')}</span> high, <span className="thai">{showThai('๋')}</span> rising. ก่า is gàa. On a low
          letter, <span className="thai">{showThai('่')}</span> is falling and <span className="thai">{showThai('้')}</span> high. ค่า is kâa.
        </>
      ),
      body: (
        <ul className="tone-mark-row">
          <li>
            <span className="thai">{showThai('ก่า')}</span>
            <span className="rom">gàa, low</span>
          </li>
          <li>
            <span className="thai">{showThai('ก้า')}</span>
            <span className="rom">gâa, falling</span>
          </li>
          <li>
            <span className="thai">{showThai('ก๊า')}</span>
            <span className="rom">gáa, high</span>
          </li>
          <li>
            <span className="thai">{showThai('ก๋า')}</span>
            <span className="rom">gǎa, rising</span>
          </li>
          <li>
            <span className="thai">{showThai('ค่า')}</span>
            <span className="rom">kâa, falling</span>
          </li>
          <li>
            <span className="thai">{showThai('ค้า')}</span>
            <span className="rom">káa, high</span>
          </li>
        </ul>
      ),
    },
    {
      id: 'marks',
      title: 'Other marks',
      count: OTHER_SIGNS.length,
      note: 'A mark on a word you can already say.',
      body: <Grid cells={OTHER_SIGNS.map((s) => cell(props.doc, s.char, s.reads))} onOpen={props.onOpen} unlocked={props.unlocked} />,
    },
    {
      id: 'digits',
      title: 'Digits',
      count: DIGITS.length,
      note: '๐ is zero. The rest count up from there.',
      body: <Grid cells={DIGITS.map((d, i) => cell(props.doc, d, String(i)))} onOpen={props.onOpen} unlocked={props.unlocked} />,
    },
  ]

  return (
    <main className="page alphabet">
      <h2>The whole script</h2>
      <p className="lede">44 consonants. Then vowels, marks, digits.</p>
      {sections.map((s) => {
        const here = open === s.id
        return (
          <section key={s.id} className="alpha-block">
            <button type="button" className={here ? 'contents-row here' : 'contents-row'} onClick={() => toggle(s.id)} aria-expanded={here}>
              <span className="contents-n">{s.count}</span>
              <span>
                <span className="contents-title">{s.title}</span>
              </span>
              {!here && <span className="contents-go">Open</span>}
            </button>
            {here && (
              <>
                <p className="lede alpha-note">{s.note}</p>
                {s.body}
              </>
            )}
          </section>
        )
      })}
    </main>
  )
}
