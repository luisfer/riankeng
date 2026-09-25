import { useEffect, useRef, useState, type KeyboardEvent, type ClipboardEvent, type MouseEvent } from 'react'
import { DOT_BELOW, POPOVER_TONES, SEPARATORS, TONE_MARKS, VOWEL_BASES, VOWEL_KEYS, VOWEL_VARIANTS } from '@content/system'

const TYPED_VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])

const TONE_MARK_SET = new Set<string>(Object.values(TONE_MARKS))

function withTone(letter: string, mark: string): string {
  return (letter.normalize('NFD').replace(/[\u0300\u0301\u0302\u030C]/g, '') + mark).normalize('NFC')
}

type StripKey = { ch: string; label: string; key: string }

/** The letters English has no key for, then the four marks, each on its number key. */
const STRIP_GROUPS: StripKey[][] = [
  VOWEL_KEYS.map((v) => ({ ch: v.letter, label: v.letter, key: v.key })),
  POPOVER_TONES.map((t) => ({ ch: t.mark, label: withTone('a', t.mark), key: t.key })),
]

const STRIP = STRIP_GROUPS.flat()

type Cluster = { start: number; end: number }

function clampCaret(value: string, caret: number): number {
  if (!Number.isFinite(caret)) return value.length
  return Math.max(0, Math.min(value.length, caret))
}

function insertAt(value: string, caret: number, text: string, end = caret): { value: string; caret: number } {
  const c = clampCaret(value, caret)
  const e = Math.max(c, clampCaret(value, end))
  return { value: value.slice(0, c) + text + value.slice(e), caret: c + text.length }
}

/** Caret in the NFD string, so a mark and its vowel stay one cluster. */
function nfdCaret(value: string, caret: number): { nfd: string; pos: number } {
  const nfd = value.normalize('NFD')
  const pos = value.slice(0, clampCaret(value, caret)).normalize('NFD').length
  return { nfd, pos }
}

function clusterEnd(nfd: string, start: number): number {
  let end = start + 1
  if (nfd[end] === DOT_BELOW) end++
  while (end < nfd.length && TONE_MARK_SET.has(nfd[end]!)) end++
  return end
}

function clusters(nfd: string): Cluster[] {
  const out: Cluster[] = []
  for (let i = 0; i < nfd.length; i++) {
    if (!VOWEL_BASES.has(nfd[i]!)) continue
    const end = clusterEnd(nfd, i)
    out.push({ start: i, end })
    i = end - 1
  }
  return out
}

/** The vowel the caret is in, else the nearest one before it, else the next one. */
function clusterAt(nfd: string, pos: number): Cluster | null {
  const all = clusters(nfd)
  const inside = all.find((c) => c.start < pos && pos <= c.end)
  if (inside) return inside
  const before = [...all].reverse().find((c) => c.end <= pos)
  if (before) return before
  return all.find((c) => c.start >= pos) ?? null
}

function caretAfter(nfd: string, nfdIndex: number): number {
  return nfd.slice(0, nfdIndex).normalize('NFC').length
}

function spliceCluster(value: string, caret: number, next: string): { value: string; caret: number } {
  const { nfd, pos } = nfdCaret(value, caret)
  const cluster = clusterAt(nfd, pos)
  const piece = next.normalize('NFD')
  if (!cluster) return insertAt(value, caret, next.normalize('NFC'))
  const merged = nfd.slice(0, cluster.start) + piece + nfd.slice(cluster.end)
  return { value: merged.normalize('NFC'), caret: caretAfter(merged, cluster.start + piece.length) }
}

/** The letters around the caret, up to a space, hyphen or period on either side. */
function runAt(s: string, pos: number): Cluster {
  let start = pos
  while (start > 0 && !SEPARATORS.has(s[start - 1]!)) start--
  let end = pos
  while (end < s.length && !SEPARATORS.has(s[end]!)) end++
  return { start, end }
}

/** One syllable's vowel: every vowel letter in a row, as in aa, ʉa, iao. */
function nuclei(nfd: string): Cluster[] {
  const out: Cluster[] = []
  let i = 0
  while (i < nfd.length) {
    if (!VOWEL_BASES.has(nfd[i]!)) {
      i++
      continue
    }
    const start = i
    let end = clusterEnd(nfd, i)
    while (end < nfd.length && VOWEL_BASES.has(nfd[end]!)) end = clusterEnd(nfd, end)
    out.push({ start, end })
    i = end
  }
  return out
}

/** The syllable the caret is in or just after, else the next one, inside the caret's run of letters. */
function nucleusAt(nfd: string, pos: number): Cluster | null {
  const run = runAt(nfd, pos)
  const own = nuclei(nfd).filter((c) => c.start >= run.start && c.end <= run.end)
  const before = [...own].reverse().find((c) => c.start < pos)
  return before ?? own.find((c) => c.start >= pos) ?? null
}

