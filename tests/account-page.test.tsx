import { describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { emptyDoc } from '../src/storage/progress-schema'
import { Account, ERASE_CONFIRM } from '../src/ui/Account'

function mount(onDoc = vi.fn(), onReset = vi.fn()) {
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
    expect(dialog?.textContent).toContain(ERASE_CONFIRM)
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
