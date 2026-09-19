import { useEffect, useState } from 'react'
import type { Entry } from '@content/types'
import { prefetchClip } from '@/audio/clips'
import { speakThai } from '@/audio/tts'
import { shuffleSeen } from '@/engine/scheduler'
import { TextBtn } from './bits'

function ReviewRows(props: { entries: Entry[]; audioRate: number }) {
  return (
    <ul className="preview yours-list">
      {props.entries.map((e) => (
        <li key={e.id} className="quiet-row yours-row">
          <span className="rom">{e.rom}</span>
          <span>{e.en[0]}</span>
          <span className="thai preview-thai">{e.thai}</span>
          <TextBtn
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
}) {
  const [salt, setSalt] = useState('0')
  const rows = shuffleSeen(props.pool, salt, props.take)

  useEffect(() => {
    for (const e of rows) prefetchClip(e.id)
  }, [salt, props.pool, props.take])

  return (
    <section className="track-block yours-block">
      <h2>Already yours</h2>
      {props.pool.length === 0 ? (
        <p className="lede">Clear a few Voice cards. They will land here.</p>
      ) : (
        <>
          <ReviewRows entries={rows} audioRate={props.audioRate} />
          <div className="yours-actions">
            <TextBtn onClick={() => setSalt(String(Number(salt) + 1))}>Shuffle</TextBtn>
            {props.onSit && (
              <TextBtn onClick={() => props.onSit!(rows.slice(0, 16).map((e) => e.id))}>Sit these</TextBtn>
            )}
            {props.onMore && <TextBtn onClick={props.onMore}>More</TextBtn>}
          </div>
        </>
      )}
    </section>
  )
}

export function ReviewPage(props: { pool: Entry[]; audioRate: number; onSit: (ids: string[]) => void }) {
  return (
    <main className="page journey review-page">
      <AlreadyYours pool={props.pool} take={24} audioRate={props.audioRate} onSit={props.onSit} />
    </main>
  )
}
