import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { signInAccount } from '../storage/auth'
import { COMIC_SLOTS, fillClose, mountComic, pickComic, pickLayout, pickPhone, placeComic } from './comic'
import { landing } from './copy'
import { bindWaitlist } from './waitlist'
import { DEMO, QUIET, TRY_ORDER } from './demo'
import { TRY_EVENT, TryCard } from './TryCard'

// Old app URLs carried the route in the hash at /. The course lives at /learn/ now.
if (location.hash.startsWith('#/')) {
  location.replace(`/learn/${location.hash}`)
} else if (matchMedia('(display-mode: standalone)').matches) {
  // Installs from before the split start at /. They mean the course.
  location.replace('/learn/')
}

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

function openGate() {
  if (html.dataset.session === 'in') return
  html.dataset.gate = 'open'
  navSign?.setAttribute('aria-expanded', 'true')
  for (const form of document.querySelectorAll<HTMLFormElement>('form[data-waitlist]')) {
    if (!form.dataset.sent) delete form.dataset.open
  }
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
    if (!password) {
      missLine(form, landing.typePassword)
      field?.focus()
      return
    }
    try {
      if (email) {
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
        return
      }
      const res = await fetch('/api/gate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      })
      if (res.ok) return openCourse()
      missLine(form, res.status === 503 ? landing.unset : landing.wrong)
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

// The nav's Log in opens the title-panel form.
navSign?.addEventListener('click', (e) => {
  if (html.dataset.session === 'in') return
  e.preventDefault()
  openGate()
})

for (const form of document.querySelectorAll<HTMLFormElement>('form[data-waitlist]')) {
  bindWaitlist(form, () => {
    delete html.dataset.gate
    navSign?.setAttribute('aria-expanded', 'false')
  })
}

const layout = pickLayout()
mountComic(document, placeComic(pickComic(DEMO, COMIC_SLOTS)), layout, pickPhone())
fillClose(document, pickComic(QUIET, 1)[0]!)
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
