import { describe, expect, it } from 'vitest'
import { sittingRatio } from '../src/ui/bits'

describe('sittingRatio', () => {
  it('is correct over correct plus remaining', () => {
    expect(sittingRatio(0, 16)).toBe(0)
    expect(sittingRatio(4, 12)).toBe(0.25)
    expect(sittingRatio(8, 8)).toBe(0.5)
    expect(sittingRatio(16, 0)).toBe(1)
  })

  it('is 0 when nothing has been queued', () => {
    expect(sittingRatio(0, 0)).toBe(0)
  })
})
