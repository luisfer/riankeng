import { landing } from './copy'

/** Mock join. The field opens, then the button says it was sent. Nothing is stored. */
export function bindWaitlist(form: HTMLFormElement, onOpen?: () => void): void {
  const open = form.querySelector<HTMLButtonElement>('[data-waitlist-open]')
  const field = form.querySelector<HTMLInputElement>('input[name="email"]')
  const commit = form.querySelector<HTMLButtonElement>('button[type="submit"]')
  const note = form.querySelector<HTMLElement>('[data-waitlist-note]')

  open?.addEventListener('click', () => {
    if (form.dataset.sent) return
    onOpen?.()
    form.dataset.open = ''
    if (note) note.textContent = ''
    field?.focus()
  })

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    if (form.dataset.sent) return
    const email = field?.value.trim() ?? ''
    const at = email.indexOf('@')
    if (at <= 0 || at === email.length - 1 || email.includes(' ')) {
      if (note) note.textContent = landing.waitlistNeed
      field?.focus()
      return
    }
    form.dataset.sent = ''
    if (note) note.textContent = landing.waitlistThanks
    if (commit) {
      commit.textContent = landing.waitlistJoined
      commit.disabled = true
    }
  })
}
