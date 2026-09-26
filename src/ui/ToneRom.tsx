import { useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react'
import type { Tone } from '@content/system'
import { analyseRom } from '@/engine/normalize'
import { onClipPlay } from '@/audio/voice-clock'
import { evenSpans, syllableSpans, syllableWeight, warmTiming, type Span } from '@/audio/voice-timing'
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

function reducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Ride the pitch lines with her voice: while the clip plays, each spoken syllable's stroke inks
 * in lacquer from its start, a dot at the tip, in time with the audio element's own clock. When she
 * stops, the ink settles back. Under reduced motion a syllable lights whole, and nothing travels.
 */
function follow(root: RefObject<HTMLSpanElement | null>, voice: string, audio: HTMLAudioElement): () => void {
  const still = reducedMotion()
  let frame = 0
  let over = false
  let spans: Span[] | null = null
  const spoken = () => [...(root.current?.querySelectorAll<HTMLElement>('.tone-syl:not([data-alt])') ?? [])]
  const weights = spoken().map((el) => syllableWeight(el.textContent ?? ''))
  if (!weights.length) return () => undefined
  void syllableSpans(voice, weights).then((s) => {
    spans = s
  })
  root.current?.classList.remove('voice-rest')
  for (const el of spoken()) el.querySelector<SVGPathElement>('.tone-lit')?.style.setProperty('stroke-dashoffset', '1')
  const paint = () => {
    const t = audio.currentTime
    const s = spans ?? (Number.isFinite(audio.duration) ? evenSpans(audio.duration, weights) : null)
    if (s) {
      spoken().forEach((el, i) => {
        const span = s[i]
        if (!span) return
        const p = Math.min(1, Math.max(0, (t - span.start) / Math.max(0.01, span.end - span.start)))
        const lit = el.querySelector<SVGPathElement>('.tone-lit')
        const dot = el.querySelector<SVGCircleElement>('.tone-dot')
        const path = el.querySelector<SVGPathElement>('.tone-is')
        lit?.style.setProperty('stroke-dashoffset', String(1 - (still ? (p > 0 ? 1 : 0) : p)))
        if (!dot || !path) return
        const speaking = !still && t >= span.start && t < span.end
        if (speaking) {
          const at = path.getPointAtLength(p * path.getTotalLength())
          dot.setAttribute('cx', String(at.x))
          dot.setAttribute('cy', String(at.y))
        }
        dot.style.opacity = speaking ? '1' : '0'
      })
    }
  }
  const end = () => {
    if (over) return
    over = true
    cancelAnimationFrame(frame)
    paint()
    root.current?.classList.add('voice-rest')
    for (const el of spoken()) el.querySelector<SVGCircleElement>('.tone-dot')?.style.setProperty('opacity', '0')
  }
  const tick = () => {
    if (over) return
    paint()
    if (audio.ended || audio.error) return end()
    frame = requestAnimationFrame(tick)
  }
  audio.addEventListener('ended', end, { once: true })
  audio.addEventListener('pause', () => audio.currentTime > 0 && end(), { once: true })
  const guard = setTimeout(end, 15_000)
  frame = requestAnimationFrame(tick)
  return () => {
    clearTimeout(guard)
    end()
  }
}

/**
 * A romanization with each syllable's pitch drawn over it, in the tone chart's own strokes. The
 * lines draw in once, syllable by syllable. With a `voice` (the card's clip), they then play with
 * it: each Hear inks them in lacquer in time with her. Without one, a new `draw` draws them again.
 * A slipped syllable is lacquer, its right contour over the one that was written, dashed.
 */
export function ToneRom(props: { rom: string; draw?: number; slips?: Map<number, Tone>; voice?: string }): ReactNode {
  const root = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const voice = props.voice
    if (!voice) return
    warmTiming(voice)
    let stop: (() => void) | null = null
    const off = onClipPlay((id, audio) => {
      if (id !== voice) return
      stop?.()
      stop = follow(root, voice, audio)
    })
    return () => {
      off()
      stop?.()
    }
  }, [props.voice, props.rom])

  let n = 0
  const raw = props.rom.split(BREAKS)
  const parts = raw.map((part, k) => {
    if (!part) return null
    if (BREAKS.test(part)) return <span key={k}>{part}</span>
    // kráp/kâ is written both ways and said once, in the second: the first is not in the clip.
    const unsaid = (raw[k + 1] ?? '').includes('/')
    const syls = syllables(part)
    if (!syls) {
      n += Math.max(1, analyseRom(part).nuclei.length)
      return <span key={k}>{part}</span>
    }
    return syls.map((s) => {
      const i = n++
      const got = props.slips?.get(i)
      return (
        <span
          key={`${k}-${i}`}
          className={got ? 'tone-syl slip' : 'tone-syl'}
          data-tone={s.tone}
          data-alt={unsaid ? '' : undefined}
          style={{ '--i': i } as CSSProperties}
        >
          <svg className="tone-line" viewBox={CONTOUR_BOX} aria-hidden="true" focusable="false">
            {got && <path className="tone-was" d={CONTOUR[got]} />}
            <path className="tone-is" d={CONTOUR[s.tone]} pathLength={1} />
            {props.voice && !unsaid && (
              <>
                <path className="tone-lit" d={CONTOUR[s.tone]} pathLength={1} />
                <circle className="tone-dot" r="3.6" cx="14" cy="25" />
              </>
            )}
          </svg>
          {s.text}
        </span>
      )
    })
  })
  // With a voice the lines play with each Hear, so they are drawn in once and not again.
  return (
    <span className="tone-rom" key={props.voice ? 'voiced' : (props.draw ?? 0)} ref={root}>
      {parts}
    </span>
  )
}
