import { useState } from 'react'
import type { Entry } from '@content/types'
import { shuffleSeen } from '@/engine/scheduler'
import { TextBtn } from './bits'

function ReviewRows(props: { entries: Entry[] }) {
  return (
    <ul className="preview yours-list">
      {props.entries.map((e) => (
        <li key={e.id} className="quiet-row yours-row">
          <span className="rom">{e.rom}</span>
          <span>{e.en[0]}</span>
          <span className="thai preview-thai">{e.thai}</span>
        </li>
      ))}
    </ul>
  )
}

export function AlreadyYours(props: { pool: Entry[]; take: number; onMore?: () => void }) {
  const [salt, setSalt] = useState('0')
  const rows = shuffleSeen(props.pool, salt, props.take)

  return (
    <section className="track-block yours-block">
      <h2>Already yours</h2>
      {props.pool.length === 0 ? (
        <p className="lede">Clear a few Voice cards. They will land here.</p>
      ) : (
        <>
          <ReviewRows entries={rows} />
          <div className="yours-actions">
            <TextBtn onClick={() => setSalt(String(Number(salt) + 1))}>Shuffle</TextBtn>
            {props.onMore && <TextBtn onClick={props.onMore}>More</TextBtn>}
          </div>
        </>
      )}
    </section>
  )
}

export function ReviewPage(props: { pool: Entry[] }) {
  return (
    <main className="page journey review-page">
      <AlreadyYours pool={props.pool} take={24} />
    </main>
  )
}