/** Where a caret inside the old vowel sits in the new one: after the same letters, and after any mark on the last. */
function caretInside(old: string, offset: number, next: string): number {
  let letters = 0
  for (let i = 0; i < offset; i++) if (!TONE_MARK_SET.has(old[i]!)) letters++
  let j = 0
  for (let seen = 0; j < next.length && seen < letters; j++) if (!TONE_MARK_SET.has(next[j]!)) seen++
  while (j < next.length && TONE_MARK_SET.has(next[j]!)) j++
  return j
}

/**
 * Put `mark` on the syllable at the caret, on its first vowel letter: máa,
 * kɔ̀ɔp, gǔai. Any tone already on that syllable goes. The caret keeps its
 * place in the text. A space, hyphen or period closes a syllable, so the mark
 * stays on the caret's side of it. With no vowel there yet, write à/â/á/ǎ.
 */
export function toneAt(value: string, caret: number, mark: string): { value: string; caret: number } {
  const { nfd, pos } = nfdCaret(value, caret)
  const nucleus = nucleusAt(nfd, pos)
  if (!nucleus) return insertAt(value, caret, withTone('a', mark))
  const old = nfd.slice(nucleus.start, nucleus.end)
  const bare = old.replace(/[\u0300\u0301\u0302\u030C]/g, '')
  const first = bare[1] === DOT_BELOW ? 2 : 1
  const next = bare.slice(0, first) + mark + bare.slice(first)
  const merged = nfd.slice(0, nucleus.start) + next + nfd.slice(nucleus.end)
  const at =
    pos <= nucleus.start
      ? pos
      : pos >= nucleus.end
        ? pos + next.length - old.length
        : nucleus.start + caretInside(old, pos - nucleus.start, next)
  return { value: merged.normalize('NFC'), caret: caretAfter(merged, at) }
}

/** The vowel of the syllable at the caret as a tone key would leave it: âi for chai. */
export function tonedVowel(value: string, caret: number, mark: string): string {
  const next = toneAt(value, caret, mark)
  const { nfd, pos } = nfdCaret(next.value, next.caret)
  const nucleus = nucleusAt(nfd, pos)
  return nucleus ? nfd.slice(nucleus.start, nucleus.end).normalize('NFC') : withTone('a', mark)
}

/** Replace the vowel at the caret with another letter, and leave the caret after it. */
export function replaceVowelAt(value: string, caret: number, letter: string): { value: string; caret: number } {
  return spliceCluster(value, caret, letter)
}

/**
 * Strip key at a caret. Special vowels insert there. Tone marks attach to the
 * vowel at the caret. Omitted caret means the end of the field.
 */
export function applyStripKey(value: string, ch: string, caret = value.length): string {
  return editRoman(value, caret, ch).value
}

/** A tone mark tones the syllable at `caret`. A letter replaces the selection up to `end`. */
export function editRoman(value: string, caret: number, ch: string, end = caret): { value: string; caret: number } {
  if (TONE_MARK_SET.has(ch)) return toneAt(value, caret, ch)
  return insertAt(value, caret, ch, end)
}

export type NumberKey = { kind: 'tone'; mark: string } | { kind: 'variant' | 'letter'; letter: string }

/**
 * A number key in the field, and the strip key with the same number: 1 to 4
 * tone the syllable at the caret, 5 to 8 write ε ɔ ə ʉ there. Right after a
 * plain vowel, the number of one of its own letters replaces it: e then 5 is ε.
 */
export function numberKey(key: string, typed: string | null): NumberKey | null {
  const k = STRIP.find((s) => s.key === key)
  if (!k) return null
  if (TONE_MARK_SET.has(k.ch)) return { kind: 'tone', mark: k.ch }
  const own = typed != null && (VOWEL_VARIANTS[typed] ?? []).includes(k.ch)
  return { kind: own ? 'variant' : 'letter', letter: k.ch }
}

/** The plain vowel just typed, and the caret right after it. Its own strip letters swap it. */
type Typed = { letter: string; at: number }

