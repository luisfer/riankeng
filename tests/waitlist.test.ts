import { Window } from 'happy-dom'
import { describe, expect, it } from 'vitest'
import { bindWaitlist } from '../src/landing/waitlist'

function form() {
  const window = new Window()
  const document = window.document as unknown as Document
  document.body.innerHTML = `<form class="waitlist" data-waitlist novalidate>
    <button class="btn commit" type="button" data-waitlist-open>Join the waitlist</button>
    <div class="waitlist-row">
      <label for="waitlist-email">Email</label>
      <input id="waitlist-email" name="email" type="email" />
      <button class="btn commit" type="submit">Join</button>
    </div>
    <p data-waitlist-note role="status"></p>
  </form>`
  const el = document.querySelector<HTMLFormElement>('form')!
  bindWaitlist(el)
  return { el, close: () => void window.happyDOM.close() }
}

function click(el: Element) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

describe('waitlist mock', () => {
  it('opens an email field, then the button says it was sent', () => {
    const { el, close } = form()
    click(el.querySelector('[data-waitlist-open]')!)
    expect(el.dataset.open).toBe('')
    const field = el.querySelector<HTMLInputElement>('input[name="email"]')!
    field.value = 'ada@example.com'
    el.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    expect(el.dataset.sent).toBe('')
    const commit = el.querySelector<HTMLButtonElement>('button[type="submit"]')!
    expect(commit.textContent).toBe('Joined.')
    expect(commit.disabled).toBe(true)
    expect(el.querySelector('[data-waitlist-note]')?.textContent).toBe(
      "Thanks for joining the waitlist! We'll send you an email when this app is fully ready for you.",
    )
    close()
  })

  it('asks for an email and does not mark it sent', () => {
    const { el, close } = form()
    click(el.querySelector('[data-waitlist-open]')!)
    el.querySelector<HTMLInputElement>('input[name="email"]')!.value = 'not-an-email'
    el.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    expect(el.dataset.sent).toBeUndefined()
    expect(el.querySelector('[data-waitlist-note]')?.textContent).toBe('Type an email.')
    expect(el.querySelector('button[type="submit"]')?.textContent).toBe('Join')
    close()
  })
})
