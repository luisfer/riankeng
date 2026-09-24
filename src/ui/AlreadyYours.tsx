import { useEffect, useState } from 'react'
import { LEVELS } from '@content/levels'
import { SCRIPT_LEVELS } from '@content/script/levels'
import type { Entry } from '@content/types'
import { prefetchClip } from '@/audio/clips'
import { speakThai } from '@/audio/tts'
import { SESSION_SIZE } from '@/engine/session'
import { shuffleSeen } from '@/engine/scheduler'
import { Commit, TextBtn } from './bits'
import { chrome } from './copy'

type Filter = 'all' | string

function levelKey(e: Entry): string {
  return `${e.track ?? 'voice'}:${e.level}`
}

function levelLabel(key: string): string {
  const [track, n] = key.split(':')
  const i = Number(n)
  const title = track === 'script' ? SCRIPT_LEVELS[i]?.title : LEVELS[i]?.title
  return title ? `${i} ${title}` : String(i)
}

function ReviewRows(props: { entries: Entry[]; audioRate: number }) {
  return (
    <ul className="preview yours-list">
      {props.entries.map((e) => (
        <li key={e.id} className="quiet-row yours-row">
          <span className="rom">{e.rom}</span>
          <span>{e.en[0]}</span>
          <span className="thai preview-thai">{e.thai}</span>
          <TextBtn
            rank="quiet"
            onClick={() => {
              void speakThai(e.thai, e.id, props.audioRate, { gesture: true })
            }}
          >
            Hear
          </TextBtn>
        </li>
      ))}
    </ul>
  )
}

export function AlreadyYours(props: {
  pool: Entry[]
  take: number
  audioRate: number
  onMore?: () => void
  onSit?: (ids: string[]) => void
  canResume?: boolean
  onResume?: () => void
}) {
  const [salt, setSalt] = useState('0')
  const [filter, setFilter] = useState<Filter>('all')
  const counts = new Map<string, number>()
  for (const e of props.pool) counts.set(levelKey(e), (counts.get(levelKey(e)) ?? 0) + 1)
  const levels = [...counts.entries()].sort((a, b) => {
    const [ta, na] = a[0].split(':')
    const [tb, nb] = b[0].split(':')
    if (ta !== tb) return ta === 'voice' ? -1 : 1
    return Number(na) - Number(nb)
  })
  const filtered = filter === 'all' ? props.pool : props.pool.filter((e) => levelKey(e) === filter)
  const rows = shuffleSeen(filtered, salt, props.take)

  useEffect(() => {
    for (const e of rows) prefetchClip(e.id)
  }, [salt, props.pool, props.take])

  return (
    <section className="track-block yours-block">
      <h2>Already yours</h2>
      {props.pool.length === 0 ? (
        <p className="lede">{chrome.yoursEmpty}</p>
      ) : (
        <>
          <p className="account-quiet">
            {filter === 'all' ? `${props.pool.length} words` : `${levelLabel(filter)}, ${filtered.length} words`}
          </p>
          <div className="yours-filters">
            <TextBtn current={filter === 'all'} onClick={() => setFilter('all')}>
              All {props.pool.length}
            </TextBtn>
            {levels.map(([key, n]) => (
              <TextBtn key={key} current={filter === key} onClick={() => setFilter(key)}>
                {levelLabel(key)} {n}
              </TextBtn>
            ))}
          </div>
          <ReviewRows entries={rows} audioRate={props.audioRate} />
          <div className="yours-actions">
            <TextBtn onClick={() => setSalt(String(Number(salt) + 1))}>Shuffle</TextBtn>
            <span className="yours-go">
              {props.onMore && <TextBtn onClick={props.onMore}>More</TextBtn>}
              {props.onSit && rows.length > 0 && !props.canResume && (
                <Commit onClick={() => props.onSit!(rows.map((e) => e.id))}>Review</Commit>
              )}
              {props.onSit && rows.length > 0 && props.canResume && (
                <TextBtn onClick={() => props.onSit!(rows.map((e) => e.id))}>Review</TextBtn>
              )}
              {props.canResume && props.onResume && <Commit onClick={props.onResume}>Continue</Commit>}
            </span>
          </div>
        </>
      )}
    </section>
  )
}

export function ReviewPage(props: {
  pool: Entry[]
  audioRate: number
  onSit: (ids: string[]) => void
  canResume?: boolean
  onResume?: () => void
}) {
  return (
    <main className="page journey review-page">
      <AlreadyYours
        pool={props.pool}
        take={SESSION_SIZE}
        audioRate={props.audioRate}
        onSit={props.onSit}
        canResume={props.canResume}
        onResume={props.onResume}
      />
    </main>
  )
}
