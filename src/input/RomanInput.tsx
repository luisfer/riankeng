import { useEffect, useRef, useState, type KeyboardEvent, type ClipboardEvent, type MouseEvent } from 'react'
import { DOT_BELOW, POPOVER_TONES, TONE_MARKS, U_BAR, VOWEL_BASES, VOWEL_VARIANTS } from '@content/system'

const TYPED_VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])

const STRIP: Array<{ ch: string; label: string }> = [
  { ch: 'ε', label: 'ε' },
  { ch: 'ɔ', label: 'ɔ' },
  { ch: 'ə', label: 'ə' },
  { ch: U_BAR, label: U_BAR },
  { ch: TONE_MARKS.low, label: 'à' },
  { ch: TONE_MARKS.falling, label: 'â' },
  { ch: TONE_MARKS.high, label: 'á' },
  { ch: TONE_MARKS.rising, label: 'ǎ' },
]

const TONE_MARK_SET = new Set<string>(Object.values(TONE_MARKS))

type Pop =
  | { mode: 'vowel'; base: string; at: number }
  | { mode: 'tone'; letter: string; at: number }

function withTone(letter: string, mark: string): string {
  return (letter.normalize('NFD').replace(/[\u0300\u0301\u0302\u030C]/g, '') + mark).normalize('NFC')
}

type Cluster = { start: number; end: number }

function clampCaret(value: string, caret: number): number {
  if (!Number.isFinite(caret)) return value.length
  return Math.max(0, Math.min(value.length, caret))
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
  if (!cluster) {
    const c = clampCaret(value, caret)
    const glyph = next.normalize('NFC')
    return { value: value.slice(0, c) + glyph + value.slice(c), caret: c + glyph.length }
  }
  const merged = nfd.slice(0, cluster.start) + piece + nfd.slice(cluster.end)
  return { value: merged.normalize('NFC'), caret: caretAfter(merged, cluster.start + piece.length) }
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

/** The syllable the caret is in or just after, else the next one. */
function nucleusAt(nfd: string, pos: number): Cluster | null {
  const all = nuclei(nfd)
  const before = [...all].reverse().find((c) => c.start < pos)
  return before ?? all.find((c) => c.start >= pos) ?? null
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
 * place in the text. With no vowel, insert à/â/á/ǎ there.
 */
export function toneAt(value: string, caret: number, mark: string): { value: string; caret: number } {
  const { nfd, pos } = nfdCaret(value, caret)
  const nucleus = nucleusAt(nfd, pos)
  if (!nucleus) return spliceCluster(value, caret, withTone('a', mark))
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

export function editRoman(value: string, caret: number, ch: string): { value: string; caret: number } {
  if (TONE_MARK_SET.has(ch)) return toneAt(value, caret, ch)
  const c = clampCaret(value, caret)
  return { value: value.slice(0, c) + ch + value.slice(c), caret: c + ch.length }
}

export function RomanInput(props: {
  value: string
  onChange: (v: string) => void
  onSubmit: () => void
  onPasteBlock?: () => void
  disabled?: boolean
  placeholder?: string
  autoFocus?: boolean
}) {
  const ref = useRef<HTMLInputElement>(null)
  const place = useRef<number | null>(null)
  const [pop, setPop] = useState<Pop | null>(null)

  useEffect(() => {
    if (props.autoFocus) ref.current?.focus()
  }, [props.autoFocus, props.disabled])

  useEffect(() => {
    const el = ref.current
    const caret = place.current
    if (!el || caret == null) return
    el.setSelectionRange(caret, caret)
    place.current = null
  }, [props.value])

  const variants = pop?.mode === 'vowel' ? (VOWEL_VARIANTS[pop.base] ?? []) : []

  const read = () => ref.current?.value ?? props.value

  const commit = (value: string, caret: number) => {
    place.current = caret
    props.onChange(value)
    queueMicrotask(() => {
      const el = ref.current
      if (!el || place.current == null || el.value !== value) return
      el.setSelectionRange(caret, caret)
      place.current = null
    })
  }

  const pickTone = (mark: string) => {
    const caret = ref.current?.selectionStart ?? pop?.at ?? props.value.length
    const next = toneAt(read(), caret, mark)
    commit(next.value, next.caret)
    setPop(null)
    ref.current?.focus()
  }

  const pickVariant = (letter: string) => {
    const caret = pop?.mode === 'vowel' ? pop.at : (ref.current?.selectionStart ?? props.value.length)
    const next = replaceVowelAt(read(), caret, letter)
    commit(next.value, next.caret)
    setPop({ mode: 'tone', letter, at: next.caret })
    ref.current?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      if (e.repeat || e.nativeEvent.isComposing || e.keyCode === 229) return
      e.preventDefault()
      setPop(null)
      props.onSubmit()
      return
    }
    if (e.key === 'Escape') {
      setPop(null)
      return
    }
    if (pop && /^[1-9]$/.test(e.key)) {
      const n = Number(e.key)
      if (n >= 1 && n <= 4) {
        e.preventDefault()
        pickTone(POPOVER_TONES[n - 1]!.mark)
        return
      }
      if (pop.mode === 'vowel' && variants[n - 5]) {
        e.preventDefault()
        pickVariant(variants[n - 5]!)
        return
      }
    }
    if (e.key.length === 1 && TYPED_VOWELS.has(e.key.toLowerCase()) && !e.metaKey && !e.ctrlKey && !e.altKey) {
      const caret = ref.current?.selectionStart ?? props.value.length
      setPop({ mode: 'vowel', base: e.key.toLowerCase(), at: caret + 1 })
    } else if ((e.key.length === 1 && !e.metaKey) || /^(Arrow|Home|End|Backspace|Delete|Tab)/.test(e.key)) {
      setPop(null)
    }
  }

  const insert = (ch: string) => {
    const caret = ref.current?.selectionStart ?? props.value.length
    const next = editRoman(read(), caret, ch)
    commit(next.value, next.caret)
    if (ch === 'ε' || ch === 'ɔ' || ch === 'ə' || ch === U_BAR) {
      setPop({ mode: 'tone', letter: ch, at: next.caret })
    }
    ref.current?.focus()
  }

  const onStrip = (e: MouseEvent<HTMLButtonElement>, ch: string) => {
    e.preventDefault()
    e.stopPropagation()
    insert(ch)
  }

  const blockPaste = (e: ClipboardEvent) => {
    e.preventDefault()
    props.onPasteBlock?.()
  }

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
          onPointerDown={() => setPop(null)}
          onPaste={blockPaste}
          onDrop={(e) => e.preventDefault()}
        />
      </div>
      {pop && !props.disabled && (
        <div className="popover" role="listbox">
          {POPOVER_TONES.map((t) => (
            <button
              key={t.key}
              type="button"
              className="pop-opt"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => pickTone(t.mark)}
            >
              <span className="pop-k">{t.key}</span>
              <span className="rom">{withTone(pop.mode === 'tone' ? pop.letter : pop.base, t.mark)}</span>
            </button>
          ))}
          {pop.mode === 'vowel' &&
            variants.map((v, i) => (
              <button
                key={v}
                type="button"
                className="pop-opt"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pickVariant(v)}
              >
                <span className="pop-k">{i + 5}</span>
                <span className="rom">{v.normalize('NFC')}</span>
              </button>
            ))}
        </div>
      )}
      <div className="strip">
        {STRIP.map((s) => (
          <button
            key={s.label}
            type="button"
            className="strip-k"
            disabled={props.disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={(e) => onStrip(e, s.ch)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  )
}
