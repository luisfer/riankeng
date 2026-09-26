import type { CSSProperties, ReactNode } from 'react'
import type { Tone } from '@content/system'
import { analyseRom } from '@/engine/normalize'
import { CONTOUR, CONTOUR_BOX } from './tone-contour'

/** Where a written romanization breaks between syllable runs: spaces, hyphens, the kráp/kâ slash. */
const BREAKS = /([\s\-/,…?!.]+)/

type Syllable = { text: string; tone: Tone }

/** A run's syllables with their tones, as the grader reads them, or null when they do not map onto the letters. */
function syllables(run: string): Syllable[] | null {
  const a = analyseRom(run)
  if (!a.valid || !a.syllables.length || a.syllables.length !== a.nuclei.length) return null
  const out: Syllable[] = []
  let at = 0
  for (const [i, chunk] of a.syllables.entries()) {
    const plain = chunk.replaceAll("'", '')
    const from = run.indexOf(plain, at)
    if (from !== at) return null
    out.push({ text: plain, tone: a.nuclei[i]!.tone })
    at = from + plain.length
  }
  return at === run.length ? out : null
}

/**
 * A romanization with each syllable's pitch drawn over it, in the tone chart's own strokes. The
 * lines draw in once, syllable by syllable; a new `draw` draws them again, as Hear does. A slipped
 * syllable is lacquer, its right contour over the one that was written, dashed.
 */
export function ToneRom(props: { rom: string; draw?: number; slips?: Map<number, Tone> }): ReactNode {
  let n = 0
  const parts = props.rom.split(BREAKS).map((part, k) => {
    if (!part) return null
    if (BREAKS.test(part)) return <span key={k}>{part}</span>
    const syls = syllables(part)
    if (!syls) {
      n += Math.max(1, analyseRom(part).nuclei.length)
      return <span key={k}>{part}</span>
    }
    return syls.map((s) => {
      const i = n++
      const got = props.slips?.get(i)
      return (
        <span key={`${k}-${i}`} className={got ? 'tone-syl slip' : 'tone-syl'} data-tone={s.tone} style={{ '--i': i } as CSSProperties}>
          <svg className="tone-line" viewBox={CONTOUR_BOX} aria-hidden="true" focusable="false">
            {got && <path className="tone-was" d={CONTOUR[got]} />}
            <path className="tone-is" d={CONTOUR[s.tone]} pathLength={1} />
          </svg>
          {s.text}
        </span>
      )
    })
  })
  return (
    <span className="tone-rom" key={props.draw ?? 0}>
      {parts}
    </span>
  )
}
