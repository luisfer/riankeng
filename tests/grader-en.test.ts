import { describe, expect, it } from 'vitest'
import { getEntry } from '../content/index'
import { editDistance, gradeEnglish, normalizeEnglish, parseGloss, tokensMatch } from '../src/engine/grader-en'

describe('normalizeEnglish', () => {
  it('lowercases, strips punctuation and articles', () => {
    expect(normalizeEnglish('The Market!')).toEqual(['market'])
    expect(normalizeEnglish("I don't understand.")).toEqual(['i', 'do', 'not', 'understand'])
    expect(normalizeEnglish("Where's the toilet?")).toEqual(['where', 'is', 'toilet'])
  })
  it('keeps stop-word-only answers', () => {
    expect(normalizeEnglish('well')).toEqual(['well'])
    expect(normalizeEnglish('ok')).toEqual(['ok'])
  })
})

describe('parseGloss', () => {
  it('extracts optional words', () => {
    const g = parseGloss('(the) market')
    expect(g.required).toEqual(['market'])
    const h = parseGloss('go [there]')
    expect(h.required).toEqual(['go'])
    expect(h.optional).toEqual(['there'])
  })
})

describe('tokensMatch', () => {
  it('fuzzy, plural, synonyms', () => {
    expect(tokensMatch('delicious', 'delicous')).toBe(true)
    expect(tokensMatch('eggs', 'egg')).toBe(true)
    expect(tokensMatch('mother', 'mom')).toBe(true)
    expect(tokensMatch('big', 'bag')).toBe(false)
    expect(tokensMatch('horse', 'house')).toBe(false)
    expect(tokensMatch('right', 'eight')).toBe(false)
    expect(tokensMatch('tired', 'sleepy')).toBe(false)
    expect(tokensMatch('husband', 'wife')).toBe(false)
    expect(editDistance('kitten', 'sitting')).toBe(3)
  })
})

const accept: Array<[string[], string]> = [
  [['water'], 'Water'],
  [['water'], 'the water'],
  [['rice', '(cooked) rice'], 'cooked rice'],
  [['thank you', 'thanks'], 'Thank you!'],
  [['thank you', 'thanks'], 'thanks'],
  [['where is the toilet', 'where is the bathroom'], "Where's the bathroom?"],
  [['I do not understand'], "I don't understand"],
  [['how are you'], 'how are you?'],
  [['never mind', 'it is okay', 'no problem'], "it's ok"],
  [['delicious', 'tasty'], 'yummy'],
  [['I am hungry'], "i'm hungry"],
  [['he is not coming', 'she is not coming'], "she isn't coming"],
  [['can I have some water', 'water please'], 'Can I have some water please'],
  [['go', 'to go'], 'to go'],
  [['eat', 'to eat'], 'eat'],
  [['fried rice'], 'fried rice'],
  [['let us go eat together'], "let's go eat together"],
  [['speak slowly please'], 'please speak slowly'],
  [['I have a Thai friend', 'I have Thai friends'], 'i have a thai friend'],
]

const reject: Array<[string[], string]> = [
  [['water'], 'hot water'],
  [['dog'], 'horse'],
  [['go'], 'come'],
  [['fried rice'], 'rice'],
  [['I do not understand'], 'I understand'],
  [['expensive'], 'cheap'],
  [['big', 'large'], 'bag'],
  [['thank you'], 'sorry'],
  [['he is not coming'], 'he is coming'],
  [['delicious'], ''],
  [['understand', 'to understand'], 'get'],
  [['get', 'can'], 'understand'],
  [['say', 'tell'], 'talk'],
]

describe('gradeEnglish', () => {
  for (const [glosses, answer] of accept) {
    it(`accepts "${answer}" for ${glosses[0]}`, () => {
      expect(gradeEnglish(glosses, answer).correct).toBe(true)
    })
  }
  for (const [glosses, answer] of reject) {
    it(`rejects "${answer}" for ${glosses[0]}`, () => {
      expect(gradeEnglish(glosses, answer).correct).toBe(false)
    })
  }
  it('names the closest gloss when wrong', () => {
    const g = gradeEnglish(['(the) market'], 'shop')
    expect(g.message).toContain('the market')
  })

  it('rejects wife for สามี, house for ม้า, and get for เข้าใจ', () => {
    expect(gradeEnglish(getEntry('w:sǎa-mii')!.en, 'wife').correct).toBe(false)
    expect(gradeEnglish(getEntry('w:máa')!.en, 'house').correct).toBe(false)
    expect(gradeEnglish(getEntry('w:kâo jai')!.en, 'get').correct).toBe(false)
  })

  it('does not take an answer that adds a not', () => {
    expect(gradeEnglish(['that is right'], 'that is not right').correct).toBe(false)
    expect(gradeEnglish(['I am fine'], 'I am not fine').correct).toBe(false)
    expect(gradeEnglish(['I will take it'], "I won't take it").correct).toBe(false)
    expect(gradeEnglish(['I am sorry'], 'I am never sorry').correct).toBe(false)
    // A not the gloss has is still fine, and so is one of its own optional words.
    expect(gradeEnglish(['I do not understand'], "I don't understand").correct).toBe(true)
    expect(gradeEnglish(['no'], 'no').correct).toBe(true)
  })

  it('takes a singular for a plural and back', () => {
    for (const [a, b] of [['shoes', 'shoe'], ['trees', 'tree'], ['cakes', 'cake'], ['noses', 'nose'], ['sizes', 'size'], ['glasses', 'glass'], ['buses', 'bus'], ['boxes', 'box'], ['cities', 'city']]) {
      expect(tokensMatch(a!, b!), `${a} ${b}`).toBe(true)
      expect(tokensMatch(b!, a!), `${b} ${a}`).toBe(true)
    }
    expect(tokensMatch('horse', 'house')).toBe(false)
    expect(gradeEnglish(['shoes'], 'shoe').correct).toBe(true)
  })
})

