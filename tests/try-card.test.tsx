import { describe, expect, it } from 'vitest'
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { DEMO } from '../src/landing/demo'
import { TryCard } from '../src/landing/TryCard'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const jasmine = DEMO.find((d) => d.stem === 'jasmine')!
const passenger = DEMO.find((d) => d.stem === 'passenger')!
const tea = DEMO.find((d) => d.stem === 'tea')!

function render(deck = [tea, jasmine, passenger]) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  act(() => {
    createRoot(host).render(<TryCard deck={deck} />)
  })
  return host
}

function clickNamed(host: HTMLElement, name: string) {
  const btn = [...host.querySelectorAll('button')].find((b) => b.textContent === name)
  expect(btn, name).toBeTruthy()
  act(() => {
    btn!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

/** Type into a controlled input the way a browser does: set the value, then fire input. */
function type(host: HTMLElement, value: string) {
  const field = host.querySelector<HTMLInputElement>('.roman-field')!
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

describe('the live card', () => {
  it('opens on Look, with both sides of an easy card', () => {
    const host = render()
    expect(host.querySelector('.try')?.getAttribute('data-stem')).toBe('tea')
    expect(host.querySelector('.try')?.getAttribute('data-phase')).toBe('look')
    expect(host.querySelector('.prompt')?.textContent).not.toMatch(/Look/)
    expect(host.querySelector('.prompt')?.textContent).toMatch(/Hear/)
    expect(host.querySelector('.try-rom')?.textContent).toBe(tea.rom)
    expect(host.querySelector('.try-en')?.textContent).toBe(tea.en)
    expect(host.querySelector('.try-panel .balloon')?.textContent).toBe(tea.thai)
    expect(host.querySelector('.roman-field')).toBeNull()
  })

  it('hides the romanization when Continue starts the write', () => {
    const host = render()
    clickNamed(host, 'Continue')
    expect(host.querySelector('.try')?.getAttribute('data-phase')).toBe('write')
    expect(host.querySelector('.prompt')?.textContent).toContain('Write the romanization.')
    expect(host.querySelector('.try-rom')).toBeNull()
    expect(host.querySelector('.try-panel .balloon')).toBeNull()
    expect(host.querySelector('.roman-field')).not.toBeNull()
  })

  it('names the tone that slipped, in the grader\u2019s own words', () => {
    const host = render([jasmine, passenger])
    clickNamed(host, 'Continue')
    type(host, 'ao an nii')
    check(host)
    const feedback = host.querySelector('.feedback')!
    expect(feedback.className).toContain('miss')
    expect(feedback.textContent).toMatch(/Tone on .níi. is high, you wrote mid/)
  })

  it('says Right, letters the balloon, and offers the next card', () => {
    const host = render([jasmine, passenger])
    clickNamed(host, 'Continue')
    type(host, 'ao an níi')
    check(host)
    expect(host.querySelector('.feedback')?.textContent).toBe('Right.')
    expect(host.querySelector('.feedback')?.className).toContain('ok')
    expect(host.querySelector('.try-pair [lang="th-Latn"]')?.textContent).toBe(jasmine.rom)
    expect(host.querySelector('.try-pair .thai')?.textContent).toBe(jasmine.thai)
    expect(host.querySelector('.prompt')).toBeNull()
    expect(host.querySelector('.try-pair .prompt-tools')?.textContent).toMatch(/Hear/)
    expect(host.querySelector('.try-panel .balloon')?.textContent).toBe(jasmine.thai)
    const next = [...host.querySelectorAll('button')].find((b) => b.textContent === 'Next card')
    expect(next?.className).toBe('btn primary commit')

    clickNamed(host, 'Next card')
    expect(host.querySelector('.try')?.getAttribute('data-stem')).toBe('passenger')
    expect(host.querySelector('.try')?.getAttribute('data-phase')).toBe('look')
    expect(host.querySelector('.try-rom')?.textContent).toBe(passenger.rom)
    expect(host.querySelector('.feedback')).toBeNull()
  })

  it('loads a clicked panel on Look', () => {
    const host = render()
    act(() => {
      window.dispatchEvent(new CustomEvent('riankeng:try', { detail: 'passenger' }))
    })
    expect(host.querySelector('.try')?.getAttribute('data-stem')).toBe('passenger')
    expect(host.querySelector('.try')?.getAttribute('data-phase')).toBe('look')
    expect(host.querySelector('.try-rom')?.textContent).toBe(passenger.rom)
  })

  it('letters a two-line balloon as one block, the way the comic does', () => {
    const coffee = DEMO.find((d) => d.stem === 'coffee')!
    expect(coffee.balloon.lines.length).toBe(2)
    const host = render([coffee])
    const balloon = host.querySelector('.try-panel .balloon')!
    // Lines and a break straight in the balloon. A span per line lays them side by side in its flex box.
    expect(balloon.querySelectorAll('span')).toHaveLength(0)
    expect(balloon.querySelectorAll('br')).toHaveLength(1)
    expect(balloon.textContent).toBe(coffee.balloon.lines.join(''))
  })

  it('keeps the feedback line in place while writing, so a miss does not move the card', () => {
    const host = render()
    expect(host.querySelector('.feedback')).toBeNull()
    clickNamed(host, 'Continue')
    const line = host.querySelector('.feedback')
    expect(line?.textContent).toBe('')
    expect(line?.getAttribute('role')).toBe('status')
    type(host, 'abc')
    check(host)
    expect(host.querySelector('.feedback')?.textContent).toMatch(/It is/)
  })
})

