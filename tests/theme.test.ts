import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, emptyDoc } from '../src/storage/progress-schema'
import { lockPaper, PAPER } from '../src/ui/theme'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

describe('paper only', () => {
  it('opens new docs on paper', () => {
    expect(DEFAULT_SETTINGS.theme).toBe('light')
    expect(emptyDoc().settings.theme).toBe('light')
  })

  it('clears a leftover Night mark and pins the chrome color to paper', () => {
    document.documentElement.dataset.theme = 'dark'
    document.documentElement.style.colorScheme = 'dark'
    const meta = document.createElement('meta')
    meta.setAttribute('name', 'theme-color')
    meta.setAttribute('content', '#1c1710')
    document.head.appendChild(meta)
    lockPaper()
    expect(document.documentElement.dataset.theme).toBeUndefined()
    expect(document.documentElement.style.colorScheme).toBe('light')
    expect(meta.getAttribute('content')).toBe(PAPER)
    meta.remove()
  })

  it('has no Night token sheet, no Day Night switcher, and no theme apply path', () => {
    const tokens = readFileSync(resolve(root, 'src/tokens.css'), 'utf8')
    expect(tokens).not.toMatch(/data-theme/)
    expect(tokens).not.toMatch(/color-scheme:\s*dark/)
    expect(tokens).toMatch(/color-scheme:\s*light/)

    const account = readFileSync(resolve(root, 'src/ui/Account.tsx'), 'utf8')
    expect(account).not.toMatch(/>\s*Day\s*</)
    expect(account).not.toMatch(/>\s*Night\s*</)
    expect(account).not.toMatch(/>\s*System\s*</)

    const app = readFileSync(resolve(root, 'src/ui/App.tsx'), 'utf8')
    expect(app).not.toMatch(/applyTheme/)
    expect(app).not.toMatch(/prefers-color-scheme/)
    expect(app).not.toMatch(/lockPaper|theme/)

    const boot = readFileSync(resolve(root, 'src/main.tsx'), 'utf8')
    expect(boot).toMatch(/lockPaper\(\)/)
    expect(boot).not.toMatch(/applyTheme/)
    expect(boot).not.toMatch(/localStorage/)
  })

  it('paints the course field with a static paper wash, not gradient text', () => {
    const css = readFileSync(resolve(root, 'src/styles.css'), 'utf8')
    expect(css).toContain('#f8e0c6')
    expect(css).toContain('#e4ecd0')
    expect(css).toContain('color-mix(in srgb, var(--lacquer)')
    expect(css).not.toMatch(/background-clip:\s*text/)
    expect(css).not.toContain('-webkit-background-clip')
  })
})
