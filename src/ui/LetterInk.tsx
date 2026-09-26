import { useEffect, useState, type CSSProperties } from 'react'
import type { LETTER_FACE, LetterPath } from './letter-paths'
import { showThai } from './thai'

let loaded: { paths: Record<string, LetterPath>; face: typeof LETTER_FACE } | null = null
let loading: Promise<void> | null = null

/** Fetch the letter outlines once, on their own. A Script sitting asks early, so the first letter is ready. */
export function preloadLetters(): Promise<void> {
  loading ??= import('./letter-paths').then((m) => {
    loaded = { paths: m.LETTER_PATHS, face: m.LETTER_FACE }
  })
  return loading
}

/** How long the outline takes to go round, head to last stroke. */
const DRAW_MS = 1150

type Outline = { glyph: LetterPath; left: number; tall: number }

/** A letter's outline once the outlines have arrived, with its box in ems, or null until then. */
function useLetterOutline(thai: string): Outline | null {
  const [ready, setReady] = useState(Boolean(loaded))
  useEffect(() => {
    if (!ready) void preloadLetters().then(() => setReady(true))
  }, [ready])
  const glyph = ready ? loaded?.paths[thai] : undefined
  if (!glyph || !loaded) return null
  const { unitsPerEm, ascent, descent } = loaded.face
  // The outlines' box, in ems: it starts where the pen does (or left of it, for a letter that
  // overhangs), and runs from the face's ascent to its descent, as the text's own box does.
  return { glyph, left: Number(glyph.viewBox.split(' ')[0]) / unitsPerEm, tall: (ascent + descent) / unitsPerEm }
}

/** The letter as ink: its fill, and each stroke traced in writing order. A new `take` writes it again. */
function InkSvg(props: { outline: Outline; take: number }) {
  const { glyph, tall } = props.outline
  const total = glyph.contours.reduce((n, c) => n + c.len, 0) || 1
  let at = 0
  return (
    <svg
      key={props.take}
      viewBox={glyph.viewBox}
      aria-hidden="true"
      focusable="false"
      style={{ height: `${tall}em`, '--draw': `${DRAW_MS}ms` } as CSSProperties}
    >
      <path className="ink-fill" d={glyph.contours.map((c) => c.d).join('')} />
      {glyph.contours.map((c, i) => {
        const style = {
          '--d': `${Math.round((at / total) * DRAW_MS)}ms`,
          '--t': `${Math.max(140, Math.round((c.len / total) * DRAW_MS))}ms`,
        } as CSSProperties
        at += c.len
        return <path key={i} className="ink-trace" d={c.d} pathLength={1} style={style} />
      })}
    </svg>
  )
}

/**
 * A Script letter inking itself in: its head loop first, then its body traced from the head, then
 * the ink fills as the outline fades into it. The letter itself stays underneath as text, unseen, so
 * the line keeps its size and baseline and a screen reader reads the letter. Until the outlines
 * arrive, and for a mark that sits on a dotted circle, it is only the text. Pressing it writes it again.
 */
export function LetterInk(props: { thai: string }) {
  const outline = useLetterOutline(props.thai)
  const [take, setTake] = useState(0)
  if (!outline) return <p className="prompt-thai thai">{showThai(props.thai)}</p>
  return (
    <p className="prompt-thai thai letter-ink">
      <span className="ink-under" lang="th">
        {props.thai}
      </span>
      <button
        type="button"
        className="ink-again"
        aria-label="Write it again"
        style={{ left: `${outline.left}em`, top: `calc((1lh - ${outline.tall}em) / 2)` }}
        onClick={() => setTake((n) => n + 1)}
      >
        <InkSvg outline={outline} take={take} />
      </button>
    </p>
  )
}

/**
 * A letter set in running text, as on the whole-script page, that writes itself over when `take`
 * counts up. At 0 it is simply there, filled. The text stays underneath for size and for reading.
 */
export function WrittenGlyph(props: { thai: string; take: number }) {
  const outline = useLetterOutline(props.thai)
  if (!outline) return <>{showThai(props.thai)}</>
  return (
    <span className={props.take ? 'written' : 'written still'}>
      <span className="ink-under">{props.thai}</span>
      <span className="ink-pos" style={{ left: `${outline.left}em`, top: `calc((1lh - ${outline.tall}em) / 2)` }}>
        <InkSvg outline={outline} take={props.take} />
      </span>
    </span>
  )
}