export function RomanInput(props: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onPasteBlock?: () => void
  disabled?: boolean
  placeholder?: string
  autoFocus?: boolean
  /** Focus the field again whenever this changes to a new value, as after a check that missed. */
  focusToken?: unknown
}) {
  const ref = useRef<HTMLInputElement>(null)
  const place = useRef<number | null>(null)
  const last = useRef<{ start: number; end: number } | null>(null)
  const token = useRef(props.focusToken)
  const [caret, setCaret] = useState<number | null>(null)
  const [typed, setTyped] = useState<Typed | null>(null)

  useEffect(() => {
    if (props.autoFocus) ref.current?.focus()
  }, [props.autoFocus, props.disabled])

  useEffect(() => {
    if (Object.is(props.focusToken, token.current)) return
    token.current = props.focusToken
    if (props.focusToken !== undefined) ref.current?.focus()
  }, [props.focusToken])

  useEffect(() => {
    const el = ref.current
    const at = place.current
    if (!el || at == null) return
    el.setSelectionRange(at, at)
    place.current = null
  }, [props.value])

  const read = () => ref.current?.value ?? props.value

  const remember = () => {
    const el = ref.current
    if (!el || el.selectionStart == null) return
    last.current = { start: el.selectionStart, end: el.selectionEnd ?? el.selectionStart }
    setCaret(el.selectionStart)
  }

  /** The live selection while the field has focus, else where it last was. */
  const selection = (): { start: number; end: number } => {
    const el = ref.current
    const value = read()
    if (el && document.activeElement === el && el.selectionStart != null) {
      return { start: el.selectionStart, end: el.selectionEnd ?? el.selectionStart }
    }
    const held = last.current
    if (held) return { start: Math.min(held.start, value.length), end: Math.min(held.end, value.length) }
    return { start: value.length, end: value.length }
  }

  const commit = (value: string, at: number) => {
    place.current = at
    last.current = { start: at, end: at }
    setCaret(at)
    props.onChange(value)
    queueMicrotask(() => {
      const el = ref.current
      if (!el || place.current == null || el.value !== value) return
      el.setSelectionRange(at, at)
      place.current = null
    })
  }

  const pickTone = (mark: string) => {
    const next = toneAt(read(), selection().start, mark)
    commit(next.value, next.caret)
    setTyped(null)
    ref.current?.focus()
  }

  const swapTyped = (letter: string) => {
    if (!typed) return
    const next = replaceVowelAt(read(), typed.at, letter)
    commit(next.value, next.caret)
    setTyped(null)
    ref.current?.focus()
  }

  const insertLetter = (letter: string) => {
    const { start, end } = selection()
    const next = editRoman(read(), start, letter, end)
    commit(next.value, next.caret)
    setTyped(null)
    ref.current?.focus()
  }

  const run = (action: NumberKey) => {
    if (action.kind === 'tone') pickTone(action.mark)
    else if (action.kind === 'variant') swapTyped(action.letter)
    else insertLetter(action.letter)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const composing = e.nativeEvent.isComposing || e.keyCode === 229
    if (e.key === 'Enter') {
      if (e.repeat || composing) return
      e.preventDefault()
      setTyped(null)
      props.onSubmit()
      return
    }
    if (e.key === 'Escape') {
      setTyped(null)
      return
    }
    const plain = !e.metaKey && !e.ctrlKey && !e.altKey
    const shortcut = plain && !composing ? numberKey(e.key, typed?.letter ?? null) : null
    if (shortcut) {
      e.preventDefault()
      run(shortcut)
      return
    }
    if (e.key.length === 1 && TYPED_VOWELS.has(e.key.toLowerCase()) && plain) {
      const at = (ref.current?.selectionStart ?? props.value.length) + 1
      setTyped({ letter: e.key.toLowerCase(), at })
    } else if ((e.key.length === 1 && !e.metaKey) || /^(Arrow|Home|End|Backspace|Delete|Tab)/.test(e.key)) {
      setTyped(null)
    }
  }

  const onStrip = (e: MouseEvent<HTMLButtonElement>, s: StripKey) => {
    e.preventDefault()
    e.stopPropagation()
    const action = numberKey(s.key, typed?.letter ?? null)
    if (action) run(action)
  }

  const blockPaste = (e: ClipboardEvent) => {
    e.preventDefault()
    props.onPasteBlock?.()
  }

  const at = caret ?? props.value.length
  const swaps = typed ? (VOWEL_VARIANTS[typed.letter] ?? []) : []

  return (
    <div className="roman">
      <div className="roman-line">
        <input
          ref={ref}
          className="roman-field"
          value={props.value}
          disabled={props.disabled}
          placeholder={props.placeholder ?? ''}
          autoCapitalize="off"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          onChange={(e) => props.onChange(e.target.value)}
          onKeyDown={onKeyDown}
          onSelect={remember}
          onBlur={remember}
          onPointerDown={() => setTyped(null)}
          onPaste={blockPaste}
          onDrop={(e) => e.preventDefault()}
        />
      </div>
      <div className="strip">
        {STRIP_GROUPS.map((group) => (
          <span key={group[0]!.key} className="strip-group">
            {group.map((s) => {
              const tone = TONE_MARK_SET.has(s.ch)
              const swap = swaps.includes(s.ch)
              return (
                <button
                  key={s.key}
                  type="button"
                  className={`strip-k${tone ? ' tone' : ''}${swap ? ' swap' : ''}`}
                  aria-keyshortcuts={s.key}
                  disabled={props.disabled}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => onStrip(e, s)}
                >
                  <span className="pop-k">{s.key}</span>
                  <span className="rom">{tone ? tonedVowel(props.value, at, s.ch) : s.label}</span>
                </button>
              )
            })}
          </span>
        ))}
      </div>
    </div>
  )
}
