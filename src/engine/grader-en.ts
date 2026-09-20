/**
 * Deterministic English grading. No AI: a gloss list per entry, a normalizer,
 * optional-word brackets, a small synonym table and a fuzzy token match.
 */

const CONTRACTIONS: Array<[RegExp, string]> = [
  [/\bi'm\b/g, 'i am'],
  [/\bi've\b/g, 'i have'],
  [/\bi'll\b/g, 'i will'],
  [/\bi'd\b/g, 'i would'],
  [/\byou're\b/g, 'you are'],
  [/\byou've\b/g, 'you have'],
  [/\byou'll\b/g, 'you will'],
  [/\bwe're\b/g, 'we are'],
  [/\bwe've\b/g, 'we have'],
  [/\bthey're\b/g, 'they are'],
  [/\bthey've\b/g, 'they have'],
  [/\bhe's\b/g, 'he is'],
  [/\bshe's\b/g, 'she is'],
  [/\bit's\b/g, 'it is'],
  [/\bthat's\b/g, 'that is'],
  [/\bthere's\b/g, 'there is'],
  [/\bwhat's\b/g, 'what is'],
  [/\bwhere's\b/g, 'where is'],
  [/\bwho's\b/g, 'who is'],
  [/\bhow's\b/g, 'how is'],
  [/\blet's\b/g, 'let us'],
  [/\bcan't\b/g, 'cannot'],
  [/\bwon't\b/g, 'will not'],
  [/\bdon't\b/g, 'do not'],
  [/\bdoesn't\b/g, 'does not'],
  [/\bdidn't\b/g, 'did not'],
  [/\bisn't\b/g, 'is not'],
  [/\baren't\b/g, 'are not'],
  [/\bwasn't\b/g, 'was not'],
  [/\bhaven't\b/g, 'have not'],
  [/\bhasn't\b/g, 'has not'],
  [/\bshouldn't\b/g, 'should not'],
  [/\bwouldn't\b/g, 'would not'],
  [/\bcouldn't\b/g, 'could not'],
  [/\bn't\b/g, ' not'],
  [/'ll\b/g, ' will'],
  [/'re\b/g, ' are'],
  [/'ve\b/g, ' have'],
  [/'d\b/g, ' would'],
  [/'s\b/g, ''],
]

/** Words that carry no meaning Thai would mark. Dropped from both sides. */
export const STOP_WORDS = new Set([
  'a', 'an', 'the', 'to', 'please', 'some', 'ok', 'okay', 'oh', 'well', 'just', 'really',
])

/** Bidirectional equivalences. Each row is one equivalence class. */
const SYNONYM_ROWS: string[][] = [
  ['mom', 'mum', 'mother', 'mama'],
  ['dad', 'father', 'papa'],
  ['toilet', 'bathroom', 'restroom', 'washroom', 'loo', 'wc'],
  ['tasty', 'delicious', 'yummy'],
  ['big', 'large'],
  ['small', 'little'],
  ['cheap', 'inexpensive'],
  ['expensive', 'pricey', 'dear'],
  ['car', 'automobile'],
  ['phone', 'telephone', 'mobile', 'cellphone', 'cell'],
  ['money', 'cash'],
  ['buy', 'purchase'],
  ['pretty', 'beautiful', 'lovely', 'gorgeous'],
  ['fast', 'quick', 'quickly', 'fastly'],
  ['slow', 'slowly'],
  ['tired', 'exhausted'],
  ['sick', 'ill', 'unwell'],
  ['hi', 'hello', 'hey'],
  ['bye', 'goodbye'],
  ['thanks', 'thank'],
  ['sorry', 'apologies', 'apologise', 'apologize'],
  ['film', 'movie'],
  ['shop', 'store'],
  ['bike', 'bicycle'],
  ['motorbike', 'motorcycle', 'scooter'],
  ['taxi', 'cab'],
  ['job', 'work'],
  ['kid', 'child'],
  ['kids', 'children'],
  ['friend', 'mate', 'buddy', 'pal'],
  ['boyfriend', 'girlfriend', 'partner'],
  ['husband', 'hubby'],
  ['begin', 'start'],
  ['finish', 'end', 'done'],
  ['want', 'wanna'],
  ['going', 'gonna'],
  ['maybe', 'perhaps', 'probably'],
  ['also', 'too'],
  ['angry', 'mad'],
  ['happy', 'glad'],
  ['sad', 'unhappy'],
  ['fun', 'enjoyable'],
  ['cold', 'chilly'],
  ['rain', 'raining'],
  ['soon', 'shortly'],
  ['now', 'currently'],
  ['broken', 'spoiled', 'spoilt'],
  ['photo', 'picture', 'photograph'],
  ['tv', 'television'],
  ['pc', 'computer', 'laptop'],
  ['bag', 'handbag', 'purse'],
  ['trousers', 'pants'],
  ['flat', 'apartment', 'condo', 'condominium'],
  ['lift', 'elevator'],
  ['queue', 'line'],
  ['holiday', 'vacation'],
  ['centre', 'center'],
  ['colour', 'color'],
  ['favourite', 'favorite'],
  ['neighbour', 'neighbor'],
  ['grey', 'gray'],
  ['metre', 'meter'],
  ['litre', 'liter'],
  ['practise', 'practice'],
  ['learn', 'study'],
  ['speak', 'talk'],
  ['many', 'lots', 'lot', 'much'],
  ['very', 'so'],
]

const SYNONYM_ID = new Map<string, number>()
SYNONYM_ROWS.forEach((row, i) => row.forEach((w) => SYNONYM_ID.set(w, i)))

export function normalizeEnglish(input: string): string[] {
  let s = input.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  s = s.replace(/[’‘`]/g, "'")
  for (const [re, rep] of CONTRACTIONS) s = s.replace(re, rep)
  s = s.replace(/[^a-z0-9' ]+/g, ' ')
  s = s.replace(/'/g, '')
  const tokens = s.split(/\s+/).filter(Boolean)
  const content = tokens.filter((t) => !STOP_WORDS.has(t))
  // "well", "ok", "please" can be whole answers; only drop stop-words when something remains.
  return content.length ? content : tokens
}

export interface ParsedGloss {
  raw: string
  required: string[]
  optional: string[]
}

/** "(the) market" / "go [there]" → required ["market"], optional ["the"] etc. */
export function parseGloss(gloss: string): ParsedGloss {
  const optional: string[] = []
  const withoutOptional = gloss.replace(/[\(\[]([^\)\]]*)[\)\]]/g, (_m, inner: string) => {
    optional.push(...normalizeEnglish(inner))
    return ' '
  })
  return { raw: gloss, required: normalizeEnglish(withoutOptional), optional }
}

/** Damerau-Levenshtein (optimal string alignment) distance. */
export function editDistance(a: string, b: string): number {
  const m = a.length
  const n = b.length
  const d: number[][] = Array.from({ length: m + 1 }, () => new Array<number>(n + 1).fill(0))
  for (let i = 0; i <= m; i++) d[i]![0] = i
  for (let j = 0; j <= n; j++) d[0]![j] = j
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost)
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        d[i]![j] = Math.min(d[i]![j]!, d[i - 2]![j - 2]! + 1)
      }
    }
  }
  return d[m]![n]!
}

function stem(w: string): string {
  if (w.length > 4 && w.endsWith('ies')) return w.slice(0, -3) + 'y'
  if (w.length > 4 && w.endsWith('es')) return w.slice(0, -2)
  if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) return w.slice(0, -1)
  return w
}

function fuzzyPair(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

/** Near-misses that are different English words, not typos. */
const FUZZY_BLOCK = new Set(['horse|house', 'eight|right'])

export function tokensMatch(a: string, b: string): boolean {
  if (a === b) return true
  if (stem(a) === stem(b)) return true
  const sa = SYNONYM_ID.get(a)
  const sb = SYNONYM_ID.get(b)
  if (sa !== undefined && sa === sb) return true
  if (FUZZY_BLOCK.has(fuzzyPair(a, b))) return false
  const len = Math.min(a.length, b.length)
  if (len >= 5 && editDistance(a, b) <= 1) return true
  if (len >= 8 && editDistance(a, b) <= 2) return true
  return false
}

export interface EnglishGrade {
  correct: boolean
  answer: string
  matchedGloss: string | null
  /** Closest gloss when wrong, for the feedback line. */
  closest: string
  message: string
}

function allowedExtras(requiredCount: number): number {
  if (requiredCount <= 2) return 0
  if (requiredCount <= 5) return 1
  return 2
}

function matchGloss(gloss: ParsedGloss, answer: string[]): { ok: boolean; score: number } {
  const used = new Array<boolean>(answer.length).fill(false)
  let matched = 0
  for (const req of gloss.required) {
    let found = -1
    for (let i = 0; i < answer.length; i++) {
      if (!used[i] && tokensMatch(req, answer[i]!)) {
        found = i
        break
      }
    }
    if (found === -1) continue
    used[found] = true
    matched++
  }
  // optional words may absorb leftover answer tokens
  for (const opt of gloss.optional) {
    for (let i = 0; i < answer.length; i++) {
      if (!used[i] && tokensMatch(opt, answer[i]!)) {
        used[i] = true
        break
      }
    }
  }
  const extras = used.filter((u) => !u).length
  const allRequired = matched === gloss.required.length
  const ok = allRequired && extras <= allowedExtras(gloss.required.length)
  const score = matched / Math.max(1, gloss.required.length) - extras * 0.1
  return { ok, score }
}

/** Grade a typed English answer against the accepted glosses of an entry. */
export function gradeEnglish(glosses: string[], answerRaw: string): EnglishGrade {
  const answer = normalizeEnglish(answerRaw)
  if (!answer.length) {
    return { correct: false, answer: answerRaw, matchedGloss: null, closest: glosses[0] ?? '', message: 'Type your answer.' }
  }
  let bestScore = -Infinity
  let closest = glosses[0] ?? ''
  for (const g of glosses) {
    const parsed = parseGloss(g)
    if (!parsed.required.length) continue
    const r = matchGloss(parsed, answer)
    if (r.ok) {
      return { correct: true, answer: answerRaw, matchedGloss: g, closest: g, message: 'Yes.' }
    }
    if (r.score > bestScore) {
      bestScore = r.score
      closest = g
    }
  }
  return {
    correct: false,
    answer: answerRaw,
    matchedGloss: null,
    closest,
    message: `It means “${cleanGloss(closest)}”.`,
  }
}

/** Show a gloss without bracket syntax. */
export function cleanGloss(g: string): string {
  return g.replace(/[\(\[]([^\)\]]*)[\)\]]/g, '$1').replace(/\s+/g, ' ').trim()
}
