import { describe, expect, it } from 'vitest'
import { act, createElement, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { TONE_MARKS, U_BAR } from '@content/system'
import { applyStripKey, editRoman, numberKey, RomanInput, toneAt, tonedVowel } from '../src/input/RomanInput'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

describe('applyStripKey', () => {
  it('appends special vowels', () => {
    expect(applyStripKey('', 'ε')).toBe('ε')
    expect(applyStripKey('k', 'ɔ')).toBe('kɔ')
    expect(applyStripKey('s', 'ə')).toBe('sə')
    expect(applyStripKey('s', 'ʉ')).toBe('sʉ')
  })

  it('marks the first letter of the last syllable, including after a final', () => {
    expect(applyStripKey('ma', TONE_MARKS.low)).toBe('mà')
    expect(applyStripKey('mak', TONE_MARKS.low)).toBe('màk')
    expect(applyStripKey('maa', TONE_MARKS.high)).toBe('máa')
    expect(applyStripKey('kɔɔp', TONE_MARKS.low)).toBe('kɔ̀ɔp')
    expect(applyStripKey('kaao', TONE_MARKS.falling)).toBe('kâao')
    expect(applyStripKey('guai', TONE_MARKS.rising)).toBe('gǔai')
    expect(applyStripKey('nʉai', TONE_MARKS.low)).toBe('nʉ̀ai')
    expect(applyStripKey('sʉ', TONE_MARKS.high)).toBe('sʉ́')
  })

  it('replaces the tone already on that syllable, wherever it sat', () => {
    expect(applyStripKey('màk', TONE_MARKS.high)).toBe('mák')
    expect(applyStripKey('mák', TONE_MARKS.rising)).toBe('mǎk')
    expect(applyStripKey('máa', TONE_MARKS.falling)).toBe('mâa')
    expect(applyStripKey('maá', TONE_MARKS.high)).toBe('máa')
  })

  it('keeps the caret where it was in the text', () => {
    expect(toneAt('maa', 3, TONE_MARKS.high)).toEqual({ value: 'máa', caret: 3 })
    expect(toneAt('maa', 2, TONE_MARKS.low)).toEqual({ value: 'màa', caret: 2 })
    expect(toneAt('maa', 0, TONE_MARKS.low)).toEqual({ value: 'màa', caret: 0 })
    expect(toneAt('pεεng', 5, TONE_MARKS.low)).toEqual({ value: 'pὲεng', caret: 'pὲεng'.length })
    expect(toneAt('pεεng', 5, TONE_MARKS.falling)).toEqual({ value: 'pε̂εng', caret: 'pε̂εng'.length })
    expect(toneAt('kɔɔp', 4, TONE_MARKS.low)).toEqual({ value: 'kɔ̀ɔp', caret: 5 })
    expect(toneAt('kɔɔp', 2, TONE_MARKS.falling)).toEqual({ value: 'kɔ̂ɔp', caret: 3 })
  })

  it('tones the syllable at the caret, not the last one in the field', () => {
    expect(toneAt('sa-wat', 2, TONE_MARKS.low)).toEqual({ value: 'sà-wat', caret: 2 })
    expect(toneAt('sa-wat', 6, TONE_MARKS.low)).toEqual({ value: 'sa-wàt', caret: 6 })
    expect(toneAt('maɔ', 2, TONE_MARKS.low)).toEqual({ value: 'màɔ', caret: 2 })
    expect(applyStripKey('maa', 'ɔ', 2)).toBe('maɔa')
  })

  it('inserts the labelled glyph when there is no vowel', () => {
    expect(applyStripKey('', TONE_MARKS.low)).toBe('à')
    expect(applyStripKey('', TONE_MARKS.falling)).toBe('â')
    expect(applyStripKey('', TONE_MARKS.high)).toBe('á')
    expect(applyStripKey('', TONE_MARKS.rising)).toBe('ǎ')
    expect(applyStripKey('k', TONE_MARKS.low)).toBe('kà')
  })
})

describe('toneAt in a phrase', () => {
  it('tones chai in mâi chai from any caret inside it', () => {
    expect(toneAt('mâi chai', 8, TONE_MARKS.falling)).toEqual({ value: 'mâi châi', caret: 8 })
    expect(toneAt('mâi chai', 7, TONE_MARKS.falling)).toEqual({ value: 'mâi châi', caret: 7 })
    expect(toneAt('mâi chai', 6, TONE_MARKS.falling)).toEqual({ value: 'mâi châi', caret: 6 })
    expect(toneAt('mâi chai', 4, TONE_MARKS.falling)).toEqual({ value: 'mâi châi', caret: 4 })
    expect(toneAt('mai chai', 3, TONE_MARKS.falling)).toEqual({ value: 'mâi chai', caret: 3 })
  })

  it('keeps each tone on its own side of a space or a hyphen', () => {
    expect(toneAt('mâi chai', 3, TONE_MARKS.high)).toEqual({ value: 'mái chai', caret: 3 })
    expect(toneAt('mâi ch', 6, TONE_MARKS.falling)).toEqual({ value: 'mâi châ', caret: 7 })
    expect(toneAt('mâi ch', 6, TONE_MARKS.high)).toEqual({ value: 'mâi chá', caret: 7 })
    expect(toneAt('sa-w', 4, TONE_MARKS.low)).toEqual({ value: 'sa-wà', caret: 5 })
    expect(toneAt('bprà-têet ', 10, TONE_MARKS.low)).toEqual({ value: 'bprà-têet à', caret: 11 })
  })
})

describe('tonedVowel', () => {
  it('is the vowel at the caret as the tone key leaves it', () => {
    expect(tonedVowel('mâi chai', 8, TONE_MARKS.low)).toBe('ài')
    expect(tonedVowel('mâi chai', 8, TONE_MARKS.falling)).toBe('âi')
    expect(tonedVowel('ma', 2, TONE_MARKS.rising)).toBe('ǎ')
    expect(tonedVowel('sà-wàt-dii', 10, TONE_MARKS.falling)).toBe('îi')
    expect(tonedVowel('kɔɔ', 3, TONE_MARKS.rising)).toBe(`\u0254${TONE_MARKS.rising}\u0254`)
    expect(tonedVowel('mâi ch', 6, TONE_MARKS.high)).toBe('á')
  })
})

describe('numberKey', () => {
  it('maps 1 to 4 to the tones and 5 to 8 to ε ɔ ə ʉ', () => {
    expect(numberKey('1', null)).toEqual({ kind: 'tone', mark: TONE_MARKS.low })
    expect(numberKey('2', null)).toEqual({ kind: 'tone', mark: TONE_MARKS.falling })
    expect(numberKey('3', null)).toEqual({ kind: 'tone', mark: TONE_MARKS.high })
    expect(numberKey('4', null)).toEqual({ kind: 'tone', mark: TONE_MARKS.rising })
    expect(numberKey('5', null)).toEqual({ kind: 'letter', letter: '\u03B5' })
    expect(numberKey('6', null)).toEqual({ kind: 'letter', letter: '\u0254' })
    expect(numberKey('7', null)).toEqual({ kind: 'letter', letter: '\u0259' })
    expect(numberKey('8', null)).toEqual({ kind: 'letter', letter: U_BAR })
  })

  it('turns the vowel just typed into its own letter on the same number', () => {
    expect(numberKey('5', 'e')).toEqual({ kind: 'variant', letter: '\u03B5' })
    expect(numberKey('7', 'e')).toEqual({ kind: 'variant', letter: '\u0259' })
    expect(numberKey('6', 'o')).toEqual({ kind: 'variant', letter: '\u0254' })
    expect(numberKey('8', 'u')).toEqual({ kind: 'variant', letter: U_BAR })
    expect(numberKey('6', 'e')).toEqual({ kind: 'letter', letter: '\u0254' })
    expect(numberKey('5', 'a')).toEqual({ kind: 'letter', letter: '\u03B5' })
    expect(numberKey('2', 'i')).toEqual({ kind: 'tone', mark: TONE_MARKS.falling })
  })

  it('leaves every other key to the field', () => {
    for (const key of ['0', '9', '22', 'a', ' ', 'Enter', 'Backspace']) expect(numberKey(key, null)).toBeNull()
  })
})

describe('editRoman', () => {
  it('writes a letter over the selection, and tones from its start', () => {
    expect(editRoman('pen', 1, '\u03B5', 2)).toEqual({ value: 'p\u03B5n', caret: 2 })
    expect(editRoman('pen', 1, TONE_MARKS.low, 2)).toEqual({ value: 'pèn', caret: 1 })
  })
})

const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!

function mount() {
  const host = document.createElement('div')
  document.body.appendChild(host)
  function Field() {
    const [value, setV] = useState('')
    return createElement(RomanInput, { value, onChange: setV, onSubmit: () => undefined })
  }
  act(() => {
    createRoot(host).render(createElement(Field))
  })
  const field = host.querySelector<HTMLInputElement>('.roman-field')!
  field.focus()
  return { host, field }
}

/** A key the way a browser sends it: keydown, then the character at the caret unless the field took the key. */
function press(field: HTMLInputElement, key: string, init: KeyboardEventInit = {}): KeyboardEvent {
  const down = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init })
  act(() => {
    field.dispatchEvent(down)
    if (down.defaultPrevented || key.length !== 1 || init.metaKey || init.ctrlKey) return
    const at = field.selectionStart ?? field.value.length
    setValue.call(field, field.value.slice(0, at) + key + field.value.slice(field.selectionEnd ?? at))
    field.setSelectionRange(at + 1, at + 1)
    field.dispatchEvent(new Event('input', { bubbles: true }))
  })
  return down
}

