import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { signInAccount } from '../storage/auth'
import { COMIC_SLOTS, fillClose, fillScene, mountComic, pickComic, pickLayout, pickPhone, placeComic, swapComicStem } from './comic'
import { landing } from './copy'
import { bindWaitlist, openWaitlistAt } from './waitlist'
import { DEMO, QUIET, TRY_ORDER } from './demo'
import { TRY_EVENT, TryCard } from './TryCard'
import { landingRedirect } from './redirect'
import { rememberRef } from './ref'
import './bar'

const away = landingRedirect(location.hash, location.search, matchMedia('(display-mode: standalone)').matches)
if (away) location.replace(away)
rememberRef()

const html = document.documentElement
const forms = [...document.querySelectorAll<HTMLFormElement>('form[data-signin]')]
const heroField = document.querySelector<HTMLInputElement>('#password')
const navSign = document.querySelector<HTMLAnchorElement>('[data-nav-sign]')

function missLine(form: HTMLFormElement, text: string) {
  const miss = form.querySelector<HTMLElement>('[data-miss]')
  if (miss) miss.textContent = text
}

function openCourse() {
  location.assign('/learn/')
}

function markSignedIn() {
  html.dataset.session = 'in'
  delete html.dataset.gate
  if (navSign) {
    navSign.textContent = landing.signIn
    navSign.href = '/learn/'
    navSign.removeAttribute('aria-expanded')
    navSign.removeAttribute('aria-controls')
  }
  for (const form of forms) {
    const commit = form.querySelector<HTMLButtonElement>('button[type="submit"]')
    if (commit) commit.textContent = landing.open
  }
}

function closeGate() {
  delete html.dataset.gate
  navSign?.setAttribute('aria-expanded', 'false')
  if (location.hash === '#gate') history.replaceState(null, '', `${location.pathname}${location.search}`)
}

function openGate() {
  if (html.dataset.session === 'in') return
  html.dataset.gate = 'open'
  navSign?.setAttribute('aria-expanded', 'true')
  heroField?.focus()
}

void fetch('/api/session', { cache: 'no-store' })
  .then((res) => (res.ok ? (res.json() as Promise<{ in?: boolean }>) : { in: false }))
  .then((s) => {
    if (s.in) markSignedIn()
  })
  .catch(() => undefined)

for (const form of forms) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (html.dataset.session === 'in') return openCourse()
    const emailField = form.querySelector<HTMLInputElement>('input[name="email"]')
    const field = form.querySelector<HTMLInputElement>('input[name="password"]')
    const email = emailField?.value.trim() ?? ''
    const password = field?.value ?? ''
    missLine(form, '')
    if (!email) {
      missLine(form, landing.typeEmail)
      emailField?.focus()
      return
    }
    if (!password) {
      missLine(form, landing.typePassword)
      field?.focus()
      return
    }
    try {
      const session = await signInAccount(email, password)
      if (!session) {
        missLine(form, landing.couldNot)
        field?.select()
        return
      }
      const res = await fetch('/api/gate', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.accessToken}` },
      })
      if (res.ok) return openCourse()
      missLine(form, res.status === 503 ? landing.unset : landing.couldNot)
    } catch {
      missLine(form, landing.offline)
    }
    field?.select()
  })
}

// Arriving from the course gate: /?signin opens the form, /?signin=unset names the problem.
const params = new URLSearchParams(location.search)
if (params.has('signin')) {
  if (params.get('signin') === 'unset' && forms[0]) missLine(forms[0], landing.unset)
  openGate()
  history.replaceState(null, '', '/')
}

// Log in lives in the nav. The same control closes the panel.
navSign?.addEventListener('click', (e) => {
  if (html.dataset.session === 'in') return
  e.preventDefault()
  if (html.dataset.gate === 'open') closeGate()
  else openGate()
})

for (const form of document.querySelectorAll<HTMLFormElement>('form[data-waitlist]')) {
  bindWaitlist(form, () => {
    delete html.dataset.gate
    navSign?.setAttribute('aria-expanded', 'false')
  })
}
if (openWaitlistAt(location.hash)) {
  // Landing on /#close, the browser's own jump to the fragment moves focus to the page once it
  // arrives. The caret goes back into the field after that.
  addEventListener(
    'load',
    () => requestAnimationFrame(() => document.querySelector<HTMLInputElement>('#close input[name="email"]')?.focus({ preventScroll: true })),
    { once: true },
  )
}
addEventListener('hashchange', () => openWaitlistAt(location.hash))

const layout = pickLayout()
const shown = document.querySelector<HTMLElement>('.try')?.dataset.stem
const comicPool = shown ? DEMO.filter((card) => card.stem !== shown) : DEMO
const comicCards = placeComic(pickComic(comicPool, COMIC_SLOTS))
mountComic(document, comicCards, layout, pickPhone())
const [sittingScene, closeScene] = pickComic(QUIET, 2)
if (sittingScene) fillScene(document, sittingScene, '.sitting-art')
if (closeScene) fillClose(document, closeScene)

const spare = DEMO.filter((card) => card.stem !== shown && !comicCards.some((drawn) => drawn.stem === card.stem))
let current = shown ?? ''
const tryHost = document.getElementById('try-card')
if (tryHost) {
  new MutationObserver(() => {
    const stem = tryHost.querySelector<HTMLElement>('.try')?.dataset.stem ?? ''
    if (!stem || stem === current) return
    const previous = current
    current = stem
    const taken = [...tryHost.ownerDocument.querySelectorAll<HTMLElement>('a.panel')].some((panel) => panel.dataset.scene === stem)
    if (!taken) return
    const replacement = spare.shift()
    if (swapComicStem(document, stem, replacement)) {
      const freed = DEMO.find((card) => card.stem === previous)
      if (freed) spare.push(freed)
    } else if (replacement) spare.unshift(replacement)
  }).observe(tryHost, { subtree: true, attributes: true, attributeFilter: ['data-stem'] })
}
document.documentElement.dataset.comic = 'in'

// Every drawn panel is a card. Clicking one loads its phrase into the live card.
for (const panel of document.querySelectorAll<HTMLAnchorElement>('a.panel[data-scene]')) {
  panel.addEventListener('click', () => {
    window.dispatchEvent(new CustomEvent(TRY_EVENT, { detail: panel.dataset.scene }))
  })
}

// The live card. The deck opens on the three named first, then the rest of the day.
const deck = [
  ...TRY_ORDER.map((stem) => DEMO.find((d) => d.stem === stem)!),
  ...DEMO.filter((d) => !TRY_ORDER.includes(d.stem)),
]
const host = document.getElementById('try-card')
if (host) {
  createRoot(host).render(
    <StrictMode>
      <TryCard deck={deck} />
    </StrictMode>,
  )
}
