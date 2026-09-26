import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ENTRIES } from '../content/index'
import { analyseRom } from '../src/engine/normalize'
import { ToneRom } from '../src/ui/ToneRom'

const html = (el: React.ReactElement) => renderToStaticMarkup(el)
const tones = (markup: string) => [...markup.matchAll(/data-tone="([a-z]+)"/g)].map((m) => m[1])
const text = (markup: string) => markup.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, '')

describe('the pitch over each syllable', () => {
  it('draws one line per syllable, in the tone the grader reads', () => {
    const m = html(<ToneRom rom="kɔ̌ɔ gaa-fεε yen nʉ̀ng gε̂εo" />)
    expect(tones(m)).toEqual(['rising', 'mid', 'mid', 'mid', 'low', 'falling'])
    expect(text(m)).toBe('kɔ̌ɔ gaa-fεε yen nʉ̀ng gε̂εo')
  })

  it('draws both halves of kráp/kâ', () => {
    const m = html(<ToneRom rom="sà-wàt-dii kráp/kâ" />)
    expect(tones(m)).toEqual(['low', 'low', 'mid', 'high', 'falling'])
    expect(text(m)).toBe('sà-wàt-dii kráp/kâ')
  })

  it('sets a slipped syllable in lacquer, with the tone that was written beneath', () => {
    const m = html(<ToneRom rom="nʉ̀ng tûm" slips={new Map([[1, 'mid']])} />)
    expect(m.match(/class="tone-syl slip"/g)).toHaveLength(1)
    expect(m).toContain('class="tone-was"')
    expect(tones(m)).toEqual(['low', 'falling'])
  })

  it('keeps every card of the course as written, a line over each of its syllables', () => {
    const lost: string[] = []
    for (const e of ENTRIES) {
      if ((e.track ?? 'voice') !== 'voice') continue
      const m = html(<ToneRom rom={e.rom} />)
      if (text(m) !== e.rom) lost.push(`${e.id}: text`)
      const runs = e.rom.split(/[\s\-/,…?!.]+/).filter(Boolean)
      const expected = runs.reduce((n, run) => n + analyseRom(run).nuclei.length, 0)
      if (tones(m).length !== expected) lost.push(`${e.id}: ${tones(m).length} of ${expected}`)
    }
    expect(lost).toEqual([])
  })
})
