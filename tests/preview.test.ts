import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import voice1 from '../content/words/level-01'
import { clipUrl } from '../src/audio/clip-url'
import { decideGate } from '../src/gate-token'
import { DEMO_IDS } from '../src/landing/demo'
import { PREVIEW_IDS, PREVIEW_VOICE } from '../src/preview/catalog'
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
    const sitting = html.indexOf('id="sitting"')
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
})
