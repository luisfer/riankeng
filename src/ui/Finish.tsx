import { useEffect, useRef } from 'react'
import { LEVELS, SCRIPT_LEVELS, getEntry } from '@content/index'
import type { Entry } from '@content/types'
import { unlockCount, type LevelStatus } from '@/engine/scheduler'
import { sittingCards, type LiveSession } from '@/engine/session'
import { ReviewRows } from './AlreadyYours'
import { Commit, Meter, TextBtn } from './bits'
import { chrome } from './copy'

const WORDS = [
  'no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
]

/** A count as a primer writes it: in words to twenty, then in figures. */
export function countWord(n: number): string {
  return WORDS[n] ?? String(n)
}

/** The cards a finished sitting worked, once each, and how many were right at the first Check. */
export function sittingTally(session: LiveSession): { cards: Entry[]; firstTime: number } {
  const seen = new Set<string>()
  const missed = new Set<string>()
  const cards: Entry[] = []
  for (const q of sittingCards(session)) {
    if (q.penalized) missed.add(q.id)
    if (seen.has(q.id)) continue
    seen.add(q.id)
    const entry = getEntry(q.id)
    if (entry) cards.push(entry)
  }
  return { cards, firstTime: cards.length - [...missed].filter((id) => seen.has(id)).length }
}

export function tallyLine(cards: number, firstTime: number): string {
  const head = `${countWord(cards)} ${cards === 1 ? 'card' : 'cards'}`
  const said = head.charAt(0).toUpperCase() + head.slice(1)
  if (firstTime === cards) return `${said}, ${cards === 1 ? 'right' : 'every one right'} the first time.`
  return `${said}, ${countWord(firstTime)} right the first time.`
}

/**
 * The page at the end of a sitting, as a primer closes an exercise: how it went, the words just
 * worked with Hear, where the level stands, and the next sitting one key away.
 */
export function Finish(props: {
  sitting: LiveSession
  status?: LevelStatus
  audioRate: number
  onAgain: () => void
  onBack: () => void
}) {
  const { cards, firstTime } = sittingTally(props.sitting)
  // Sit again holds the focus, one Enter from the next sitting, but the page stays at its top: on a
  // phone the sixteen words below would otherwise scroll the tally out of sight.
  const actions = useRef<HTMLDivElement>(null)
  useEffect(() => {
    actions.current?.querySelector<HTMLButtonElement>('.commit')?.focus({ preventScroll: true })
  }, [])
  const track = props.sitting.track ?? 'voice'
  const review = Boolean(props.sitting.review)
  const level = (track === 'script' ? SCRIPT_LEVELS : LEVELS)[props.sitting.level]
  const status = review ? undefined : props.status
  const done = status ? unlockCount(status, track) : 0
  return (
    <main className="page finish">
      <p className="prompt session-prompt">
        {review ? chrome.yoursTitle : `${track === 'script' ? 'Script' : 'Voice'} ${props.sitting.level}, ${level?.title ?? ''}`.trim()}
      </p>
      <h1 className="finish-line">{tallyLine(cards.length, firstTime)}</h1>
      {status && status.total > 0 && (
        <div className="lesson-progress">
          <Meter value={done / status.total} label={`${done} of ${status.total} in ${level?.title ?? ''}`} />
          <span>
            {done} of {status.total} {track === 'script' ? 'right once' : 'mastered'}
          </span>
        </div>
      )}
      <ReviewRows entries={cards} audioRate={props.audioRate} />
      <div className="finish-actions" ref={actions}>
        <Commit onClick={props.onAgain}>
          {review ? chrome.reviewAgain : chrome.sitAgain}
        </Commit>
        <TextBtn onClick={props.onBack}>{review ? chrome.yoursTitle : track === 'script' ? 'Script' : 'Voice'}</TextBtn>
      </div>
    </main>
  )
}
