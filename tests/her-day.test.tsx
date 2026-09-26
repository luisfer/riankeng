import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { getEntry } from '../content/index'
import { DEMO, NIGHT } from '../src/landing/demo'
import { emptyDoc, type ProgressDoc } from '../src/storage/progress-schema'
import { chrome } from '../src/ui/copy'
import { HerDay, saidStems } from '../src/ui/HerDay'

const SEEN = 'riankeng:day-seen:v1'

function met(n: number): ProgressDoc {
  const doc = emptyDoc()
  for (const d of DEMO.slice(0, n)) {
    doc.items[d.id] = { id: d.id, stage: 1, due: 0, reps: 1, lapses: 0, lastSeen: 1, days: ['2026-09-20'], history: [] }
  }
  return doc
}

let roots: Root[] = []
function render(doc: ProgressDoc): HTMLElement {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root = createRoot(host)
  roots.push(root)
  act(() => root.render(<HerDay doc={doc} audioRate={0.85} />))
  return host
}

beforeEach(() => localStorage.clear())
afterEach(() => {
  for (const r of roots) act(() => r.unmount())
  roots = []
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('her day', () => {
  it('letters a panel once its line is met, and only then', () => {
    expect(saidStems(emptyDoc()).size).toBe(0)
    const doc = met(3)
    expect([...saidStems(doc)]).toEqual(DEMO.slice(0, 3).map((d) => d.stem))
    const host = render(doc)
    const balloons = [...host.querySelectorAll('.day-cell .balloon')]
    expect(balloons.map((b) => b.textContent)).toEqual(DEMO.slice(0, 3).map((d) => d.balloon.lines.join('')))
    for (const b of balloons) expect(b.getAttribute('lang')).toBe('th')
    expect(host.querySelectorAll('.day-hear')).toHaveLength(3)
    expect(host.querySelector('.day-hear')?.textContent).toBe(DEMO[0]!.rom)
  })

  it('keeps an unmet panel whole, balloon empty, and names the level that brings its line', () => {
    const host = render(met(1))
    const cells = [...host.querySelectorAll('.day-cell')]
    expect(cells).toHaveLength(DEMO.length + 1)
    const second = cells[1]!
    expect(second.querySelector('.balloon')).toBeNull()
    expect(second.querySelector('img')?.getAttribute('alt')).toBe(DEMO[1]!.alt)
    expect(second.getAttribute('style')).toBeNull()
    expect(second.querySelector('.day-later')?.textContent).toBe(`Voice ${getEntry(DEMO[1]!.id)!.level}`)
    const night = cells.at(-1)!
    expect(night.querySelector('img')?.getAttribute('alt')).toBe(NIGHT.alt)
    expect(night.querySelector('.balloon, .day-caption')).toBeNull()
  })

  it('letters in what is new since the last visit, and says so only when there was one', () => {
    let host = render(met(3))
    expect(host.querySelector('.day-count')?.textContent).toBe(`3 of ${DEMO.length} lines.`)
    expect(host.querySelectorAll('.day-cell[data-fresh]')).toHaveLength(3)
    expect(JSON.parse(localStorage.getItem(SEEN) ?? '[]')).toEqual(DEMO.slice(0, 3).map((d) => d.stem))

    host = render(met(3))
    expect(host.querySelectorAll('.day-cell[data-fresh]')).toHaveLength(0)

    host = render(met(4))
    expect(host.querySelector('.day-count')?.textContent).toBe(`4 of ${DEMO.length} lines, 1 new since last time.`)
    const fresh = [...host.querySelectorAll('.day-cell[data-fresh]')]
    expect(fresh).toHaveLength(1)
    expect(fresh[0]!.querySelector('.day-hear')?.textContent).toBe(DEMO[3]!.rom)
  })

  it('names the whole day once every line is lettered', () => {
    const host = render(met(DEMO.length))
    expect(host.querySelector('.day-count')?.textContent).toBe(chrome.dayAll)
    expect(host.querySelectorAll('.day-cell .balloon')).toHaveLength(DEMO.length)
  })

  it('reads with no storage at all', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked')
    })
    const host = render(met(2))
    expect(host.querySelectorAll('.day-cell .balloon')).toHaveLength(2)
    expect(host.querySelector('.day-count')?.textContent).toBe(`2 of ${DEMO.length} lines.`)
  })
})
