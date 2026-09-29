/**
 * Soft keyboard on a phone. The layout viewport often stays tall; the visual
 * viewport shrinks. We measure that gap, mark the page, and keep the writing
 * line in the part that is still on screen.
 */

const OPEN_PX = 120

function writingFocused(): boolean {
  const el = document.activeElement
  return el instanceof HTMLInputElement && el.classList.contains('roman-field')
}

/** --keyboard-inset / --vv-height, and html[data-keyboard="open"] while typing. */
export function bindKeyboardInset(): () => void {
  const html = document.documentElement
  const sync = () => {
    const vv = window.visualViewport
    if (!vv) {
      html.style.setProperty('--keyboard-inset', '0px')
      html.style.setProperty('--vv-height', `${window.innerHeight}px`)
      delete html.dataset.keyboard
      return
    }
    const inset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop)
    html.style.setProperty('--keyboard-inset', `${Math.round(inset)}px`)
    html.style.setProperty('--vv-height', `${Math.round(vv.height)}px`)
    if (inset >= OPEN_PX && writingFocused()) html.dataset.keyboard = 'open'
    else delete html.dataset.keyboard
  }

  const onFocusIn = (e: FocusEvent) => {
    const t = e.target
    if (!(t instanceof HTMLInputElement) || !t.classList.contains('roman-field')) return
    // The keyboard opens a beat after focus on iOS; sync twice around that.
    sync()
    requestAnimationFrame(() => {
      sync()
      keepWritingVisible(t.closest('.try, .preview-stage, .session-stage') ?? document)
    })
    window.setTimeout(() => {
      sync()
      keepWritingVisible(t.closest('.try, .preview-stage, .session-stage') ?? document)
    }, 300)
  }

  const onFocusOut = () => {
    window.setTimeout(sync, 0)
  }

  sync()
  const vv = window.visualViewport
  vv?.addEventListener('resize', sync)
  vv?.addEventListener('scroll', sync)
  window.addEventListener('resize', sync)
  document.addEventListener('focusin', onFocusIn)
  document.addEventListener('focusout', onFocusOut)
  return () => {
    vv?.removeEventListener('resize', sync)
    vv?.removeEventListener('scroll', sync)
    window.removeEventListener('resize', sync)
    document.removeEventListener('focusin', onFocusIn)
    document.removeEventListener('focusout', onFocusOut)
    delete html.dataset.keyboard
    html.style.removeProperty('--keyboard-inset')
    html.style.removeProperty('--vv-height')
  }
}

/**
 * Scroll so the answer form (field, strip, Check) sits inside the visual
 * viewport, just under its top. Call after focus and when the keyboard resizes.
 */
export function keepWritingVisible(within: ParentNode = document): void {
  const form =
    within.querySelector<HTMLElement>('.answer-form:focus-within') ??
    within.querySelector<HTMLElement>('.answer-form')
  if (!form) return
  const vv = window.visualViewport
  if (!vv) {
    form.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
    return
  }
  const rect = form.getBoundingClientRect()
  const top = rect.top - vv.offsetTop
  const bottom = rect.bottom - vv.offsetTop
  const pad = 10
  if (top >= pad && bottom <= vv.height - pad) return
  // Prefer the top of the form under the sticky bar / trail, not centered —
  // centering leaves the strip under the keyboard on a short vv.
  window.scrollBy({ top: top - pad, left: 0, behavior: 'smooth' })
}

/** Exposed for tests. */
export const keyboardOpenPx = OPEN_PX
