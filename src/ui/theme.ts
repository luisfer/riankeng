/** The one look. Paper, never Night. */
export const PAPER = '#f2ead8'

/** Pin the course to paper so a stored Night pref cannot flip the field. */
export function lockPaper(): void {
  const root = document.documentElement
  delete root.dataset.theme
  root.style.colorScheme = 'light'
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', PAPER)
}
