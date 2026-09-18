export type TrackId = 'voice' | 'script'

export type Kind = 'word' | 'phrase' | 'idiom'

export type Pos =
  | 'v'
  | 'n'
  | 'adj'
  | 'adv'
  | 'particle'
  | 'pron'
  | 'q'
  | 'num'
  | 'clf'
  | 'conj'
  | 'prep'
  | 'expr'

export interface Entry {
  /** Stable id: `${kindPrefix}:${rom}` with an optional `#n` disambiguator. */
  id: string
  /** Thai script. Hidden by default in Journey 1; used for TTS. */
  thai: string
  /** Canonical romanization in the textbook system, e.g. "kɔ̀ɔp kun". */
  rom: string
  /** Accepted English glosses. "(the) market" = optional word; "go [there]" = optional word. */
  en: string[]
  kind: Kind
  pos?: Pos
  level: number
  /** Defaults to voice (phonetic journey). */
  track?: TrackId
  tags: string[]
  /** Literal reading for idioms, e.g. "cool heart". */
  literal?: string
  /** Usage, register, gender notes. */
  note?: string
  /** Ids of entries that differ only by tone/length; used for level 0 drills. */
  minimalPairOf?: string[]
  /** Thai pieces in order, then the written word. Script intros show parts then word. */
  compose?: string[]
}

/** Compact authoring row for words: [rom, thai, en, pos?, tags?, note?] */
export type WordRow =
  | [string, string, string[]]
  | [string, string, string[], Pos]
  | [string, string, string[], Pos, string[]]
  | [string, string, string[], Pos, string[], string]

/** Compact authoring row for phrases and idioms: [rom, thai, en, note?, literal?] */
export type PhraseRow = [string, string, string[]] | [string, string, string[], string] | [string, string, string[], string, string]

export interface LevelMeta {
  n: number
  title: string
  /** Level title in the romanization, e.g. "sǐang" */
  rom: string
  thai: string
  blurb: string
  /**
   * Teaching points for the level intro. A period+space splits a lead
   * (usually phonetic) from its one-line note. Shown in full, not sliced.
   */
  focus: string[]
  /** Minimum number of entries the validator requires. */
  min: number
}
