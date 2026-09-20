import { LEVELS, SCRIPT_LEVELS } from '@content/index'
import type { TrackId } from '@content/types'
import { hereLevel, unlockCount, type LevelStatus } from '@/engine/scheduler'
import { chrome } from './copy'

function TrackList(props: {
  title: string
  lede: string
  levels: typeof LEVELS
  statuses: LevelStatus[]
  track: TrackId
  onOpen: (track: TrackId, n: number) => void
}) {
  const here = hereLevel(props.statuses)
  return (
    <section className="track-block">
      <h2>{props.title}</h2>
      <p className="lede">{props.lede}</p>
      <ol className="contents" start={0}>
        {props.levels.map((lvl) => {
          const s = props.statuses[lvl.n]
          const locked = Boolean(s && s.total > 0 && !s.unlocked)
          const at = here === lvl.n
          const meter = s ? unlockCount(s, props.track) : 0
          const meta = !s || s.total === 0 ? 'soon' : locked ? '' : meter > 0 ? `${meter} of ${s.total}` : String(s.total)
          const seenExtra = s && !locked && s.seen > meter ? `${s.seen} seen` : null
          return (
            <li key={`${props.track}-${lvl.n}`}>
              <button
                type="button"
                className={at ? 'contents-row here' : 'contents-row'}
                aria-current={at || undefined}
                disabled={locked}
                onClick={() => {
                  if (locked) return
                  props.onOpen(props.track, lvl.n)
                }}
              >
                <span className="contents-n">{lvl.n}</span>
                <span>
                  <span className="contents-title">{lvl.title}</span>
                  <span className="contents-rom rom">{lvl.rom}</span>
                  {seenExtra && <span className="contents-rom">{seenExtra}</span>}
                </span>
                <span className="contents-meta">{meta}</span>
              </button>
            </li>
          )
        })}
      </ol>
    </section>
  )
}

export function Journey(props: {
  voice: LevelStatus[]
  script: LevelStatus[]
  onOpen: (track: TrackId, n: number) => void
  onReview: () => void
  onAlphabet: () => void
}) {
  return (
    <main className="page journey">
      <section className="track-block">
        <button type="button" className="contents-row yours-link" onClick={props.onReview}>
          <span className="contents-n" />
          <span>
            <span className="contents-title">Already yours</span>
            <span className="contents-rom rom">{chrome.yoursSub}</span>
          </span>
          <span className="contents-meta">open</span>
        </button>
      </section>
      <TrackList
        title="Voice"
        lede={chrome.voiceLede}
        levels={LEVELS}
        statuses={props.voice}
        track="voice"
        onOpen={props.onOpen}
      />
      <TrackList
        title="Script"
        lede={chrome.scriptLede}
        levels={SCRIPT_LEVELS}
        statuses={props.script}
        track="script"
        onOpen={props.onOpen}
      />
      <section className="track-block">
        <button type="button" className="contents-row yours-link" onClick={props.onAlphabet}>
          <span className="contents-n" />
          <span>
            <span className="contents-title">The whole script</span>
            <span className="contents-rom rom">{chrome.alphabetSub}</span>
          </span>
          <span className="contents-meta">open</span>
        </button>
      </section>
    </main>
  )
}
