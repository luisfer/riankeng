import { ENTRIES, entryTrack } from '@content/index'
import type { Entry } from '@content/types'
import { cleanGloss } from './grader-en'
import { gradeThai } from './grader-thai'

/**
 * An English prompt often has two right Thai answers: pǒm and chǎn for "I", kɔ̀ɔp kun with
 * or without kráp. Every card under each gloss it accepts, per track, built on first use.
 */
let byGloss: Map<string, Entry[]> | null = null

function glossKey(track: string, gloss: string): string {
  return `${track}|${cleanGloss(gloss).trim().toLowerCase()}`
}

function index(): Map<string, Entry[]> {
  if (byGloss) return byGloss
  byGloss = new Map()
  for (const e of ENTRIES) {
    const track = entryTrack(e)
    for (const key of new Set(e.en.map((g) => glossKey(track, g)))) {
      const list = byGloss.get(key) ?? []
      list.push(e)
      byGloss.set(key, list)
    }
  }
  return byGloss
}

/**
 * The other card an English-to-Thai answer is right for: same track, one of its glosses is
 * this card's prompt, the answer grades right against it, and the learner has met it or it
 * sits no higher than this card. Null when the answer is simply wrong.
 */
export function twinAnswer(entry: Entry, answer: string, met: (id: string) => boolean): Entry | null {
  const twins = index().get(glossKey(entryTrack(entry), entry.en[0] ?? '')) ?? []
  for (const twin of twins) {
    if (twin.id === entry.id || twin.rom === entry.rom) continue
    if (twin.level > entry.level && !met(twin.id)) continue
    if (gradeThai(twin.rom, answer).correct) return twin
  }
  return null
}

/**
 * What an English-to-Thai phrase accepts. A woman says chǎn where the phrase has pǒm, so
 * either is right. The pǒm card itself stays strict, and so do the clip's own cards.
 */
export function enThTarget(entry: Entry): string {
  if (entry.kind === 'word') return entry.rom
  return entry.rom.replace(/(^|\s)pǒm(?=\s|$)/g, '$1pǒm/chǎn')
}
