import { describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { emptyDoc } from '../src/storage/progress-schema'
import { Account, ERASE_CONFIRM, eraseConfirm, syncLine, type AccountSync } from '../src/ui/Account'
import { chrome } from '../src/ui/copy'

const idle: AccountSync = { state: 'idle', savedAt: 0, unsaved: true, sessionEnded: false, keptApart: false }

function mount(onDoc = vi.fn(), onReset = vi.fn(), sync: AccountSync = idle) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const root: Root = createRoot(host)
  const doc = emptyDoc(Date.UTC(2026, 8, 1))
  act(() => {
    root.render(
      <Account
        doc={doc}
        voice={[]}
        script={[]}
        onDoc={onDoc}
        onReset={onReset}
        account={null}
        onAccount={() => undefined}
        sync={sync}
        recovery={false}
        onRecoveryDone={() => undefined}
      />,
    )
  })
  return {
    host,
    onDoc,
    onReset,
    unmount() {
      act(() => root.unmount())
      host.remove()
    },
  }
}

describe('Account destructive steps', () => {
  it('asks before erase, and cancelling does not reset', () => {
    const view = mount()
    const button = [...view.host.querySelectorAll('button')].find((el) => el.textContent === 'Erase this device')
    const dialog = view.host.querySelector('dialog')
    expect(dialog?.open).toBe(false)
    act(() => button?.click())
    expect(dialog?.open).toBe(true)
    // Signed out, nothing else holds these cards, and the dialog does not pretend otherwise.
    expect(dialog?.textContent).toContain(chrome.eraseSignedOut)
    expect(dialog?.textContent).not.toContain('The account keeps its copy.')
    expect(view.onReset).not.toHaveBeenCalled()
    const keep = [...view.host.querySelectorAll('button')].find((el) => el.textContent === 'Keep the cards')
    act(() => keep?.click())
    expect(dialog?.open).toBe(false)
    expect(view.onReset).not.toHaveBeenCalled()
    act(() => button?.click())
    const erase = [...view.host.querySelectorAll('button')].find((el) => el.textContent === 'Erase')
    act(() => erase?.click())
    expect(view.onReset).toHaveBeenCalledOnce()
    view.unmount()
  })
})

describe('Account and the account copy', () => {
  it('promises the account keeps a copy only once it holds every card', () => {
    expect(eraseConfirm(true, true)).toBe(ERASE_CONFIRM)
    expect(eraseConfirm(true, false)).toBe(chrome.eraseUnsaved)
    expect(eraseConfirm(false, true)).toBe(chrome.eraseSignedOut)
  })

  it('says when the account last held everything, and when it does not', () => {
    const now = Date.UTC(2026, 8, 26, 12)
    expect(syncLine({ ...idle, savedAt: now - 10_000, unsaved: false, state: 'saved' }, now)).toBe('Saved to the account just now.')
    expect(syncLine({ ...idle, savedAt: now - 3 * 3_600_000, unsaved: false, state: 'saved' }, now)).toBe('Saved to the account 3 hours ago.')
    expect(syncLine({ ...idle, savedAt: now - 10_000, unsaved: true, state: 'saved' }, now)).toBe(chrome.notSaved)
    expect(syncLine({ ...idle, savedAt: now - 10_000, unsaved: false, state: 'failed' }, now)).toBe(chrome.notSaved)
  })

  it('tells a learner whose session ended how to start saving again', () => {
    const view = mount(vi.fn(), vi.fn(), { ...idle, sessionEnded: true })
    expect(view.host.textContent).toContain(chrome.sessionEnded)
    view.unmount()
  })
})
