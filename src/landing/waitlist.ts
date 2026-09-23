import { landing } from './copy'
import { normalizeEmail } from '../waitlist-join'

/** The field opens, then a saved address says it was sent. */
export function bindWaitlist(form: HTMLFormElement, onOpen?: () => void): void {
  const open = form.querySelector<HTMLButtonElement>('[data-waitlist-open]')
  const field = form.querySelector<HTMLInputElement>('input[name="email"]')
  const commit = form.querySelector<HTMLButtonElement>('button[type="submit"]')
  const note = form.querySelector<HTMLElement>('[data-waitlist-note]')
  const trap = form.querySelector<HTMLInputElement>('input[name="website"]')
  let sending = false

  open?.addEventListener('click', () => {
    if (form.dataset.sent) return
    onOpen?.()
    form.dataset.open = ''
    if (note) note.textContent = ''
    field?.focus()
  })

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    if (form.dataset.sent || sending) return
    const email = normalizeEmail(field?.value ?? '')
    if (!email) {
      if (note) note.textContent = landing.waitlistNeed
      field?.focus()
      return
    }
    sending = true
    if (commit) commit.disabled = true
    void fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, website: trap?.value ?? '' }),
    })
      .then(async (res) => {
        const data = (await res.json().catch(() => null)) as { ok?: boolean } | null
        if (!res.ok || !data?.ok) {
          if (note) note.textContent = landing.waitlistFail
          if (commit) commit.disabled = false
          return
        }
        form.dataset.sent = ''
        if (note) note.textContent = landing.waitlistThanks
        if (commit) {
          commit.textContent = landing.waitlistJoined
          commit.disabled = true
        }
      })
      .catch(() => {
        if (note) note.textContent = landing.waitlistFail
        if (commit) commit.disabled = false
      })
      .finally(() => {
        sending = false
      })
  })
}
