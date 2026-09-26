import { useState, type ReactNode } from 'react'
import { LEVELS, SCRIPT_LEVELS } from '@content/index'
import type { LevelMeta, TrackId } from '@content/types'
import { hereLevel, unlockCount, type LevelStatus } from '@/engine/scheduler'
import { DEMO, QUIET, sceneSrc, sceneSrcSet } from '@/landing/demo'
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
        <span className="contents-end">
          {props.here && <span className="contents-go">{chrome.continue}</span>}
          <span className="contents-meta">{props.meta}</span>
        </span>
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
      title={props.title}
      sub={place.done ? chrome.trackDone : props.track === 'voice' ? `Phonetic. ${place.title}` : place.title}
      here={!place.done}
      meta={place.done ? '' : `${levelDone} of ${levelTotal}`}
      meter={
        place.done ? undefined : (
          <Meter
            className="row-meter"
            value={frac}
            label={`${levelDone} of ${levelTotal} in ${place.title}`}
          />
        )
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
  /** Open her day, the comic lettered as far as the learner has come. */
  onDay: () => void
  /** Words already met. The hub offers them as a review. */
  yoursCount?: number
  /** Of those, the ones due now. */
  yoursDue?: number
  /** Panels of her day already lettered. */
  dayCount?: number
}) {
  const [scenes] = useState(() => {
    const first = Math.floor(Math.random() * QUIET.length)
    let second = Math.floor(Math.random() * (QUIET.length - 1))
    if (second >= first) second += 1
    return [QUIET[first]!, QUIET[second]!]
  })
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
        <Row
          title="Already yours"
          sub={props.yoursCount ? `${props.yoursCount} words` : chrome.yoursSub}
          rom
          meta={props.yoursDue ? `${props.yoursDue} due` : props.yoursCount ? 'Review' : ''}
          onOpen={props.onReview}
        />
        <Row
          title={chrome.dayTitle}
          sub={props.dayCount ? `${props.dayCount} of ${DEMO.length} lines` : chrome.daySub}
          rom
          meta="open"
          onOpen={props.onDay}
        />
        <Row title="The whole script" sub={chrome.alphabetSub} rom meta="open" onOpen={props.onAlphabet} />
      </ol>
      <div className="splash-pair">
        {scenes.map((scene) => (
          <figure key={scene.stem} className="splash">
            <img
              src={sceneSrc(scene.stem)}
              srcSet={sceneSrcSet(scene.stem)}
              sizes="(max-width: 860px) 42vw, 28vw"
              width={980}
              height={980}
              alt={scene.alt}
              decoding="async"
            />
          </figure>
        ))}
      </div>
    </main>
  )
}
