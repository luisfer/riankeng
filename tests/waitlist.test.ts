import { Window } from 'happy-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bindWaitlist } from '../src/landing/waitlist'
import { currentRef, rememberRef } from '../src/landing/ref'
import { handleWaitlist, normalizeEmail, normalizeSource } from '../src/waitlist-join'

const thanks = 'Thanks. One email goes to this address when the course opens.'

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
    expect(JSON.parse(String(init?.body))).toEqual({ email: 'ada@example.com', website: '', source: null })
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

describe('waitlist addresses', () => {
  it('keeps real addresses, lowercased', () => {
    for (const ok of ['Ada@Example.com', 'first.last+tag@gmail.com', 'a@mail.go.th', 'a@xn--o3cw4h.xn--o3cw4h', ' ada@example.com ']) {
      expect(normalizeEmail(ok), ok).toBe(ok.trim().toLowerCase())
    }
  })

  it('refuses addresses no mail can reach', () => {
    for (const bad of ['luis@gmail', 'luis@gmail,com', 'luis@@gmail.com', 'luis@.com', 'luis@gmail.com.', 'lu\tis@gmail.com', 'not-an-email', '@gmail.com', 'luis@', `${'a'.repeat(250)}@x.com`]) {
      expect(normalizeEmail(bad), bad).toBeNull()
    }
  })

  it('does not thank a mistyped address', async () => {
    const fetchMock = vi.fn()
    const res = await handleWaitlist(new Request('http://local/api/waitlist', {
      method: 'POST',
      body: JSON.stringify({ email: 'luis@gmail,com' }),
    }), { url: 'https://example.supabase.co', key: 'service-role' }, fetchMock)
    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('waitlist source tag', () => {
  const env = { url: 'https://example.supabase.co', key: 'service-role' }
  const post = (body: unknown) => new Request('http://local/api/waitlist', { method: 'POST', body: JSON.stringify(body) })

  it('keeps short tags and drops anything else', () => {
    expect(normalizeSource('X')).toBe('x')
    expect(normalizeSource('li')).toBe('li')
    expect(normalizeSource('cafe-cursor_bkk')).toBe('cafe-cursor_bkk')
    expect(normalizeSource('a'.repeat(33))).toBeNull()
    expect(normalizeSource('<script>')).toBeNull()
    expect(normalizeSource(7)).toBeNull()
    expect(normalizeSource('')).toBeNull()
  })

  it('stores the tag with the address', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(null, { status: 201 }))
    const res = await handleWaitlist(post({ email: 'ada@example.com', source: 'li' }), env, fetchMock)
    expect(res.status).toBe(200)
    expect(JSON.parse(String(fetchMock.mock.calls[0]?.[1]?.body))).toEqual({ email: 'ada@example.com', source: 'li' })
  })

  it('still saves the address when the table has no source column yet', async () => {
    const fetchMock = vi.fn<typeof fetch>()
      .mockResolvedValueOnce(jsonResponse(400, { code: 'PGRST204' }))
      .mockResolvedValueOnce(new Response(null, { status: 201 }))
    const res = await handleWaitlist(post({ email: 'ada@example.com', source: 'x' }), env, fetchMock)
    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(JSON.parse(String(fetchMock.mock.calls[1]?.[1]?.body))).toEqual({ email: 'ada@example.com' })
  })

  it('keeps the tag for the tab, so it survives a trip through the preview', () => {
    sessionStorage.clear()
    rememberRef('?ref=LINE')
    expect(currentRef('')).toBe('line')
    expect(currentRef('?ref=fb')).toBe('fb')
    rememberRef('?ref=%3Cscript%3E')
    expect(currentRef('')).toBe('line')
    sessionStorage.clear()
    expect(currentRef('')).toBeNull()
  })
})

