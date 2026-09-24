import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = process.cwd()

describe('hidden gallery', () => {
  it('is not linked from the landing page', () => {
    const html = readFileSync(join(root, 'index.html'), 'utf8')
    expect(html).not.toContain('/gallery')
  })

  it('names the three sections', () => {
    const src = readFileSync(join(root, 'src/gallery/main.tsx'), 'utf8')
    expect(src).toContain('With a balloon')
    expect(src).toContain('No balloon')
    expect(src).toContain('Candidates')
  })
})
