import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { getEntry } from '../content/index'
import voice1 from '../content/words/level-01'
import { clipUrl } from '../src/audio/clip-url'
import { decideGate } from '../src/gate-token'
import { DEMO_IDS } from '../src/landing/demo'
import { PREVIEW_IDS, PREVIEW_VOICE } from '../src/preview/catalog'
import { clearProgress, loadProgress, PROGRESS_KEY, saveProgress } from '../src/preview/progress'
import { slopHits } from './copy-rules'

const root = process.cwd()

function source(rel: string): string {
  return readFileSync(join(root, rel), 'utf8')
}

function previewSources(): string[] {
  const dir = join(root, 'src/preview')
  return [
    source('preview/index.html'),
    ...readdirSync(dir)
      .filter((name) => name.endsWith('.ts') || name.endsWith('.tsx'))
      .map((name) => source(join('src/preview', name))),
  ]
}

const LEAK = /@content\/index|content\/index|ui\/Session|ui\/App|engine\/session|audio\/tts|audio\/clips|clip-manifest|level-(?:0[1-9]|[1-9]\d)|\/learn\//

describe('public sitting', () => {
  it('links the landing section to /preview/ ahead of the close', () => {
    const html = source('index.html')
    const sitting = html.indexOf('id="preview"')
    expect(html).toContain('href="#preview"')
    expect(sitting).toBeGreaterThan(html.indexOf('id="try"'))
    expect(sitting).toBeLessThan(html.indexOf('id="close"'))
    expect(html).toContain('href="/preview/"')
    expect(html).toContain('Try a preview of the course.')
    expect(html).toContain('Try them')
    expect(html).toContain('A few very common words in Thai to get you started.')
    expect(slopHits([html.slice(sitting, html.indexOf('id="close"'))])).toEqual([])
  })

  it('keeps the preview import graph on level 0', () => {
    for (const text of previewSources()) expect(text).not.toMatch(LEAK)
    expect(source('vite.config.ts')).toContain('preview/index.html')
  })

  it('publishes twenty-five common words, and nothing after', async () => {
    expect(PREVIEW_IDS).toEqual(PREVIEW_VOICE.map((e) => e.id))
    expect(PREVIEW_VOICE).toHaveLength(25)
    expect(PREVIEW_IDS).toContain('w:sà-wàt-dii')
    expect(PREVIEW_IDS).toContain('w:kɔ̀ɔp kun')
    expect(PREVIEW_IDS).not.toContain('w:glai')

    for (const id of PREVIEW_IDS) {
      expect(await decideGate(clipUrl(id), null, 'pristine', true)).toEqual({ kind: 'pass' })
    }
    const held = voice1.find((e) => !DEMO_IDS.includes(e.id) && !PREVIEW_IDS.includes(e.id))
    expect(held).toBeTruthy()
    expect(await decideGate(clipUrl(held!.id), null, 'pristine', true)).toEqual({ kind: 'redirect', to: '/?signin' })
    expect(await decideGate(clipUrl('w:glai'), null, 'pristine', true)).toEqual({ kind: 'redirect', to: '/?signin' })
    expect(await decideGate('/preview/', null, 'pristine', true)).toEqual({ kind: 'pass' })
    expect(slopHits(previewSources())).toEqual([])
  })

  it('copies every word from the course, with one of its own glosses and no two alike', () => {
    for (const card of PREVIEW_VOICE) {
      const entry = getEntry(card.id)
      expect(entry, card.id).toBeDefined()
      expect(card.thai, card.id).toBe(entry!.thai)
      expect(card.rom, card.id).toBe(entry!.rom)
      expect(entry!.en, card.id).toContain(card.en[0])
    }
    const glosses = PREVIEW_VOICE.map((card) => card.en[0])
    expect(new Set(glosses).size).toBe(glosses.length)
  })

  it('closes on the twenty-five words and the waitlist, in plain copy', () => {
    const main = source('src/preview/main.tsx')
    const copy = [
      '{TOTAL} words of daily speech, heard and written.',
      'The course carries on from these words. It opens to the waitlist first.',
      'Start over',
      'Previous word',
      'Next word',
      'Learned',
    ]
    for (const line of copy) expect(main).toContain(line)
    expect(main).toContain('href="/#close"')
    expect(copy.filter((line) => /[!?;:]/.test(line))).toEqual([])
    expect(slopHits(copy)).toEqual([])
  })
})

function memoryStore(): Storage {
  const data = new Map<string, string>()
  return {
    get length() {
      return data.size
    },
    clear: () => data.clear(),
    key: (n: number) => [...data.keys()][n] ?? null,
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  }
}

describe('preview progress', () => {
  const ids = PREVIEW_IDS

  it('starts at the first word with nothing learned', () => {
    expect(loadProgress(ids, memoryStore())).toEqual({ at: 0, done: [] })
    expect(loadProgress(ids, null)).toEqual({ at: 0, done: [] })
  })

  it('keeps the card and the learned words across a reload', () => {
    const store = memoryStore()
    saveProgress({ at: 7, done: [ids[3]!, ids[0]!] }, store)
    expect(store.getItem(PROGRESS_KEY)).not.toBeNull()
    expect(loadProgress(ids, store)).toEqual({ at: 7, done: [ids[0], ids[3]] })
    clearProgress(store)
    expect(loadProgress(ids, store)).toEqual({ at: 0, done: [] })
  })

  it('drops unknown words, keeps the card in range, and survives a bad value', () => {
    const store = memoryStore()
    store.setItem(PROGRESS_KEY, JSON.stringify({ at: 99, done: ['w:glai', ids[1], 4] }))
    expect(loadProgress(ids, store)).toEqual({ at: ids.length - 1, done: [ids[1]] })
    store.setItem(PROGRESS_KEY, JSON.stringify({ at: -3.5, done: 'all' }))
    expect(loadProgress(ids, store)).toEqual({ at: 0, done: [] })
    store.setItem(PROGRESS_KEY, '{not json')
    expect(loadProgress(ids, store)).toEqual({ at: 0, done: [] })
  })
})
