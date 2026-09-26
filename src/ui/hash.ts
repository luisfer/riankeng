import type { TrackId } from '@content/types'

export type Route =
  | { name: 'journey' }
  | { name: 'track'; track: TrackId }
  | { name: 'intro'; n: number; track: TrackId }
  | { name: 'session' }
  | { name: 'account' }
  | { name: 'review' }
  | { name: 'alphabet' }
  | { name: 'day' }
  | { name: 'done' }

export function parseHash(raw = window.location.hash): Route {
  const h = raw.replace(/^#/, '') || '/'
  const scriptLevel = /^\/script\/level\/(\d+)$/.exec(h)
  if (scriptLevel) return { name: 'intro', n: Number(scriptLevel[1]), track: 'script' }
  const level = /^\/level\/(\d+)$/.exec(h)
  if (level) return { name: 'intro', n: Number(level[1]), track: 'voice' }
  if (h === '/voice') return { name: 'track', track: 'voice' }
  if (h === '/script') return { name: 'track', track: 'script' }
  if (h === '/session') return { name: 'session' }
  if (h === '/account') return { name: 'account' }
  if (h === '/review') return { name: 'review' }
  if (h === '/alphabet') return { name: 'alphabet' }
  if (h === '/day') return { name: 'day' }
  if (h === '/done') return { name: 'done' }
  return { name: 'journey' }
}

export function hashFor(route: Route): string {
  switch (route.name) {
    case 'journey':
      return '#/'
    case 'track':
      return route.track === 'script' ? '#/script' : '#/voice'
    case 'intro':
      return route.track === 'script' ? `#/script/level/${route.n}` : `#/level/${route.n}`
    case 'session':
      return '#/session'
    case 'account':
      return '#/account'
    case 'review':
      return '#/review'
    case 'alphabet':
      return '#/alphabet'
    case 'day':
      return '#/day'
    case 'done':
      return '#/done'
  }
}

export function go(route: Route): void {
  const next = hashFor(route)
  if (window.location.hash !== next) window.location.hash = next
  else window.dispatchEvent(new HashChangeEvent('hashchange'))
}

/** The address bar catches up with a screen already turning: a Back stop as `go` makes, and no second turn. */
export function follow(route: Route): void {
  const next = hashFor(route)
  if (window.location.hash === next) return
  window.history.pushState(null, '', `${window.location.pathname}${window.location.search}${next}`)
}

/** Leave a dead `#/session` without stacking another Back stop. */
export function replace(route: Route): void {
  const next = hashFor(route)
  if (window.location.hash === next) {
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    return
  }
  const url = `${window.location.pathname}${window.location.search}${next}`
  window.history.replaceState(null, '', url)
  window.dispatchEvent(new HashChangeEvent('hashchange'))
}
