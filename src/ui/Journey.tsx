import { useState, type ReactNode } from 'react'
import { LEVELS, SCRIPT_LEVELS } from '@content/index'
import type { LevelMeta, TrackId } from '@content/types'
import { hereLevel, unlockCount, type LevelStatus } from '@/engine/scheduler'
import { QUIET, sceneSrc, sceneSrcSet } from '@/landing/demo'
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
export function trackPlace(statuses: LevelStatus[], levels: LevelMeta[], track: TrackId = 'voice'): { n: number; title: string; done: boolean } {
  const here = hereLevel(statuses, track)
  const n = here ?? Math.max(0, levels.length - 1)
  return { n, title: levels[n]?.title ?? '', done: here === null }
}

function Row(props: {
  n?: number
  title: string
  sub: string
  rom?: boolean
  here?: boolean
  meta: ReactNode
  /** Laid over the row's own divider, so progress needs no column of its own. */
  meter?: ReactNode
  onOpen: () => void
}) {
  return (
    <li>
      <button type="button" className={props.here ? 'contents-row here' : 'contents-row'} onClick={props.onOpen}>
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
  const place = trackPlace(props.statuses, props.levels, props.track)
  const here = props.statuses[place.n]
  const levelDone = here ? unlockCount(here, props.track) : 0
  const levelTotal = here?.total ?? 0
  const frac = place.done ? 1 : levelTotal ? levelDone / levelTotal : 0
  return (
    <Row
      n={place.n}
      title={place.title}
      sub={place.done ? `${props.title}. ${chrome.trackDone}` : props.title}
      here={!place.done}
      meta={place.done ? '' : `${levelDone} of ${levelTotal}`}
      meter={
        <Meter
          className="row-meter"
          value={frac}
          label={
            place.done
              ? `${props.title}, every level cleared`
              : `${levelDone} of ${levelTotal} in ${place.title}`
          }
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
  const [scene] = useState(() => QUIET[Math.floor(Math.random() * QUIET.length)]!)
  return (
    <main className="page journey">
      <figure className="splash">
        <img
          src={sceneSrc(scene.stem)}
          srcSet={sceneSrcSet(scene.stem)}
          sizes="(max-width: 520px) calc(100vw - 48px), 420px"
          width={980}
          height={980}
          alt={scene.alt}
          decoding="async"
        />
      </figure>
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
