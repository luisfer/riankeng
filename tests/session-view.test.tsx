import { describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { emptyDoc, type ProgressDoc } from '../src/storage/progress-schema'
import { type LiveSession } from '../src/engine/session'
import { SessionView } from '../src/ui/Session'
import { chrome } from '../src/ui/copy'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function sitting(modality: LiveSession['queue'][number]['modality'] = 'th-en'): LiveSession {
  return {
    startedAt: 1,
    level: 0,
    track: 'voice',
    queue: [{ id: 'w:maa', modality, salt: '1' }],
    cursor: 0,
    answered: 0,
    correct: 0,
    hold: null,
  }
}

function docWith(partial: Partial<ProgressDoc['settings']> = {}): ProgressDoc {
  const doc = emptyDoc(1)
  doc.settings = { ...doc.settings, autoplay: false, ...partial }
  return doc
}

function render(session: LiveSession, doc = docWith()) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const state = { doc, session }
  const root = createRoot(host)
  const paint = () => {
    act(() => {
      root.render(
        <SessionView
          doc={state.doc}
          session={state.session}
          onDoc={(next) => {
            state.doc = next
            paint()
          }}
          onSession={(next) => {
            state.session = next
            paint()
          }}
        />,
      )
    })
  }
  paint()
  return { host, state }
}

function typeEn(host: HTMLElement, value: string) {
  const field = host.querySelector<HTMLInputElement>('.roman-field.en')!
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  act(() => {
    setter.call(field, value)
    field.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

function check(host: HTMLElement) {
  act(() => {
    host.querySelector('form.answer-form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
}

function clickNamed(host: HTMLElement, name: string) {
  const btn = [...host.querySelectorAll('button')].find((b) => b.textContent === name)
  expect(btn, name).toBeTruthy()
  act(() => {
    btn!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

describe('SessionView', () => {
  it('does not score an empty Check', () => {
    const { host, state } = render(sitting())
    check(host)
    expect(host.querySelector('.session-feedback')?.textContent).toBe(chrome.typeAnswer)
    expect([...host.querySelectorAll('button')].some((b) => b.textContent === 'Check')).toBe(true)
    expect(state.doc.items['w:maa']).toBeUndefined()
    expect(state.session.pending).toBeUndefined()
    expect(state.session.answered).toBe(0)
  })

  it('lets a missed card be checked again after Next', () => {
    const { host, state } = render(sitting())
    typeEn(host, 'nope')
    check(host)
    expect(state.session.pending?.ok).toBe(false)
    expect(state.doc.items['w:maa']?.reps).toBe(1)
    clickNamed(host, 'Next')
    expect(state.session.pending).toBeUndefined()
    expect(state.session.queue[0]?.scored).toBe(false)
    expect([...host.querySelectorAll('button')].some((b) => b.textContent === 'Check')).toBe(true)
    typeEn(host, 'come')
    check(host)
    expect(state.session.pending?.ok).toBe(true)
    expect(state.doc.items['w:maa']?.reps).toBe(2)
  })

  it('has no tone desk on a silent sitting', () => {
    const { host } = render(sitting('tone'), docWith({ silent: true }))
    expect(host.querySelector('.tone-picks')).toBeNull()
    expect(host.querySelector('.roman-field.en')).not.toBeNull()
    expect(host.querySelector('.prompt')?.textContent).toContain(chrome.writeMeaning)
  })
})
