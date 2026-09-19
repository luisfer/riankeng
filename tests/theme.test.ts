import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS, emptyDoc } from '../src/storage/progress-schema'
import { resolvedTheme } from '../src/ui/theme'

describe('paper default', () => {
  it('opens new docs on paper, not system Night', () => {
    expect(DEFAULT_SETTINGS.theme).toBe('light')
    expect(emptyDoc().settings.theme).toBe('light')
  })

  it('treats a missing pref as paper', () => {
    expect(resolvedTheme(undefined)).toBe('light')
  })
})
