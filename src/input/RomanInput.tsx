import { useEffect, useRef, useState, type KeyboardEvent, type ClipboardEvent, type MouseEvent } from 'react'
import { DOT_BELOW, POPOVER_TONES, TONE_MARKS, VOWEL_BASES, VOWEL_VARIANTS } from '@content/system'

const TYPED_VOWELS = new Set(['a', 'e', 'i', 'o', 'u'])

const STRIP: Array<{ ch: string; label: string }> = [
  { ch: 'ε', label: 'ε' },
  { ch: 'ɔ', label: 'ɔ' },
  { ch: 'ə', label: 'ə' },
  { ch: 'ụ', label: 'ụ' },
  { ch: TONE_MARKS.low, label: 'à' },
  { ch: TONE_MARKS.falling, label: 'â' },
  { ch: TONE_MARKS.high, label: 'á' },
  { ch: TONE_MARKS.rising, label: 'ǎ' },
]

const TONE_MARK_SET = new Set<string>(Object.values(TONE_MARKS))

type Pop =
  | { mode: 'vowel'; base: string }
  | { mode: 'tone'; letter: string }

function withTone(letter: string, mark: string): string {
  return (letter.normalize('NFD').replace(/[\u0300\u0301\u0302\u030C]/g, '') + mark).normalize('NFC')
}

function lastVowelIndex(value: string): number {
  const nfd = value.normalize('NFD')
  for (let i = nfd.length - 1; i >= 0; i--) {
    if (VOWEL_BASES.has(nfd[i]!)) return i
  }
  return -1
}

function replaceLastVowel(value: string, next: string): string {
  const nfd = value.normalize('NFD')
  const i = lastVowelIndex(value)
  if (i < 0) return value + next
  let end = i + 1
  while (end < nfd.length && (nfd[end] === DOT_BELOW || TONE_MARK_SET.has(nfd[end]!))) {
    end++
  }
  return (nfd.slice(0, i) + next.normalize('NFD') + nfd.slice(end)).normalize('NFC')
}

/** Strip key: special vowels append; tone marks attach to the last vowel, or insert à/â/á/ǎ when there is none. */
export function applyStripKey(value: string, ch: string): string {
  if (TONE_MARK_SET.has(ch)) {
    const i = lastVowelIndex(value)
    if (i < 0) return value + withTone('a', ch)
    const nfd = value.normalize('NFD')
    let letter = nfd[i]!
    if (nfd[i + 1] === DOT_BELOW) letter += DOT_BELOW
    return replaceLastVowel(value, withTone(letter, ch))
  }
  return value + ch
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
  const [pop, setPop] = useState<Pop | null>(null)

  useEffect(() => {
    if (props.autoFocus) ref.current?.focus()
  }, [props.autoFocus, props.disabled])

  const variants = pop?.mode === 'vowel' ? (VOWEL_VARIANTS[pop.base] ?? []) : []

  const pickTone = (mark: string) => {
    const letter = pop?.mode === 'tone' ? pop.letter : pop?.mode === 'vowel' ? pop.base : 'a'
    props.onChange(replaceLastVowel(props.value, withTone(letter, mark)))
    setPop(null)
    ref.current?.focus()
  }

  const pickVariant = (letter: string) => {
    props.onChange(replaceLastVowel(props.value, letter.normalize('NFC')))
    setPop({ mode: 'tone', letter })
    ref.current?.focus()
  }

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
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
      setPop({ mode: 'vowel', base: e.key.toLowerCase() })
    } else if (e.key.length === 1 && !e.metaKey) {
      setPop(null)
    }
  }

  const insert = (ch: string) => {
    props.onChange(applyStripKey(props.value, ch))
    if (ch === 'ε' || ch === 'ɔ' || ch === 'ə' || ch === 'ụ') {
      setPop({ mode: 'tone', letter: ch === 'ụ' ? 'u' + DOT_BELOW : ch })
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
          onPaste={blockPaste}
          onDrop={(e) => e.preventDefault()}
        />
      </div>
      {pop && !props.disabled && (
        <div className="popover" role="listbox">
          {POPOVER_TONES.map((t) => (
            <button key={t.key} type="button" className="pop-opt" onClick={() => pickTone(t.mark)}>
              <span className="pop-k">{t.key}</span>
              <span className="rom">{withTone(pop.mode === 'tone' ? pop.letter : pop.base, t.mark)}</span>
            </button>
          ))}
          {pop.mode === 'vowel' &&
            variants.map((v, i) => (
              <button key={v} type="button" className="pop-opt" onClick={() => pickVariant(v)}>
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
