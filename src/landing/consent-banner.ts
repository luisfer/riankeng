import { readConsent, saveConsent, storageWorks } from '../consent'
import { landing } from './copy'

/**
 * The one question about counting, asked the same way in every country: a note at the foot of the
 * screen, never a wall. Allow and Don't allow look alike, nothing is ticked first, and the page
 * works the same either way. Privacy choices, wherever a page has one, asks again.
 */
export function mountConsent(onChoice?: (yes: boolean) => void, doc: Document = document): void {
  let box: HTMLElement | null = null
  let opener: HTMLElement | null = null

  const close = () => {
    box?.remove()
    box = null
    opener?.focus()
    opener = null
  }

  const choose = (yes: boolean) => {
    saveConsent(yes)
    close()
    onChoice?.(yes)
  }

  const open = (from: HTMLElement | null) => {
    if (box) return box.querySelector<HTMLButtonElement>('button')?.focus()
    opener = from
    box = doc.createElement('section')
    box.className = 'consent'
    box.setAttribute('aria-label', landing.consentLabel)
    const text = doc.createElement('p')
    text.className = 'consent-text'
    text.textContent = landing.consentText
    const now = readConsent()
    if (from && now !== 'unset') text.append(' ', now === 'yes' ? landing.consentNowYes : landing.consentNowNo)
    const act = doc.createElement('div')
    act.className = 'consent-act'
    for (const [label, yes] of [
      [landing.consentYes, true],
      [landing.consentNo, false],
    ] as const) {
      const button = doc.createElement('button')
      button.type = 'button'
      button.className = 'btn secondary'
      button.textContent = label
      button.addEventListener('click', () => choose(yes))
      act.append(button)
    }
    const more = doc.createElement('a')
    more.href = '/privacy#counting'
    more.textContent = landing.consentPrivacy
    act.append(more)
    box.append(text, act)
    // Escape leaves the choice as it was. Only a button changes it.
    box.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && from) close()
    })
    doc.body.append(box)
    // Asked by the page, the note waits. Asked by a person, it takes the focus.
    if (from) act.querySelector<HTMLButtonElement>('button')?.focus()
  }

  for (const button of doc.querySelectorAll<HTMLElement>('[data-consent-open]')) {
    button.addEventListener('click', () => open(button))
  }
  if (readConsent() === 'unset' && storageWorks()) open(null)
}
