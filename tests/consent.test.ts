import { Window } from 'happy-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CONSENT_KEY, counting, readConsent, saveConsent } from '../src/consent'
import { mountConsent } from '../src/landing/consent-banner'

const DAY = 86_400_000

function gpc(on: boolean) {
  Object.defineProperty(navigator, 'globalPrivacyControl', { value: on, configurable: true })
}

afterEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  gpc(false)
})

describe('the counting choice', () => {
  it('starts unasked, holds a yes about 13 months and a no about 6, then asks again', () => {
    const t0 = 1_760_000_000_000
    expect(readConsent(t0)).toBe('unset')
    saveConsent(true, t0)
    expect(counting(t0 + 394 * DAY)).toBe(true)
    expect(readConsent(t0 + 396 * DAY)).toBe('unset')
    saveConsent(false, t0)
    expect(readConsent(t0 + 182 * DAY)).toBe('no')
    expect(readConsent(t0 + 184 * DAY)).toBe('unset')
  })

  it('treats Global Privacy Control as a standing no', () => {
    gpc(true)
    expect(readConsent()).toBe('no')
    expect(counting()).toBe(false)
  })

  it('clears everything kept for counting on a no, and keeps the no', () => {
    localStorage.setItem('rk-device', 'x')
    localStorage.setItem('rk-touch-first', 'x')
    sessionStorage.setItem('rk-touch', 'x')
    saveConsent(false)
    expect(localStorage.getItem('rk-device')).toBeNull()
    expect(localStorage.getItem('rk-touch-first')).toBeNull()
    expect(sessionStorage.getItem('rk-touch')).toBeNull()
    expect(JSON.parse(localStorage.getItem(CONSENT_KEY)!)).toMatchObject({ v: 1, yes: false })
  })
})

describe('the question', () => {
  function page() {
    const window = new Window()
    const document = window.document as unknown as Document
    document.body.innerHTML = '<main><button id="choices" type="button" data-consent-open>Privacy choices</button></main>'
    return { document, close: () => void window.happyDOM.close() }
  }

  it('asks once, with two answers alike, and keeps the answer', () => {
    const { document, close } = page()
    const onChoice = vi.fn()
    mountConsent(onChoice, document)
    const box = document.querySelector('.consent')!
    const [yes, no] = [...box.querySelectorAll('button')]
    expect(yes?.textContent).toBe('Allow')
    expect(no?.textContent).toBe("Don't allow")
    expect(yes?.className).toBe(no?.className)
    expect(box.querySelector('a')?.getAttribute('href')).toBe('/privacy#counting')
    // Asked by the page, the note waits and does not take the focus.
    expect(document.activeElement?.closest('.consent')).toBeNull()
    yes!.click()
    expect(document.querySelector('.consent')).toBeNull()
    expect(onChoice).toHaveBeenCalledWith(true)
    expect(readConsent()).toBe('yes')
    close()
  })

  it('does not ask a browser that already answered, or one that sends Global Privacy Control', () => {
    saveConsent(false)
    const a = page()
    mountConsent(undefined, a.document)
    expect(a.document.querySelector('.consent')).toBeNull()
    a.close()
    localStorage.clear()
    gpc(true)
    const b = page()
    mountConsent(undefined, b.document)
    expect(b.document.querySelector('.consent')).toBeNull()
    b.close()
  })

  it('asks again from Privacy choices, naming the current answer, with the focus on the first button', () => {
    saveConsent(true)
    const { document, close } = page()
    mountConsent(undefined, document)
    document.querySelector<HTMLButtonElement>('#choices')!.click()
    const box = document.querySelector('.consent')!
    expect(box.querySelector('.consent-text')?.textContent).toContain('Allowed now.')
    expect(document.activeElement?.textContent).toBe('Allow')
    ;[...box.querySelectorAll('button')][1]!.click()
    expect(readConsent()).toBe('no')
    expect(document.activeElement?.id).toBe('choices')
    close()
  })
})
