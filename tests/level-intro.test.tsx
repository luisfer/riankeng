import { describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import type { TrackId } from '../content/types'
import { chrome } from '../src/ui/copy'
import { LevelIntro } from '../src/ui/LevelIntro'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function renderIntro(n: number, track: TrackId) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  act(() => {
    createRoot(host).render(<LevelIntro n={n} track={track} onStart={() => undefined} />)
  })
  return host
}

describe('LevelIntro', () => {
  it('keeps Continue on a paused sitting even if the level is locked', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    act(() => {
      createRoot(host).render(
        <LevelIntro n={1} track="voice" locked canContinue onStart={() => undefined} onContinue={() => undefined} />,
      )
    })
    const labels = [...host.querySelectorAll('button')].map((b) => b.textContent)
    expect(labels).toContain('Continue')
    expect(host.querySelector('.warn')).toBeNull()
  })

  it('credits the romanization on the sound system, and nowhere else', () => {
    expect(renderIntro(0, 'voice').querySelector('.system-source')?.textContent).toBe(chrome.systemSource)
    expect(renderIntro(1, 'voice').querySelector('.system-source')).toBeNull()
    expect(renderIntro(0, 'script').querySelector('.system-source')).toBeNull()
  })
})
