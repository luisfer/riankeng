import { describe, expect, it } from 'vitest'
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
})
