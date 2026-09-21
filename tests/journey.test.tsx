import { describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { LEVELS, SCRIPT_LEVELS } from '../content/index'
import { allLevelStatus, type LevelStatus } from '../src/engine/scheduler'
import { emptyDoc } from '../src/storage/progress-schema'
import { Journey, trackPlace, trackTally } from '../src/ui/Journey'
import { TrackPage } from '../src/ui/TrackPage'

function status(over: Partial<LevelStatus> & { n: number }): LevelStatus {
  return {
    total: 10, seen: 0, passed: 0, mastered: 0, due: 0,
    unlocked: false, complete: false, progress: 0, ...over,
  }
}

describe('trackPlace', () => {
  it('names the first level still open, which is the highest reached', () => {
    const statuses = [
      status({ n: 0, unlocked: true, complete: true, seen: 10, mastered: 10 }),
      status({ n: 1, unlocked: true, complete: true, seen: 10, mastered: 10 }),
      status({ n: 2, unlocked: true, seen: 3 }),
      status({ n: 3 }),
    ]
    const place = trackPlace(statuses, LEVELS)
    expect(place.n).toBe(2)
    expect(place.title).toBe(LEVELS[2]!.title)
    expect(place.done).toBe(false)
  })

  it('falls back to the last level when the track is finished', () => {
    const statuses = LEVELS.map((l) => status({ n: l.n, unlocked: true, complete: true, seen: 10, mastered: 10 }))
    const place = trackPlace(statuses, LEVELS)
    expect(place.done).toBe(true)
    expect(place.n).toBe(LEVELS.length - 1)
  })

  it('skips a level with no cards', () => {
    const statuses = [status({ n: 0, total: 0 }), status({ n: 1, unlocked: true })]
    expect(trackPlace(statuses, LEVELS).n).toBe(1)
  })
})

describe('trackTally', () => {
  it('adds up the whole track', () => {
    const t = trackTally([status({ n: 0, seen: 4 }), status({ n: 1, seen: 6, total: 20 })])
    expect(t).toEqual({ seen: 10, total: 30 })
  })
})

describe('the landing page', () => {
  function render() {
    const doc = emptyDoc()
    const host = document.createElement('div')
    document.body.appendChild(host)
    act(() => {
      createRoot(host).render(
        <Journey
          voice={allLevelStatus(doc, Date.now(), 'voice')}
          script={allLevelStatus(doc, Date.now(), 'script')}
          onTrack={() => undefined}
          onReview={() => undefined}
          onAlphabet={() => undefined}
        />,
      )
    })
    return host
  }

  it('is four rows, not a list of every level', () => {
    const host = render()
    const rows = [...host.querySelectorAll('.contents-row')]
    expect(rows).toHaveLength(4)
    expect(rows.map((r) => r.querySelector('.contents-title')?.textContent)).toEqual([
      'Voice',
      'Script',
      'Already yours',
      'The whole script',
    ])
  })

  it('names the level reached on each track, and counts the cards', () => {
    const host = render()
    const rows = [...host.querySelectorAll('.contents-row')]
    expect(rows[0]!.querySelector('.contents-rom')?.textContent).toBe(`Level 0, ${LEVELS[0]!.title}`)
    expect(rows[1]!.querySelector('.contents-rom')?.textContent).toBe(`Level 0, ${SCRIPT_LEVELS[0]!.title}`)
    expect(rows[0]!.querySelector('.contents-n')?.textContent).toBe('0')
    // untouched: the meta is the bare catalog count, and the pie is empty
    const doc = emptyDoc()
    const voiceCards = trackTally(allLevelStatus(doc, Date.now(), 'voice')).total
    expect(voiceCards).toBeGreaterThan(0)
    expect(rows[0]!.querySelector('.contents-meta')?.textContent).toBe(String(voiceCards))
    expect(rows[0]!.querySelector('.quiet-pie')?.getAttribute('aria-valuenow')).toBe('0')
  })

  it('does not put a level title from either track on the page', () => {
    const text = render().textContent ?? ''
    expect(text).not.toContain(LEVELS[3]!.title)
    expect(text).not.toContain(SCRIPT_LEVELS[5]!.title)
  })
})

describe('a track page', () => {
  function renderTrack(track: 'voice' | 'script') {
    const doc = emptyDoc()
    const host = document.createElement('div')
    document.body.appendChild(host)
    act(() => {
      createRoot(host).render(
        <TrackPage track={track} statuses={allLevelStatus(doc, Date.now(), track)} onOpen={() => undefined} />,
      )
    })
    return host
  }

  it('lists every level of the track it was given', () => {
    expect(renderTrack('voice').querySelectorAll('.contents-row')).toHaveLength(LEVELS.length)
    expect(renderTrack('script').querySelectorAll('.contents-row')).toHaveLength(SCRIPT_LEVELS.length)
  })

  it('marks where you are and locks what is not open yet', () => {
    const rows = [...renderTrack('voice').querySelectorAll('.contents-row')]
    expect(rows[0]!.className).toContain('here')
    expect((rows[0] as HTMLButtonElement).disabled).toBe(false)
    expect((rows[1] as HTMLButtonElement).disabled).toBe(true)
  })

  it('names the track once, at the top', () => {
    expect(renderTrack('script').querySelector('h2')?.textContent).toBe('Script')
  })
})
