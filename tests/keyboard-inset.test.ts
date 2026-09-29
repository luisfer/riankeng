import { afterEach, describe, expect, it, vi } from 'vitest'
import { bindKeyboardInset, keepWritingVisible, keyboardOpenPx } from '../src/ui/keyboard-inset'

describe('keyboard inset', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    document.documentElement.removeAttribute('data-keyboard')
    document.documentElement.style.removeProperty('--keyboard-inset')
    document.documentElement.style.removeProperty('--vv-height')
    vi.unstubAllGlobals()
  })

  it('marks the page open when the visual viewport shrinks on a roman field', () => {
    document.body.innerHTML = `<form class="answer-form"><input class="roman-field" /></form>`
    const field = document.querySelector<HTMLInputElement>('.roman-field')!
    const listeners = new Map<string, Set<() => void>>()
    const vv = {
      height: 320,
      offsetTop: 0,
      addEventListener: (type: string, fn: () => void) => {
        const set = listeners.get(type) ?? new Set()
        set.add(fn)
        listeners.set(type, set)
      },
      removeEventListener: (type: string, fn: () => void) => listeners.get(type)?.delete(fn),
    }
    vi.stubGlobal('visualViewport', vv)
    vi.stubGlobal('innerHeight', 844)

    const stop = bindKeyboardInset()
    field.focus()
    document.dispatchEvent(new FocusEvent('focusin', { bubbles: true }))
    listeners.get('resize')?.forEach((fn) => fn())

    expect(document.documentElement.dataset.keyboard).toBe('open')
    expect(document.documentElement.style.getPropertyValue('--keyboard-inset')).toBe(
      `${844 - 320}px`,
    )
    expect(844 - 320).toBeGreaterThanOrEqual(keyboardOpenPx)

    field.blur()
    document.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
    // focusout sync is deferred; run it.
    vi.stubGlobal('innerHeight', 844)
    Object.assign(vv, { height: 844 })
    listeners.get('resize')?.forEach((fn) => fn())
    expect(document.documentElement.dataset.keyboard).toBeUndefined()
    stop()
  })

  it('scrolls the answer form up when it sits under the keyboard', () => {
    document.body.innerHTML = `<div class="preview-stage"><form class="answer-form" style="height: 200px"></form></div>`
    const form = document.querySelector<HTMLElement>('.answer-form')!
    form.getBoundingClientRect = () =>
      ({
        top: 500,
        bottom: 700,
        left: 0,
        right: 100,
        width: 100,
        height: 200,
        x: 0,
        y: 500,
        toJSON: () => ({}),
      }) as DOMRect

    const scrollBy = vi.fn()
    vi.stubGlobal('scrollBy', scrollBy)
    vi.stubGlobal('visualViewport', { height: 360, offsetTop: 0 })

    keepWritingVisible(document)
    expect(scrollBy).toHaveBeenCalled()
    const arg = scrollBy.mock.calls[0]?.[0] as { top: number }
    // 500 - 10 pad = 490 px up into the visual viewport.
    expect(arg.top).toBe(490)
  })
})
