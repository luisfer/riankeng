import { TONE_LABEL, type Tone } from '@content/system'
import { analyseRom, displayRom, expandAlternatives, type RomAnalysis } from './normalize'

export type ThaiVerdict = 'exact' | 'tone' | 'length' | 'wrong' | 'empty' | 'invalid'

export interface ToneSlip {
  syllable: number
  expected: Tone
  got: Tone
  /** Target syllable as written, e.g. "kâao". */
  targetSyllable: string
}

export interface ThaiGrade {
  verdict: ThaiVerdict
  /** True only for exact. Tone and length slips never count for mastery. */
  correct: boolean
  target: string
  /** The alternative of the target that matched best. */
  matchedTarget: string
  answer: string
  toneSlips: ToneSlip[]
  lengthSlip: boolean
  message: string
}

function compare(target: RomAnalysis, answer: RomAnalysis): Omit<ThaiGrade, 'target' | 'matchedTarget' | 'answer' | 'message'> {
  if (!answer.skeleton) return { verdict: 'empty', correct: false, toneSlips: [], lengthSlip: false }
  if (!answer.valid) return { verdict: 'invalid', correct: false, toneSlips: [], lengthSlip: false }

  const sameSkeleton = target.skeleton === answer.skeleton
  const sameCollapsed = target.collapsed === answer.collapsed
  const noGlottal = (s: string) => s.replace(/'/g, '')
  const sameButBreaks = !sameSkeleton && noGlottal(target.skeleton) === noGlottal(answer.skeleton)
  if (!sameSkeleton && !sameCollapsed && !sameButBreaks) {
    return { verdict: 'wrong', correct: false, toneSlips: [], lengthSlip: false }
  }
  const toneSlips: ToneSlip[] = []
  if (target.nuclei.length !== answer.nuclei.length || sameButBreaks) {
    // Same letters, different syllable breaks (e.g. "saàat" for "sà-àat").
    return { verdict: 'tone', correct: false, toneSlips: [], lengthSlip: false }
  }
  {
    const last = target.nuclei.length - 1
    target.nuclei.forEach((n, i) => {
      const a = answer.nuclei[i]!
      // Unstressed short "a" before another syllable (sà-wàt-dii, dtà-làat) loses
      // its tone in speech; the textbook itself writes it both ways. Low vs mid there is not a slip.
      const unstressed =
        n.letters === 'a' && i < last && (n.tone === 'low' || n.tone === 'mid') && (a.tone === 'low' || a.tone === 'mid')
      if (n.tone !== a.tone && !unstressed) {
        toneSlips.push({
          syllable: i,
          expected: n.tone,
          got: a.tone,
          targetSyllable: target.syllables[i] ?? n.letters,
        })
      }
    })
  }
  if (sameSkeleton && toneSlips.length === 0) {
    return { verdict: 'exact', correct: true, toneSlips, lengthSlip: false }
  }
  if (sameSkeleton) return { verdict: 'tone', correct: false, toneSlips, lengthSlip: false }
  return { verdict: 'length', correct: false, toneSlips, lengthSlip: true }
}

const RANK: Record<ThaiVerdict, number> = { exact: 5, tone: 4, length: 3, wrong: 1, invalid: 0, empty: 0 }

/** Grade a typed romanization against the canonical target (which may hold "/" alternatives). */
export function gradeThai(targetRom: string, answerRaw: string): ThaiGrade {
  const answer = analyseRom(answerRaw)
  const alternatives = expandAlternatives(displayRom(targetRom))
  let best: ThaiGrade | null = null
  for (const alt of alternatives) {
    const t = analyseRom(alt)
    const r = compare(t, answer)
    const grade: ThaiGrade = {
      ...r,
      target: displayRom(targetRom),
      matchedTarget: displayRom(alt),
      answer: displayRom(answerRaw),
      message: '',
    }
    if (!best || RANK[grade.verdict] > RANK[best.verdict]) best = grade
    if (grade.verdict === 'exact') break
  }
  best!.message = describe(best!)
  return best!
}

function describe(g: ThaiGrade): string {
  switch (g.verdict) {
    case 'exact':
      return 'Yes.'
    case 'empty':
      return 'Type your answer.'
    case 'invalid':
      return 'One tone mark per syllable, and only on a vowel.'
    case 'tone': {
      const s = g.toneSlips[0]
      if (!s) return `Letters right, but the syllables break differently: it is “${g.matchedTarget}”.`
      const more = g.toneSlips.length > 1 ? ` (+${g.toneSlips.length - 1} more)` : ''
      return `Letters right. Tone on “${s.targetSyllable}” is ${TONE_LABEL[s.expected]}, you wrote ${TONE_LABEL[s.got]}${more}.`
    }
    case 'length': {
      const tone = g.toneSlips.length ? ' Tone also differs.' : ''
      return `Sounds right, but vowel length differs: it is “${g.matchedTarget}”.${tone}`
    }
    case 'wrong':
      return `It is “${g.matchedTarget}”.`
  }
}
