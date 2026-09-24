import type { Entry } from '../../content/types.js'
import voice0 from '../../content/words/level-00.js'

/** Eight words. The page holds these and nothing after them. */
export const PREVIEW_VOICE: Entry[] = voice0.slice(0, 8)

export const PREVIEW_IDS: string[] = PREVIEW_VOICE.map((e) => e.id)
