import type { ReactNode } from 'react'
import { LEVELS, SCRIPT_LEVELS } from '@content/index'
import type { LevelMeta, TrackId } from '@content/types'
import { hereLevel, type LevelStatus } from '@/engine/scheduler'
import { QuietPie } from './bits'
import { chrome } from './copy'

/** Cards answered at least once, and cards there are, across a whole track. */
export function trackTally(statuses: LevelStatus[]): { seen: number; total: number } {
  let seen = 0
  let total = 0
  for (const s of statuses) {
    seen += s.seen
    total += s.total
  }
  return { seen, total }
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

function Row(props: { n?: number; title: string; sub: string; rom?: boolean; meta: ReactNode; onOpen: () => void }) {
  return (
    <li>
      <button type="button" className="contents-row" onClick={props.onOpen}>
        <span className="contents-n">{props.n ?? ''}</span>
        <span>
          <span className="contents-title">{props.title}</span>
          <span className={props.rom ? 'contents-rom rom' : 'contents-rom'}>{props.sub}</span>
        </span>
        <span className="contents-meta">{props.meta}</span>
      </button>
    </li>
  )
}

function TrackRow(props: { title: string; statuses: LevelStatus[]; levels: LevelMeta[]; onOpen: () => void }) {
  const place = trackPlace(props.statuses, props.levels)
  const { seen, total } = trackTally(props.statuses)
  return (
    <Row
      n={place.n}
      title={props.title}
      sub={place.done ? chrome.trackDone : `Level ${place.n}, ${place.title}`}
      meta={
        <span className="track-meta">
          <QuietPie value={total ? seen / total : 0} label={`${seen} of ${total} on ${props.title}`} />
          {seen > 0 ? `${seen} of ${total}` : String(total)}
        </span>
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
      <ol className="contents">
        <TrackRow title="Voice" statuses={props.voice} levels={LEVELS} onOpen={() => props.onTrack('voice')} />
        <TrackRow title="Script" statuses={props.script} levels={SCRIPT_LEVELS} onOpen={() => props.onTrack('script')} />
        <Row title="Already yours" sub={chrome.yoursSub} rom meta="open" onOpen={props.onReview} />
        <Row title="The whole script" sub={chrome.alphabetSub} rom meta="open" onOpen={props.onAlphabet} />
      </ol>
    </main>
  )
}
