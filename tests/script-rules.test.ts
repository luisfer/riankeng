import { describe, expect, it } from 'vitest'
import { getEntry, SCRIPT_LEVELS } from '../content/index'

describe('Script tone rules', () => {
  it('gives the tone marks on a low letter, next to the mid-letter rule', () => {
    const s17 = SCRIPT_LEVELS[17]!
    const text = [s17.blurb, ...s17.focus].join(' ')
    expect(text).toMatch(/on a low letter it makes it falling, as in ไม่/)
    expect(s17.focus).toContain('ไม่, พ่อ. ่ on a low letter: falling.')
    expect(s17.focus).toContain('บ้าน. ้ on a mid letter: falling.')
    expect(s17.focus).toContain('ม้า, น้ำ. ้ on a low letter: high.')
    expect(getEntry('s:pɔ̂ɔ#2')?.level).toBe(17)
    expect(getEntry('s:náam#2')?.level).toBe(17)
  })

  it('names the finals the learner already has letters for', () => {
    expect(SCRIPT_LEVELS[17]!.focus.join(' ')).toMatch(/ด and ส say t, บ and พ say p, ร and ล say n/)
  })

  it('teaches a letter in front lending its class, on words from Voice', () => {
    for (const id of ['s:dtà-làat', 's:kà-nǒm', 's:à-rɔ̀i', 's:sà-wàt-dii']) {
      const card = getEntry(id)
      expect(card?.level, id).toBe(18)
      expect(card?.note, id).toMatch(/leads/)
      expect(getEntry(id.replace(/^s:/, 'w:'))?.thai, id).toBe(card?.thai)
    }
    expect(getEntry('s:kɔ̀ɔp kun')?.level).toBe(23)
    expect(SCRIPT_LEVELS[18]!.focus.join(' ')).toMatch(/question word is said high: mái/)
  })

  it('explains the hidden vowels it relies on', () => {
    expect(getEntry('s:kon')?.note).toMatch(/short o is understood/)
    expect(getEntry('s:sà-baai')?.note).toMatch(/reads sà/)
    expect(getEntry('s:rát-tà-baan')?.note).toMatch(/two jobs/)
  })
})
