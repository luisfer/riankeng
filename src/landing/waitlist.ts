import { landing } from './copy'
import { currentRef } from './ref'
import { normalizeEmail } from '../waitlist-join'

/** The field opens, then a saved address says it was sent. */
export function bindWaitlist(form: HTMLFormElement, onOpen?: () => void): void {
  const open = form.querySelector<HTMLButtonElement>('[data-waitlist-open]')
  const field = form.querySelector<HTMLInputElement>('input[name="email"]')
  const commit = form.querySelector<HTMLButtonElement>('button[type="submit"]')
  const note = form.querySelector<HTMLElement>('[data-waitlist-note]')
  const trap = form.querySelector<HTMLInputElement>('input[name="website"]')
  let sending = false

  // The note is the field's description, so a screen reader hears a miss with the field.
  if (field && note) {
    note.id ||= `${field.id || 'waitlist-email'}-note`
    field.setAttribute('aria-describedby', note.id)
  }

  const say = (text: string, miss: boolean) => {
    if (note) note.textContent = text
    if (miss) field?.setAttribute('aria-invalid', 'true')
    else field?.removeAttribute('aria-invalid')
  }

  field?.addEventListener('input', () => {
    if (field.hasAttribute('aria-invalid')) say('', false)
  })

  open?.addEventListener('click', () => {
    if (form.dataset.sent) return
    onOpen?.()
    form.dataset.open = ''
    say('', false)
    field?.focus()
  })

  form.addEventListener('submit', (e) => {
    e.preventDefault()
    if (form.dataset.sent || sending) return
    const typed = field?.value.trim() ?? ''
    const email = normalizeEmail(typed)
    if (!email) {
      say(typed ? landing.waitlistCheck : landing.waitlistNeed, true)
      field?.focus()
      return
    }
    sending = true
    if (commit) commit.disabled = true
    const fail = (text: string) => {
      say(text, false)
      if (commit) commit.disabled = false
    }
    void fetch('/api/waitlist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, website: trap?.value ?? '', source: currentRef() }),
    })
      .then(async (res) => {
        // One network, many sign-ups: a café's Wi-Fi reaches the limit first. The address stays typed.
        if (res.status === 429) return fail(landing.waitlistBusy)
        const data = (await res.json().catch(() => null)) as { ok?: boolean } | null
        if (!res.ok || !data?.ok) return fail(landing.waitlistFail)
        form.dataset.sent = ''
        say(landing.waitlistThanks, false)
        if (commit) {
          commit.textContent = landing.waitlistJoined
          commit.disabled = true
        }
        // The field is gone now. Focus moves to the thanks, not to the top of the page.
        if (note) {
          note.tabIndex = -1
          note.focus()
        }
      })
      .catch(() => fail(landing.waitlistFail))
      .finally(() => {
        sending = false
      })
  })
}

/**
 * Arriving at /#close, as the preview's last Join the waitlist does, opens the form at the close
 * and puts the caret in it, so the visitor who just finished the words is one step from joining.
 */
export function openWaitlistAt(hash: string, root: ParentNode = document): boolean {
  if (hash !== '#close') return false
  const opener = root.querySelector<HTMLButtonElement>('#close form[data-waitlist] [data-waitlist-open]')
  if (!opener) return false
  opener.click()
  return true
}
