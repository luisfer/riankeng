import { Window } from 'happy-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { bindWaitlist, openWaitlistAt } from '../src/landing/waitlist'
import { currentRef, rememberRef } from '../src/landing/ref'
import { handleWaitlist, insertWaitlistEmail, normalizeEmail, normalizeSource } from '../src/waitlist-join'

const thanks = 'Thanks. One email goes to this address when the course opens.'
const JSON_HEADERS = { 'Content-Type': 'application/json', 'Sec-Fetch-Site': 'same-origin' }

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
    const field = el.querySelector<HTMLInputElement>('input[name="email"]')!
    submit(el)
    expect(el.querySelector('[data-waitlist-note]')?.textContent).toBe('Type an email.')
    field.value = 'luis@gmail,com'
    submit(el)
    expect(el.dataset.sent).toBeUndefined()
    expect(el.querySelector('[data-waitlist-note]')?.textContent).toBe('Check the address, like name@gmail.com.')
    expect(field.getAttribute('aria-invalid')).toBe('true')
    expect(field.getAttribute('aria-describedby')).toBe(el.querySelector('[data-waitlist-note]')?.id)
    field.dispatchEvent(new Event('input', { bubbles: true }))
    expect(field.hasAttribute('aria-invalid')).toBe(false)
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
      headers: JSON_HEADERS,
      body: JSON.stringify({ email: 'Ada@Example.com' }),
    }), env, fetchMock)
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('does not store a filled honeypot', async () => {
    const fetchMock = vi.fn()
    const res = await handleWaitlist(new Request('http://local/api/waitlist', {
      method: 'POST',
      headers: JSON_HEADERS,
      body: JSON.stringify({ email: 'ada@example.com', website: 'https://spam.test' }),
    }), env, fetchMock)
    expect(res.status).toBe(200)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('reports a failed save without calling the list when the key is missing', async () => {
    const fetchMock = vi.fn()
    const res = await handleWaitlist(new Request('http://local/api/waitlist', {
      method: 'POST',
      headers: JSON_HEADERS,
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
      headers: JSON_HEADERS,
      body: JSON.stringify({ email: 'luis@gmail,com' }),
    }), { url: 'https://example.supabase.co', key: 'service-role' }, fetchMock)
    expect(res.status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })
})

describe('waitlist source tag', () => {
  const env = { url: 'https://example.supabase.co', key: 'service-role' }
  const post = (body: unknown) => new Request('http://local/api/waitlist', { method: 'POST', headers: JSON_HEADERS, body: JSON.stringify(body) })

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
    localStorage.clear()
    rememberRef('?ref=LINE')
    expect(currentRef('')).toBe('line')
    expect(currentRef('?ref=fb')).toBe('fb')
    rememberRef('?ref=%3Cscript%3E')
    expect(currentRef('')).toBe('line')
    sessionStorage.clear()
    localStorage.clear()
    expect(currentRef('')).toBeNull()
  })
})


describe('waitlist form, past a plain save', () => {
  it('names a busy network and keeps the address typed', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('Too Many Requests', { status: 429 })))
    const { el, close } = form()
    click(el.querySelector('[data-waitlist-open]')!)
    const field = el.querySelector<HTMLInputElement>('input[name="email"]')!
    field.value = 'ada@example.com'
    submit(el)
    await vi.waitFor(() =>
      expect(el.querySelector('[data-waitlist-note]')?.textContent).toBe('Too many sign-ups from this network. Try again in a minute.'),
    )
    expect(field.value).toBe('ada@example.com')
    expect(el.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false)
    expect(el.dataset.sent).toBeUndefined()
    close()
  })

  it('moves focus to the thanks once the field is gone', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse(200, { ok: true })))
    const { el, close } = form()
    click(el.querySelector('[data-waitlist-open]')!)
    el.querySelector<HTMLInputElement>('input[name="email"]')!.value = 'ada@example.com'
    submit(el)
    await vi.waitFor(() => expect(el.dataset.sent).toBe(''))
    expect(el.ownerDocument.activeElement).toBe(el.querySelector('[data-waitlist-note]'))
    close()
  })

  it('opens the form at the close from /#close, and only that one', () => {
    const window = new Window()
    const document = window.document as unknown as Document
    const markup = `<form data-waitlist><button type="button" data-waitlist-open>Join</button>
      <input id="f" name="email" /><button type="submit">Join</button><p data-waitlist-note role="status"></p></form>`
    document.body.innerHTML = `<section id="title">${markup}</section><section id="close">${markup.replace('id="f"', 'id="g"')}</section>`
    const [title, end] = [...document.querySelectorAll<HTMLFormElement>('form')]
    for (const f of [title!, end!]) bindWaitlist(f)
    expect(openWaitlistAt('#gate', document)).toBe(false)
    expect(end!.dataset.open).toBeUndefined()
    expect(openWaitlistAt('#close', document)).toBe(true)
    expect(end!.dataset.open).toBe('')
    expect(title!.dataset.open).toBeUndefined()
    expect(document.activeElement?.id).toBe('g')
    void window.happyDOM.close()
  })
})

