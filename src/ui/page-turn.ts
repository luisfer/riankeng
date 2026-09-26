import { flushSync } from 'react-dom'
import type { Route } from './hash'

/** How deep a screen sits in the course: the page turns forward going in, back coming out. */
const DEPTH: Record<Route['name'], number> = {
  journey: 0,
  track: 1,
  review: 1,
  alphabet: 1,
  day: 1,
  account: 1,
  intro: 2,
  session: 3,
  done: 4,
}

type ViewTransitionDocument = Document & {
  startViewTransition?: (update: () => void) => { finished: Promise<void> }
}

/**
 * Change screens as a primer turns a page: the old one lifts away and the new one settles in, the
 * trail left where it is. Where the browser cannot, or the reader asked for less motion, the screen
 * simply changes. `update` holds every state change of the move, so they land in one render.
 */
export function turnPage(from: Route, to: Route, update: () => void): void {
  const doc = document as ViewTransitionDocument
  const still = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
  if (!doc.startViewTransition || still || from.name === to.name) {
    update()
    return
  }
  const root = document.documentElement
  root.dataset.turn = DEPTH[to.name] < DEPTH[from.name] ? 'back' : 'forward'
  const turn = doc.startViewTransition(() => flushSync(update))
  void turn.finished.finally(() => {
    delete root.dataset.turn
  })
}
