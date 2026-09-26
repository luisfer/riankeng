import { clipUrl } from './clip-url'

/** Where one syllable sits in a clip, in seconds of the clip's own time. */
export type Span = { start: number; end: number }

const FRAME = 0.01
const envelopes = new Map<string, Promise<Float32Array | null>>()

/** A syllable's share of the voice: long vowels hold longer, a stopped final (p, t, k) cuts short. */
export function syllableWeight(text: string): number {
  const bare = text.normalize('NFD').replace(/[̀-ͯ]/g, '')
  let w = 1
  if (/(aa|ii|uu|ee|oo|εε|ɔɔ|əə|ʉʉ|ia|ʉa|ua)/.test(bare)) w += 0.5
  if (/[ptk]$/.test(bare)) w -= 0.2
  return w
}

/** The clip's loudness, 10 ms at a time, smoothed. Null where audio cannot be decoded (tests, old browsers). */
function envelope(id: string): Promise<Float32Array | null> {
  let got = envelopes.get(id)
  if (!got) {
    got = (async () => {
      if (typeof OfflineAudioContext === 'undefined') return null
      try {
        const res = await fetch(clipUrl(id))
        if (!res.ok) return null
        const decoded = await new OfflineAudioContext(1, 1, 22050).decodeAudioData(await res.arrayBuffer())
        const data = decoded.getChannelData(0)
        const hop = Math.max(1, Math.round(decoded.sampleRate * FRAME))
        const frames = Math.floor(data.length / hop)
        const raw = new Float32Array(frames)
        for (let f = 0; f < frames; f++) {
          let sum = 0
          for (let j = f * hop; j < (f + 1) * hop; j++) sum += data[j]! * data[j]!
          raw[f] = Math.sqrt(sum / hop)
        }
        const env = new Float32Array(frames)
        for (let f = 0; f < frames; f++) env[f] = ((raw[f - 1] ?? raw[f]!) + raw[f]! + (raw[f + 1] ?? raw[f]!)) / 3
        return env
      } catch {
        return null
      }
    })()
    envelopes.set(id, got)
  }
  return got
}

/** Decode a clip ahead of its first Hear, so the line keeps time from the first syllable. */
export function warmTiming(id: string): void {
  void envelope(id)
}

/**
 * Split the voiced part of a clip into syllables. Each boundary starts where the syllables' weights
 * put it, then moves to the quietest moment near there, the dip between two syllables.
 */
export function spansFrom(env: Float32Array, weights: number[]): Span[] {
  const n = weights.length
  let peak = 0
  for (const v of env) peak = Math.max(peak, v)
  const floor = peak * 0.12
  let a = env.findIndex((v) => v > floor)
  let b = env.length - 1
  while (b > 0 && env[b]! <= floor) b--
  if (a < 0 || b <= a) {
    a = 0
    b = env.length - 1
  }
  const total = weights.reduce((s, w) => s + w, 0) || 1
  const edges = [a]
  let acc = 0
  for (let k = 0; k < n - 1; k++) {
    acc += weights[k]!
    const expected = a + ((b - a) * acc) / total
    const reach = (((b - a) * weights[k]!) / total) * 0.4
    const lo = Math.max(edges[k]! + 5, Math.round(expected - reach))
    const hi = Math.min(b - 5 * (n - 1 - k), Math.round(expected + reach))
    let best = Math.round(expected)
    let quiet = Infinity
    for (let i = lo; i <= hi; i++) {
      if (env[i]! < quiet) {
        quiet = env[i]!
        best = i
      }
    }
    edges.push(Math.min(Math.max(best, edges[k]! + 1), b - 1))
  }
  edges.push(b)
  return weights.map((_, k) => ({ start: edges[k]! * FRAME, end: edges[k + 1]! * FRAME }))
}

/** The same split with no audio to read: the weights across the clip, less a little silence at each end. */
export function evenSpans(duration: number, weights: number[]): Span[] {
  const start = Math.min(0.08, duration * 0.1)
  const end = Math.max(start, duration - Math.min(0.15, duration * 0.12))
  const total = weights.reduce((s, w) => s + w, 0) || 1
  let at = start
  return weights.map((w) => {
    const from = at
    at += ((end - start) * w) / total
    return { start: from, end: at }
  })
}

/** Where each spoken syllable sits in the clip, from its audio when that can be read. */
export async function syllableSpans(id: string, weights: number[]): Promise<Span[] | null> {
  const env = await envelope(id)
  return env && env.length > 10 ? spansFrom(env, weights) : null
}
