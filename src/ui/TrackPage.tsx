import { levelsFor } from '@content/index'
import type { TrackId } from '@content/types'
import { hereLevel, unlockCount, type LevelStatus } from '@/engine/scheduler'
import { Meter } from './bits'
import { chrome } from './copy'

/** The contents of one track: every level, where you are, how much is cleared. */
export function TrackPage(props: {
  track: TrackId
  statuses: LevelStatus[]
  onOpen: (track: TrackId, n: number) => void
}) {
  const script = props.track === 'script'
  const here = hereLevel(props.statuses, props.track)
  return (
    <main className="page journey">
      <section className="track-block">
        <h2>{script ? 'Script' : 'Voice'}</h2>
        <p className="lede">{script ? chrome.scriptLede : chrome.voiceLede}</p>
        <ol className="contents" start={0}>
          {levelsFor(props.track).map((lvl) => {
            const s = props.statuses[lvl.n]
            const locked = Boolean(s && s.total > 0 && !s.unlocked)
            const at = here === lvl.n
            const done = s ? unlockCount(s, props.track) : 0
            const meta = !s || s.total === 0 ? 'soon' : locked ? '' : `${done} of ${s.total}`
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
                  </span>
                  <span className="contents-end">
                    {at && <span className="contents-go">{chrome.continue}</span>}
                    <span className="contents-meta">{meta}</span>
                  </span>
                  {at && s && s.total > 0 && (
                    <Meter
                      className="row-meter"
                      value={done / s.total}
                      label={`${done} of ${s.total} done in ${lvl.title}`}
                    />
                  )}
                </button>
              </li>
            )
          })}
        </ol>
      </section>
    </main>
  )
}
