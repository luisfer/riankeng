import { describe, expect, it } from 'vitest'
import { renderToStaticMarkup } from 'react-dom/server'
import { ENTRIES, entryTrack } from '../content/index'
import { CONSONANTS } from '../content/script/alphabet'
import { LetterInk, preloadLetters } from '../src/ui/LetterInk'

const html = (el: React.ReactElement) => renderToStaticMarkup(el)

describe('a Script letter writing itself', () => {
  it('is the plain letter until its outline arrives', () => {
    const m = html(<LetterInk thai="ข" />)
    expect(m).toBe('<p class="prompt-thai thai">ข</p>')
  })

  it('has an outline for every consonant and every letter card', async () => {
    await preloadLetters()
    const { LETTER_PATHS } = await import('../src/ui/letter-paths')
    for (const c of CONSONANTS) expect(LETTER_PATHS[c.char]?.contours.length, c.char).toBeGreaterThan(0)
    const cards = ENTRIES.filter((e) => entryTrack(e) === 'script' && e.tags.includes('letter'))
    const drawable = cards.filter((e) => [...e.thai].length === 1 && !/\p{Mn}/u.test(e.thai))
    expect(drawable.length).toBeGreaterThan(50)
    for (const e of drawable) expect(LETTER_PATHS[e.thai], e.id).toBeDefined()
  })

  it('traces each stroke in turn over the unseen letter, which a screen reader reads', async () => {
    await preloadLetters()
    const m = html(<LetterInk thai="ข" />)
    expect(m).toContain('<span class="ink-under" lang="th">ข</span>')
    expect(m).toContain('aria-label="Write it again"')
    const delays = [...m.matchAll(/class="ink-trace"[^>]*--d:(\d+)ms/g)].map((x) => Number(x[1]))
    expect(delays.length).toBe(2)
    expect(delays[0]).toBe(0)
    expect(delays[1]).toBeGreaterThan(0)
  })

  it('leaves a mark that sits on a dotted circle as text', async () => {
    await preloadLetters()
    expect(html(<LetterInk thai="ั" />)).toBe('<p class="prompt-thai thai">◌ั</p>')
  })
})
