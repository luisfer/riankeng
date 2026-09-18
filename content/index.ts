import type { Entry, TrackId } from './types'
import { LEVELS } from './levels'
import { SCRIPT_LEVELS } from './script/levels'
import s00 from './script/level-00'
import s01 from './script/level-01'
import s02 from './script/level-02'
import s03 from './script/level-03'
import s04 from './script/level-04'
import s05 from './script/level-05'
import s06 from './script/level-06'
import s07 from './script/level-07'
import s08 from './script/level-08'
import s09 from './script/level-09'
import s10 from './script/level-10'
import s11 from './script/level-11'
import s12 from './script/level-12'
import s13 from './script/level-13'
import s14 from './script/level-14'
import s15 from './script/level-15'
import s16 from './script/level-16'
import s17 from './script/level-17'
import s18 from './script/level-18'
import s19 from './script/level-19'

import w00 from './words/level-00'
import w01 from './words/level-01'
import w02 from './words/level-02'
import w03 from './words/level-03'
import w04 from './words/level-04'
import w05 from './words/level-05'
import w06 from './words/level-06'
import w07 from './words/level-07'
import w08 from './words/level-08'
import w09 from './words/level-09'
import w10 from './words/level-10'
import w11 from './words/level-11'
import w12 from './words/level-12'
import w13 from './words/level-13'
import w14 from './words/level-14'
import w15 from './words/level-15'
import w16 from './words/level-16'
import w17 from './words/level-17'
import w18 from './words/level-18'
import w19 from './words/level-19'
import w20 from './words/level-20'
import w21 from './words/level-21'

import p00 from './phrases/level-00'
import p01 from './phrases/level-01'
import p02 from './phrases/level-02'
import p03 from './phrases/level-03'
import p04 from './phrases/level-04'
import p05 from './phrases/level-05'
import p06 from './phrases/level-06'
import p07 from './phrases/level-07'
import p08 from './phrases/level-08'
import p09 from './phrases/level-09'
import p10 from './phrases/level-10'
import p11 from './phrases/level-11'
import p12 from './phrases/level-12'
import p13 from './phrases/level-13'
import p14 from './phrases/level-14'
import p15 from './phrases/level-15'
import p16 from './phrases/level-16'
import p17 from './phrases/level-17'
import p18 from './phrases/level-18'
import p19 from './phrases/level-19'
import p20 from './phrases/level-20'
import p21 from './phrases/level-21'

import idiomList from './idioms'

export { LEVELS, SCRIPT_LEVELS }
export type { Entry, TrackId }

export function levelsFor(track: TrackId) {
  return track === 'script' ? SCRIPT_LEVELS : LEVELS
}

export function entryTrack(e: Pick<Entry, 'track'>): TrackId {
  return e.track ?? 'voice'
}

/** Every entry, both tracks. */
export const ENTRIES: Entry[] = [
  w00, p00, w01, p01, w02, p02, w03, p03, w04, p04, w05, p05, w06, p06, w07, p07, w08, p08, w09, p09,
  w10, p10, w11, p11, w12, p12, w13, p13, w14, p14, w15, p15, w16, p16, w17, p17, w18, p18, w19, p19,
  w20, p20, w21, p21, idiomList, s00, s01, s02, s03, s04, s05, s06, s07, s08,
  s09, s10, s11, s12, s13, s14, s15, s16, s17, s18, s19,
].flat()

const BY_ID = new Map<string, Entry>()
for (const e of ENTRIES) BY_ID.set(e.id, e)

export function getEntry(id: string): Entry | undefined {
  return BY_ID.get(id)
}

export function entriesForLevel(n: number, track: TrackId = 'voice'): Entry[] {
  return ENTRIES.filter((e) => e.level === n && entryTrack(e) === track)
}

export function levelIds(n: number, track: TrackId = 'voice'): string[] {
  return entriesForLevel(n, track).map((e) => e.id)
}
