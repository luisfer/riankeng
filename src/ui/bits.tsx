import type { ReactNode } from 'react'

/** Cleared this sitting. Misses re-queue, so remaining is the live rest. */
export function sittingRatio(correct: number, remaining: number): number {
  const denom = correct + remaining
  return denom === 0 ? 0 : correct / denom
}

export function lessonRatio(seen: number, total: number): number {
  return total === 0 ? 0 : seen / total
}

/** Begin is only for a level you have not touched. */
export function startLabel(seen: number, canContinue: boolean): 'Begin' | 'Sit again' | 'Begin again' {
  if (canContinue) return 'Begin again'
  return seen > 0 ? 'Sit again' : 'Begin'
}

/** Lesson pie when the level has a total. Sitting pie only on review (no total). */
export function trailPie(args: {
  lessonSeen?: number
  lessonTotal?: number
  remaining?: number
  correct?: number
}): { kind: 'lesson' | 'sitting'; value: number; label: string } | null {
  const lessonN = args.lessonTotal ?? 0
  const seen = args.lessonSeen ?? 0
  const inSitting = args.remaining !== undefined
  if (lessonN > 0) {
    return {
      kind: 'lesson',
      value: lessonRatio(seen, lessonN),
      label: `${seen} of ${lessonN} in this lesson`,
    }
  }
  if (inSitting) {
    const sitRatio = sittingRatio(args.correct ?? 0, args.remaining ?? 0)
    const cleared = Math.round(sitRatio * ((args.correct ?? 0) + (args.remaining ?? 0)))
    return {
      kind: 'sitting',
      value: sitRatio,
      label: `${cleared} cleared, ${args.remaining} remaining`,
    }
  }
  return null
}

export function QuietPie(props: { value: number; label: string }) {
  const pct = Math.round(Math.min(1, Math.max(0, props.value)) * 100)
  return (
    <span
      className="quiet-pie"
      role="progressbar"
      aria-label={props.label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      style={{ ['--p' as string]: String(pct) }}
    />
  )
}

export function Commit({
  children,
  onClick,
  disabled,
  type = 'button',
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  type?: 'button' | 'submit'
}) {
  return (
    <button type={type} className="btn commit" onClick={onClick} disabled={disabled}>
      {children}
    </button>
  )
}

export function TextBtn({
  children,
  onClick,
  disabled,
  current,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  current?: boolean
}) {
  return (
    <button type="button" className={current ? 'text-btn current' : 'text-btn'} onClick={onClick} disabled={disabled} aria-current={current || undefined}>
      {children}
    </button>
  )
}

export function Trail(props: {
  onHome: () => void
  accountLabel?: string
  onAccount?: () => void
  track?: 'voice' | 'script'
  level?: number
  remaining?: number
  correct?: number
  lessonSeen?: number
  lessonTotal?: number
  onPause?: () => void
  place?: string
}) {
  const place =
    props.place ??
    [
      props.track === 'script' ? 'Script' : props.track === 'voice' ? 'Voice' : '',
      props.level !== undefined ? `Level ${props.level}` : '',
    ]
      .filter(Boolean)
      .join(', ')
  const inSitting = props.remaining !== undefined
  const pie = trailPie({
    lessonSeen: props.lessonSeen,
    lessonTotal: props.lessonTotal,
    remaining: props.remaining,
    correct: props.correct,
  })

  return (
    <nav className="trail">
      <button type="button" className="wordmark" onClick={props.onHome}>
        <span className="wordmark-th">เรียนเก่ง</span>
        <span className="wordmark-rom">riian gèng</span>
      </button>
      <span className="trail-mid">
        {place && <span className="trail-mid-copy">{place}</span>}
        {pie && <QuietPie value={pie.value} label={pie.label} />}
        {inSitting && <span className="trail-left">{props.remaining} left</span>}
      </span>
      <div className="trail-end">
        {props.onPause && <TextBtn onClick={props.onPause}>Pause</TextBtn>}
        {props.onAccount && !props.onPause && <TextBtn onClick={props.onAccount}>{props.accountLabel || 'Account'}</TextBtn>}
      </div>
    </nav>
  )
}