function typeKeys(field: HTMLInputElement, text: string) {
  for (const ch of text) press(field, ch)
}

/** Put the caret in the field with the pointer. */
function clickField(field: HTMLInputElement, at: number) {
  act(() => {
    field.dispatchEvent(new Event('pointerdown', { bubbles: true }))
    field.setSelectionRange(at, at)
  })
}

function click(el: Element) {
  act(() => {
    el.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }))
    el.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }))
  })
}

const texts = (host: HTMLElement, selector: string) => [...host.querySelectorAll(selector)].map((b) => b.textContent)

const tones = (host: HTMLElement) => texts(host, '.strip-k.tone')
const toneKey = (host: HTMLElement, n: number) => host.querySelector(`.strip-k[aria-keyshortcuts="${n}"]`)!

describe('RomanInput', () => {
  it('keeps one numbered strip in view, with no popover over it', () => {
    const { host, field } = mount()
    expect(texts(host, '.strip-k')).toEqual(['5ε', '6ɔ', '7ə', '8ʉ', '1à', '2â', '3á', '4ǎ'])
    expect([...host.querySelectorAll('.strip-k')].map((b) => b.getAttribute('aria-keyshortcuts'))).toEqual([
      '5', '6', '7', '8', '1', '2', '3', '4',
    ])
    expect(host.querySelectorAll('.strip-k .pop-k')).toHaveLength(8)
    typeKeys(field, 'mai2 chai')
    expect(host.querySelector('.popover')).toBeNull()
    expect(host.querySelectorAll('.strip-k')).toHaveLength(8)
  })

  it('labels the tone keys with the syllable at the caret, so chai reads âi on 2', () => {
    const { host, field } = mount()
    typeKeys(field, 'mai2 chai')
    expect(tones(host)).toEqual(['1ài', '2âi', '3ái', '4ǎi'])
    typeKeys(field, ' k')
    expect(tones(host)).toEqual(['1à', '2â', '3á', '4ǎ'])
  })

  it('writes mâi châi with 2 on each syllable, the caret at the end', () => {
    const { field } = mount()
    typeKeys(field, 'mai2 chai')
    press(field, '2')
    expect(field.value).toBe('mâi châi')
    expect(field.selectionStart).toBe(8)
  })

  it('writes mâi châi from the strip without closing anything first', () => {
    const { host, field } = mount()
    typeKeys(field, 'mai2 chai')
    click(toneKey(host, 2))
    expect([field.value, field.selectionStart]).toEqual(['mâi châi', 8])
  })

  it('tones chai with the caret between a and i, and keeps it there', () => {
    const { host, field } = mount()
    typeKeys(field, 'mai2 chai')
    clickField(field, 7)
    click(toneKey(host, 2))
    expect([field.value, field.selectionStart]).toEqual(['mâi châi', 7])
    clickField(field, 7)
    press(field, '3')
    expect([field.value, field.selectionStart]).toEqual(['mâi chái', 7])
  })

  it('writes â after ch, on the new syllable', () => {
    const { host, field } = mount()
    typeKeys(field, 'mai2 ch')
    click(toneKey(host, 2))
    expect([field.value, field.selectionStart]).toEqual(['mâi châ', 7])
    press(field, '3')
    expect([field.value, field.selectionStart]).toEqual(['mâi chá', 7])
  })

  it('writes ε ɔ ə ʉ on 5 to 8', () => {
    const { field } = mount()
    typeKeys(field, 'k')
    for (const key of ['5', '6', '7', '8']) press(field, key)
    expect([field.value, field.selectionStart]).toEqual(['kεɔəʉ', 5])
  })

  it('writes a long vowel with two clicks on the same key', () => {
    const { host, field } = mount()
    typeKeys(field, 'p')
    click(toneKey(host, 5))
    click(toneKey(host, 5))
    typeKeys(field, 'ng')
    expect([field.value, field.selectionStart]).toEqual(['pεεng', 5])
    click(toneKey(host, 1))
    expect([field.value, field.selectionStart]).toEqual(['pὲεng', 'pὲεng'.length])
  })

  it('swaps a typed vowel for its own letter, and marks the keys that swap it', () => {
    const { host, field } = mount()
    typeKeys(field, 'pe')
    expect(texts(host, '.strip-k.swap')).toEqual(['5ε', '7ə'])
    press(field, '5')
    expect([field.value, field.selectionStart]).toEqual(['pε', 2])
    expect(host.querySelector('.strip-k.swap')).toBeNull()
    press(field, '2')
    expect(field.value).toBe(`p\u03B5${TONE_MARKS.falling}`)

    const o = mount()
    typeKeys(o.field, 'ko')
    expect(texts(o.host, '.strip-k.swap')).toEqual(['6ɔ'])
    click(toneKey(o.host, 6))
    expect(o.field.value).toBe('kɔ')

    const u = mount()
    typeKeys(u.field, 'su')
    expect(texts(u.host, '.strip-k.swap')).toEqual(['8ʉ'])
    press(u.field, '8')
    expect(u.field.value).toBe('sʉ')
  })

  it('writes any other vowel number at the caret after a typed vowel', () => {
    const { field } = mount()
    typeKeys(field, 'pe')
    press(field, '6')
    expect([field.value, field.selectionStart]).toEqual(['peɔ', 3])
    press(field, '7')
    expect(field.value).toBe('peɔə')
  })

  it('fixes a wrong tone from the strip after the field lost focus', () => {
    const { host, field } = mount()
    typeKeys(field, 'sa1-wa3t-dii')
    expect(field.value).toBe('sà-wát-dii')
    clickField(field, 5)
    act(() => field.blur())
    expect(document.activeElement).not.toBe(field)
    click(toneKey(host, 1))
    expect([field.value, field.selectionStart]).toEqual(['sà-wàt-dii', 5])
    expect(document.activeElement).toBe(field)
  })

  it('takes focus back when focusToken changes, and leaves it alone on the first render', () => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    const other = document.createElement('button')
    document.body.appendChild(other)
    let miss: () => void = () => undefined
    function Field() {
      const [value, setV] = useState('')
      const [token, setToken] = useState(0)
      miss = () => setToken((n) => n + 1)
      return createElement(RomanInput, { value, onChange: setV, onSubmit: () => undefined, focusToken: token })
    }
    other.focus()
    act(() => {
      createRoot(host).render(createElement(Field))
    })
    const field = host.querySelector<HTMLInputElement>('.roman-field')!
    expect(document.activeElement).toBe(other)
    act(() => miss())
    expect(document.activeElement).toBe(field)
  })

  it('leaves 9, modified numbers, and composition to the field', () => {
    const { field } = mount()
    expect(press(field, '9').defaultPrevented).toBe(false)
    expect(press(field, '2', { metaKey: true }).defaultPrevented).toBe(false)
    expect(press(field, '2', { ctrlKey: true }).defaultPrevented).toBe(false)
    expect(press(field, '2', { altKey: true }).defaultPrevented).toBe(false)
    expect(press(field, '5', { isComposing: true }).defaultPrevented).toBe(false)
  })
})
