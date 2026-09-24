import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import voice1 from '../content/words/level-01'
import voice0 from '../content/words/level-00'
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
    expect(html).toContain('Try them')
    expect(html).toContain('maa, máa, mǎa. Come, horse, dog.')
    expect(slopHits([html.slice(sitting, html.indexOf('id="close"'))])).toEqual([])
  })

  it('keeps the preview import graph on level 0', () => {
    for (const text of previewSources()) expect(text).not.toMatch(LEAK)
    expect(source('vite.config.ts')).toContain('preview/index.html')
  })

  it('publishes eight voice cards, and nothing after', async () => {
    expect(PREVIEW_VOICE.map((e) => e.id)).toEqual(voice0.slice(0, 8).map((e) => e.id))
    expect(PREVIEW_IDS).toEqual(PREVIEW_VOICE.map((e) => e.id))
    expect(PREVIEW_VOICE).toHaveLength(8)
    for (const e of PREVIEW_VOICE) expect(e.level).toBe(0)

    for (const id of PREVIEW_IDS) {
      expect(await decideGate(clipUrl(id), null, 'pristine', true)).toEqual({ kind: 'pass' })
    }
    const held = voice1.find((e) => !DEMO_IDS.includes(e.id) && !PREVIEW_IDS.includes(e.id))
    expect(held).toBeTruthy()
    expect(await decideGate(clipUrl(held!.id), null, 'pristine', true)).toEqual({ kind: 'redirect', to: '/?signin' })
    expect(await decideGate(clipUrl('w:bpai'), null, 'pristine', true)).toEqual({ kind: 'redirect', to: '/?signin' })
    expect(await decideGate('/preview/', null, 'pristine', true)).toEqual({ kind: 'pass' })
    expect(slopHits(previewSources())).toEqual([])
  })
})
