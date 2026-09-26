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

/**
 * A Script letter inking itself in: its head loop first, then its body traced from the head, then
 * the ink fills as the outline fades into it. The letter itself stays underneath as text, unseen, so
 * the line keeps its size and baseline and a screen reader reads the letter. Until the outlines
 * arrive, and for a mark that sits on a dotted circle, it is only the text. Pressing it writes it again.
 */
export function LetterInk(props: { thai: string }) {
  const [ready, setReady] = useState(Boolean(loaded))
  const [take, setTake] = useState(0)
  useEffect(() => {
    if (!ready) void preloadLetters().then(() => setReady(true))
  }, [ready])
  const glyph = ready ? loaded?.paths[props.thai] : undefined
  if (!glyph || !loaded) return <p className="prompt-thai thai">{showThai(props.thai)}</p>
  const { unitsPerEm, ascent, descent } = loaded.face
  // The outlines' box, in ems: it starts where the pen does (or left of it, for a letter that
  // overhangs), and runs from the face's ascent to its descent, as the text's own box does.
  const left = Number(glyph.viewBox.split(' ')[0]) / unitsPerEm
  const tall = (ascent + descent) / unitsPerEm
  const total = glyph.contours.reduce((n, c) => n + c.len, 0) || 1
  let at = 0
  return (
    <p className="prompt-thai thai letter-ink">
      <span className="ink-under" lang="th">
        {props.thai}
      </span>
      <button
        type="button"
        className="ink-again"
        aria-label="Write it again"
        style={{ left: `${left}em`, top: `calc((1lh - ${tall}em) / 2)` }}
        onClick={() => setTake((n) => n + 1)}
      >
        <svg
          key={take}
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
      </button>
    </p>
  )
}