describe('waitlist endpoint, refusing other sites', () => {
  const env = { url: 'https://example.supabase.co', key: 'service-role' }
  const body = JSON.stringify({ email: 'ada@example.com' })

  it('refuses a body that is not JSON, as a no-cors post from another page would send', async () => {
    const fetchMock = vi.fn()
    const res = await handleWaitlist(
      new Request('http://local/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body }),
      env,
      fetchMock,
    )
    expect(res.status).toBe(415)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('refuses a post another site sent, by Sec-Fetch-Site or else by Origin', async () => {
    const fetchMock = vi.fn(async () => new Response(null, { status: 201 }))
    // happy-dom's Request drops Origin and Sec-Fetch-Site, as a browser page must. On the server they arrive.
    const send = (headers: Record<string, string>) => {
      const all = new Map(Object.entries({ 'content-type': 'application/json', ...headers }).map(([k, v]) => [k.toLowerCase(), v]))
      const request = { url: 'http://local/api/waitlist', headers: { get: (k: string) => all.get(k.toLowerCase()) ?? null }, json: async () => JSON.parse(body) }
      return handleWaitlist(request as unknown as Request, env, fetchMock)
    }
    expect((await send({ 'Sec-Fetch-Site': 'cross-site' })).status).toBe(403)
    expect((await send({ Origin: 'https://elsewhere.test' })).status).toBe(403)
    expect((await send({ Origin: 'null' })).status).toBe(403)
    expect(fetchMock).not.toHaveBeenCalled()
    expect((await send({ Origin: 'http://local' })).status).toBe(200)
    expect((await send({ Origin: 'https://riangeng.com', 'X-Forwarded-Host': 'riangeng.com' })).status).toBe(200)
    expect((await send({ 'Sec-Fetch-Site': 'same-origin' })).status).toBe(200)
  })
})

describe('waitlist insert, leaving a trace', () => {
  it('names the email index as the conflict and trims the settings', async () => {
    const fetchMock = vi.fn<typeof fetch>(async () => new Response(null, { status: 201 }))
    const saved = await insertWaitlistEmail('ada@example.com', { url: ' https://example.supabase.co/ \n', key: ' service-role\n' }, fetchMock)
    expect(saved).toBe('saved')
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe('https://example.supabase.co/rest/v1/waitlist?on_conflict=email')
    expect((fetchMock.mock.calls[0]?.[1]?.headers as Record<string, string>).apikey).toBe('service-role')
  })

  it('says why a save failed in the log, never the address, and keeps the tag unless the column is missing', async () => {
    const errors = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const fetchMock = vi.fn<typeof fetch>(async () => jsonResponse(400, { code: '23514' }))
    const saved = await insertWaitlistEmail('ada@example.com', { url: 'https://example.supabase.co', key: 'k' }, fetchMock, 'li')
    expect(saved).toBe('save')
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(errors).toHaveBeenCalled()
    for (const call of errors.mock.calls) expect(call.join(' ')).not.toContain('ada@example.com')
    expect(errors.mock.calls.flat()).toContain(400)
    expect(errors.mock.calls.flat()).toContain('23514')
    errors.mockRestore()
  })
})

describe('waitlist source tag, across tabs', () => {
  it('keeps the first tag this browser arrived with for 30 days', () => {
    sessionStorage.clear()
    localStorage.clear()
    const t0 = 1_700_000_000_000
    rememberRef('?ref=line', t0)
    rememberRef('?ref=fb', t0 + 1000)
    sessionStorage.clear()
    expect(currentRef('', t0 + 2000)).toBe('line')
    expect(currentRef('?ref=x', t0 + 2000)).toBe('x')
    expect(currentRef('', t0 + 31 * 86_400_000)).toBeNull()
    localStorage.clear()
  })
})
