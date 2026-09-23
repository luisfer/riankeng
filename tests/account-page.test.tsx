import { describe, expect, it, vi } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { applyAttempt, newItemProgress } from '../src/engine/srs'
import { exportJson } from '../src/storage/export'
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
        mirror={{ state: 'off', writtenAt: 0, onStart() {}, onStop() {}, onAuthorise() {} }}
        onGlyphs={() => undefined}
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
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    const button = [...view.host.querySelectorAll('button')].find((el) => el.textContent === 'Erase this device')
    act(() => button?.click())
    expect(confirm).toHaveBeenCalledWith(ERASE_CONFIRM)
    expect(view.onReset).not.toHaveBeenCalled()
    confirm.mockReturnValue(true)
    act(() => button?.click())
    expect(view.onReset).toHaveBeenCalledOnce()
    confirm.mockRestore()
    view.unmount()
  })

  it('does not write a chosen file until Apply import', async () => {
    const view = mount()
    const saved = emptyDoc(Date.UTC(2026, 8, 1))
    saved.items['w:maa'] = applyAttempt(newItemProgress('w:maa'), {
      t: Date.UTC(2026, 8, 1),
      ok: true,
      v: 'exact',
      m: 'th-en',
    })
    const input = view.host.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File([exportJson(saved)], 'riankeng-progress-v1.json', { type: 'application/json' })
    await act(async () => {
      Object.defineProperty(input, 'files', { configurable: true, value: [file] })
      input.dispatchEvent(new Event('change', { bubbles: true }))
      await file.text()
    })
    expect(view.onDoc).not.toHaveBeenCalled()
    expect(view.host.textContent).toContain('would merge')
    const apply = [...view.host.querySelectorAll('button')].find((el) => el.textContent === 'Apply import')
    act(() => apply?.click())
    expect(view.onDoc).toHaveBeenCalledOnce()
    view.unmount()
  })
})
