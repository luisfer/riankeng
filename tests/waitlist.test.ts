import { Window } from 'happy-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bindWaitlist } from '../src/landing/waitlist'
import { handleWaitlist } from '../src/waitlist-join'

const thanks = "Thanks for joining the waitlist! We'll send you an email when this app is fully ready for you."

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
    <input name="website" type="text" />
  </form>`
  const el = document.querySelector<HTMLFormElement>('form')!
  bindWaitlist(el)
  return { el, close: () => void window.happyDOM.close() }
}

function click(el: Element) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

function submit(el: HTMLFormElement) {
  el.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('waitlist form', () => {
  it('opens an email field, then a saved address says it was sent', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(200, { ok: true }))
    vi.stubGlobal('fetch', fetchMock)
    const { el, close } = form()
    click(el.querySelector('[data-waitlist-open]')!)
    expect(el.dataset.open).toBe('')
    const field = el.querySelector<HTMLInputElement>('input[name="email"]')!
    field.value = 'Ada@Example.com'
    submit(el)
    await vi.waitFor(() => expect(el.dataset.sent).toBe(''))
    const commit = el.querySelector<HTMLButtonElement>('button[type="submit"]')!
    expect(commit.textContent).toBe('Joined.')
    expect(commit.disabled).toBe(true)
    expect(el.querySelector('[data-waitlist-note]')?.textContent).toBe(thanks)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [, init] = fetchMock.mock.calls[0] ?? []
    expect(JSON.parse(String(init?.body))).toEqual({ email: 'ada@example.com', website: '' })
    close()
  })

  it('asks for an email and does not mark it sent', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const { el, close } = form()
    click(el.querySelector('[data-waitlist-open]')!)
    el.querySelector<HTMLInputElement>('input[name="email"]')!.value = 'not-an-email'
    submit(el)
    expect(el.dataset.sent).toBeUndefined()
    expect(el.querySelector('[data-waitlist-note]')?.textContent).toBe('Type an email.')
    expect(el.querySelector('button[type="submit"]')?.textContent).toBe('Join')
    expect(fetchMock).not.toHaveBeenCalled()
    close()
  })

  it('does not say joined when the save fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(502, { ok: false, error: 'save' })))
    const { el, close } = form()
    click(el.querySelector('[data-waitlist-open]')!)
    el.querySelector<HTMLInputElement>('input[name="email"]')!.value = 'ada@example.com'
    submit(el)
    await vi.waitFor(() => expect(el.querySelector('[data-waitlist-note]')?.textContent).toBe('Could not save this.'))
    expect(el.dataset.sent).toBeUndefined()
    const commit = el.querySelector<HTMLButtonElement>('button[type="submit"]')!
    expect(commit.textContent).toBe('Join')
    expect(commit.disabled).toBe(false)
    close()
  })
})

describe('waitlist insert', () => {
  const env = { url: 'https://example.supabase.co', key: 'service-role' }

  it('treats a duplicate address as saved', async () => {
    const fetchMock = vi.fn(async () => jsonResponse(409, { code: '23505' }))
    const res = await handleWaitlist(new Request('http://local/api/waitlist', {
      method: 'POST',
      body: JSON.stringify({ email: 'Ada@Example.com' }),
    }), env, fetchMock)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('does not store a filled honeypot', async () => {
    const fetchMock = vi.fn()
    const res = await handleWaitlist(new Request('http://local/api/waitlist', {
      method: 'POST',
      body: JSON.stringify({ email: 'ada@example.com', website: 'https://spam.test' }),
    }), env, fetchMock)
    expect(res.status).toBe(200)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports a failed save without calling the list when the key is missing', async () => {
    const fetchMock = vi.fn()
    const res = await handleWaitlist(new Request('http://local/api/waitlist', {
      method: 'POST',
      body: JSON.stringify({ email: 'ada@example.com' }),
    }), { url: '', key: '' }, fetchMock)
    expect(res.status).toBe(502)
    expect(await res.json()).toEqual({ ok: false, error: 'save' })
    expect(fetchMock).not.toHaveBeenCalled()
  })
})
