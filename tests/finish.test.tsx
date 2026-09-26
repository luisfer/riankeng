import { describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { entriesForLevel } from '../content/index'
import { afterMeet, isFinished, markCorrect, markMissMove, requeueCurrent, type LiveSession } from '../src/engine/session'
import { countWord, Finish, sittingTally, tallyLine } from '../src/ui/Finish'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function finished(ids: string[], missed: string[] = []): LiveSession {
  const queue = ids.map((id, k) => ({ id, modality: 'th-en' as const, salt: String(k), ...(missed.includes(id) ? { penalized: true } : {}) }))
  // A missed card comes back later in the queue, and is right by the end.
  for (const id of missed) queue.push({ id, modality: 'th-en', salt: 'again', penalized: true })
  return { startedAt: 1, level: 1, track: 'voice', queue, cursor: queue.length, answered: ids.length + missed.length, correct: ids.length, hold: null }
}

describe('the page that closes a sitting', () => {
  const ids = entriesForLevel(1, 'voice').slice(0, 16).map((e) => e.id)

  it('counts each card once, and the ones right at the first Check', () => {
    const tally = sittingTally(finished(ids, ids.slice(0, 3)))
    expect(tally.cards).toHaveLength(16)
    expect(tally.firstTime).toBe(13)
  })

  it('keeps the cards the queue turned past, after a Look and after a miss', () => {
    const [a, b, c, d] = ids
    let s: LiveSession = {
      startedAt: 1, level: 1, track: 'voice', cursor: 0, answered: 0, correct: 0, hold: null,
      queue: [
        { id: a!, modality: 'th-en', salt: 'a' },
        { id: b!, modality: 'en-th', salt: 'b' },
        { id: c!, modality: 'th-en', salt: 'c', meet: true },
        { id: d!, modality: 'th-en', salt: 'd' },
      ],
    }
    s = markCorrect(s) // a, right
    s = requeueCurrent(markMissMove(s)) // b, missed: it goes to the back and a turns past
    s = afterMeet(s) // c, looked at: its test goes to the back
    s = markCorrect(s) // d
    s = markCorrect(s) // b, right the second time
    s = markCorrect(s) // c, right
    expect(isFinished(s)).toBe(true)
    const tally = sittingTally(s)
    expect(tally.cards.map((e) => e.id)).toEqual([a, b, c, d])
    expect(tally.firstTime).toBe(3)
  })

  it('writes the tally as a primer does, in words', () => {
    expect(countWord(16)).toBe('sixteen')
    expect(countWord(24)).toBe('24')
    expect(tallyLine(16, 13)).toBe('Sixteen cards, thirteen right the first time.')
    expect(tallyLine(16, 16)).toBe('Sixteen cards, every one right the first time.')
    expect(tallyLine(1, 1)).toBe('One card, right the first time.')
  })

  it('lists the words just worked, and offers the next sitting first', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    let again = 0
    act(() => {
      createRoot(host).render(
        <Finish sitting={finished(ids.slice(0, 4))} audioRate={0.85} onAgain={() => void again++} onBack={() => undefined} />,
      )
    })
    expect(host.querySelector('h1')?.textContent).toBe('Four cards, every one right the first time.')
    expect(host.querySelectorAll('.yours-row')).toHaveLength(4)
    const sit = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Sit again')
    expect(document.activeElement).toBe(sit)
    act(() => sit!.click())
    expect(again).toBe(1)
  })
})
