import { TONE_LABEL, TONE_MARKS, TONES, type Tone } from '@content/system'
import { CONTOUR } from './tone-contour'

/** Cards the learner actually sits on Voice 0. Extra contours are labelled. */
function exampleFor(tone: Tone): { rom: string; sits: boolean } {
  if (tone === 'mid') return { rom: 'maa', sits: true }
  if (tone === 'high') return { rom: 'máa', sits: true }
  if (tone === 'rising') return { rom: 'mǎa', sits: true }
  if (tone === 'falling') return { rom: 'mâi', sits: true }
  if (tone === 'low') return { rom: 'mài', sits: true }
  return { rom: ('m' + 'a' + TONE_MARKS[tone] + 'a').normalize('NFC'), sits: false }
}

export function ToneCharts() {
  return (
    <figure className="tone-charts">
      <figcaption>Where the pitch goes.</figcaption>
      <ul className="tone-charts-grid">
        {TONES.map((tone) => {
          const { rom, sits } = exampleFor(tone)
          return (
            <li key={tone} className="tone-chart">
              <svg viewBox="0 0 80 50" aria-hidden="true" focusable="false">
                <rect className="tone-chart-frame" x="1" y="1" width="78" height="48" />
                <path className="tone-chart-path" d={CONTOUR[tone]} />
              </svg>
              <span className="tone-chart-name">{TONE_LABEL[tone]}</span>
              <span className="tone-chart-rom rom">{rom}</span>
              {!sits && <span className="tone-chart-aside">not a word you sit yet</span>}
            </li>
          )
        })}
      </ul>
    </figure>
  )
}
