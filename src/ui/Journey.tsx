import { LEVELS, SCRIPT_LEVELS } from '@content/index'
import type { TrackId } from '@content/types'
import type { LevelStatus } from '@/engine/scheduler'

function TrackList(props: {
  title: string
  lede: string
  levels: typeof LEVELS
  statuses: LevelStatus[]
  track: TrackId
  onOpen: (track: TrackId, n: number) => void
}) {
  return (
    <section className="track-block">
      <h2>{props.title}</h2>
      <p className="lede">{props.lede}</p>
      <ol className="contents" start={0}>
        {props.levels.map((lvl) => {
          const s = props.statuses[lvl.n]
          const locked = Boolean(s && s.total > 0 && !s.unlocked)
          const meta = !s || s.total === 0 ? 'soon' : locked ? 'locked' : String(s.total)
          return (
            <li key={`${props.track}-${lvl.n}`}>
              <button
                type="button"
                className="contents-row"
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
            <span className="contents-rom rom">words you have seen</span>
          </span>
          <span className="contents-meta">open</span>
        </button>
      </section>
      <TrackList
        title="Voice"
        lede="Spoken Thai, written so you can hear it. Translation only for now."
        levels={LEVELS}
        statuses={props.voice}
        track="voice"
        onOpen={props.onOpen}
      />
      <TrackList
        title="Script"
        lede="The letters, one shape at a time. Then the words you already know from Voice."
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
            <span className="contents-rom rom">every letter, and where it is taught</span>
          </span>
          <span className="contents-meta">open</span>
        </button>
      </section>
    </main>
  )
}
