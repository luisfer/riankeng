import { TONE_LABEL, TONE_MARKS, TONES, type Tone } from '@content/system'

/** Textbook Bangkok contours: mid level, low falling-to-low, falling from high, high tense, rising from low. */
const CONTOUR: Record<Tone, string> = {
  mid: 'M 14 25 L 66 25',
  low: 'M 14 29 C 28 36 42 39 66 39',
  falling: 'M 14 12 C 26 10 40 24 66 39',
  high: 'M 14 18 C 32 14 48 12 66 12',
  rising: 'M 14 39 C 28 40 44 20 66 13',
}

function exampleRom(tone: Tone): string {
  if (tone === 'mid') return 'maa'
  return ('m' + 'a' + TONE_MARKS[tone] + 'a').normalize('NFC')
}

export function ToneCharts() {
  return (
    <figure className="tone-charts">
      <figcaption>Where the pitch goes.</figcaption>
      <ul className="tone-charts-grid">
        {TONES.map((tone) => {
          const rom = exampleRom(tone)
          return (
            <li key={tone} className="tone-chart">
              <svg viewBox="0 0 80 50" aria-hidden="true" focusable="false">
                <rect className="tone-chart-frame" x="1" y="1" width="78" height="48" />
                <path className="tone-chart-path" d={CONTOUR[tone]} />
              </svg>
              <span className="tone-chart-name">{TONE_LABEL[tone]}</span>
              <span className="tone-chart-rom rom">{rom}</span>
            </li>
          )
        })}
      </ul>
    </figure>
  )
}
