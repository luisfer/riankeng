import type { ReactNode } from 'react'
import { LEVELS, SCRIPT_LEVELS } from '@content/index'
import type { LevelMeta, TrackId } from '@content/types'
import { hereLevel, unlockCount, type LevelStatus } from '@/engine/scheduler'
import { Meter } from './bits'
import { chrome } from './copy'

/**
 * What the track counts as done, over what there is. Voice counts mastery,
 * Script counts one right answer, which is what each one unlocks on.
 */
export function trackTally(statuses: LevelStatus[], track: TrackId): { done: number; total: number } {
  let done = 0
  let total = 0
  for (const s of statuses) {
    done += unlockCount(s, track)
    total += s.total
  }
  return { done, total }
}

/**
 * The level you are on. hereLevel is the first unlocked level still open, so
 * every level before it is finished: it is the highest you have reached.
 */
export function trackPlace(statuses: LevelStatus[], levels: LevelMeta[]): { n: number; title: string; done: boolean } {
  const here = hereLevel(statuses)
  const n = here ?? Math.max(0, levels.length - 1)
  return { n, title: levels[n]?.title ?? '', done: here === null }
}

function Row(props: {
  n?: number
  title: string
  sub: string
  rom?: boolean
  meta: ReactNode
  /** Laid over the row's own divider, so progress needs no column of its own. */
  meter?: ReactNode
  onOpen: () => void
}) {
  return (
    <li>
      <button type="button" className="contents-row" onClick={props.onOpen}>
        <span className="contents-n">{props.n ?? ''}</span>
        <span>
          <span className="contents-title">{props.title}</span>
          <span className={props.rom ? 'contents-rom rom' : 'contents-rom'}>{props.sub}</span>
        </span>
        <span className="contents-meta">{props.meta}</span>
        {props.meter}
      </button>
    </li>
  )
}

function TrackRow(props: {
  title: string
  track: TrackId
  statuses: LevelStatus[]
  levels: LevelMeta[]
  onOpen: () => void
}) {
  const place = trackPlace(props.statuses, props.levels)
  const { done, total } = trackTally(props.statuses, props.track)
  return (
    <Row
      n={place.n}
      title={props.title}
      sub={place.done ? chrome.trackDone : `Level ${place.n}, ${place.title}`}
      meta={done > 0 ? `${done} of ${total}` : String(total)}
      meter={
        <Meter
          className="row-meter"
          value={total ? done / total : 0}
          label={`${done} of ${total} done on ${props.title}`}
        />
      }
      onOpen={props.onOpen}
    />
  )
}

export function Journey(props: {
  voice: LevelStatus[]
  script: LevelStatus[]
  onTrack: (track: TrackId) => void
  onReview: () => void
  onAlphabet: () => void
}) {
  return (
    <main className="page journey">
      <ol className="contents hub">
        <TrackRow
          title="Voice"
          track="voice"
          statuses={props.voice}
          levels={LEVELS}
          onOpen={() => props.onTrack('voice')}
        />
        <TrackRow
          title="Script"
          track="script"
          statuses={props.script}
          levels={SCRIPT_LEVELS}
          onOpen={() => props.onTrack('script')}
        />
        <Row title="Already yours" sub={chrome.yoursSub} rom meta="open" onOpen={props.onReview} />
        <Row title="The whole script" sub={chrome.alphabetSub} rom meta="open" onOpen={props.onAlphabet} />
      </ol>
    </main>
  )
}
