/** Thai combining marks: ั, ิ–ฺ, ็–๎. They have no width of their own. */
const COMBINING = /^[\u0E31\u0E34-\u0E3A\u0E47-\u0E4E]$/

/**
 * Thai for display. A lone combining mark (a vowel sign or ์) is given a
 * dotted circle to sit on so the reader sees where the consonant goes.
 * Words and letters with their own body pass through untouched.
 */
export function showThai(thai: string): string {
  return COMBINING.test(thai) ? `\u25CC${thai}` : thai
}

/** The same, for a list of parts such as a word's compose. */
export function showParts(parts: string[]): string {
  return parts.map(showThai).join(' + ')
}
