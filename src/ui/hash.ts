import type { TrackId } from '@content/types'

export type Route =
  | { name: 'journey' }
  | { name: 'intro'; n: number; track: TrackId }
  | { name: 'session' }
  | { name: 'account' }
  | { name: 'glyphs' }
  | { name: 'review' }
  | { name: 'alphabet' }

export function parseHash(raw = window.location.hash): Route {
  const h = raw.replace(/^#/, '') || '/'
  const scriptLevel = /^\/script\/level\/(\d+)$/.exec(h)
  if (scriptLevel) return { name: 'intro', n: Number(scriptLevel[1]), track: 'script' }
  const level = /^\/level\/(\d+)$/.exec(h)
  if (level) return { name: 'intro', n: Number(level[1]), track: 'voice' }
  if (h === '/session') return { name: 'session' }
  if (h === '/account') return { name: 'account' }
  if (h === '/glyphs') return { name: 'glyphs' }
  if (h === '/review') return { name: 'review' }
  if (h === '/alphabet') return { name: 'alphabet' }
  return { name: 'journey' }
}

export function hashFor(route: Route): string {
  switch (route.name) {
    case 'journey':
      return '#/'
    case 'intro':
      return route.track === 'script' ? `#/script/level/${route.n}` : `#/level/${route.n}`
    case 'session':
      return '#/session'
    case 'account':
      return '#/account'
    case 'glyphs':
      return '#/glyphs'
    case 'review':
      return '#/review'
    case 'alphabet':
      return '#/alphabet'
  }
}

export function go(route: Route): void {
  const next = hashFor(route)
  if (window.location.hash !== next) window.location.hash = next
  else window.dispatchEvent(new HashChangeEvent('hashchange'))
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
