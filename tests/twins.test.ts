import { describe, expect, it } from 'vitest'
import { getEntry } from '../content/index'
import { gradeThai } from '../src/engine/grader-thai'
import { enThTarget, twinAnswer } from '../src/engine/twins'

const entry = (id: string) => {
  const e = getEntry(id)
  if (!e) throw new Error(`missing ${id}`)
  return e
}
const never = () => false

describe('an English prompt with two right answers', () => {
  it('takes the polite form on a bare card', () => {
    expect(twinAnswer(entry('w:kɔ̀ɔp kun'), 'kɔ̀ɔp kun kráp', never)?.id).toBe('p:kɔ̀ɔp kun kráp/kâ')
    expect(twinAnswer(entry('w:sà-wàt-dii'), 'sà-wàt-dii kâ', never)?.id).toBe('p:sà-wàt-dii kráp/kâ')
  })

  it('does not take a twin the learner has not reached', () => {
    // "time" is tii and wee-laa alike.
    const tii = entry('w:tii')
    const weelaa = entry('w:wee-laa')
    expect(weelaa.level).toBeGreaterThan(tii.level)
    expect(twinAnswer(tii, 'wee-laa', never)).toBeNull()
    expect(twinAnswer(tii, 'wee-laa', (id) => id === 'w:wee-laa')?.id).toBe('w:wee-laa')
  })

  it('keeps an illness apart from the weather', () => {
    // A cold is wàt. The cold of the weather is nǎao, so it is not a twin.
    expect(twinAnswer(entry('w:wàt'), 'nǎao', () => true)).toBeNull()
    expect(twinAnswer(entry('w:nǎao'), 'wàt', () => true)).toBeNull()
  })

  it('still marks a wrong answer wrong', () => {
    expect(twinAnswer(entry('w:kɔ̀ɔp kun'), 'sà-wàt-dii', never)).toBeNull()
  })

  it('keeps prompts that already name the difference apart', () => {
    // "I, male speaker" asks for pǒm. The grandparents name their side of the family.
    expect(twinAnswer(entry('w:pǒm'), 'chǎn', never)).toBeNull()
    expect(twinAnswer(entry('w:yâa'), 'yaai', (id) => id === 'w:yaai')).toBeNull()
  })
})

describe("a woman's I", () => {
  it('accepts chǎn where a phrase has pǒm', () => {
    const e = entry('p:pǒm hǐu')
    expect(enThTarget(e)).toBe('pǒm/chǎn hǐu')
    expect(gradeThai(enThTarget(e), 'chǎn hǐu').correct).toBe(true)
    expect(gradeThai(enThTarget(e), 'pǒm hǐu').correct).toBe(true)
  })

  it('leaves the pronoun cards themselves strict', () => {
    expect(enThTarget(entry('w:pǒm'))).toBe('pǒm')
    expect(enThTarget(entry('w:kɔ̌ɔng pǒm'))).toBe('kɔ̌ɔng pǒm')
  })

  it('does not touch a pǒm inside another word', () => {
    expect(enThTarget({ ...entry('p:pǒm hǐu'), rom: 'pǒmpǒm hǐu' })).toBe('pǒmpǒm hǐu')
  })
})
