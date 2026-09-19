import type { ReactNode } from 'react'

/** Cleared this sitting. Misses re-queue, so remaining is the live rest. */
export function sittingRatio(correct: number, remaining: number): number {
  const denom = correct + remaining
  return denom === 0 ? 0 : correct / denom
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
  const ratio = inSitting ? sittingRatio(props.correct ?? 0, props.remaining ?? 0) : 0
  const cleared = Math.round(ratio * ((props.correct ?? 0) + (props.remaining ?? 0)))

  return (
    <nav className="trail">
      <button type="button" className="wordmark" onClick={props.onHome}>
        <span className="wordmark-th">เรียนเก่ง</span>
        <span className="wordmark-rom">riian gèng</span>
      </button>
      <span className="trail-mid">
        {place && <span className="trail-mid-copy">{place}</span>}
        {inSitting && (
          <span
            className="trail-progress"
            role="progressbar"
            aria-label={`${cleared} cleared, ${props.remaining} remaining`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(ratio * 100)}
          >
            <span className="trail-progress-fill" style={{ transform: `scaleX(${ratio})` }} />
          </span>
        )}
      </span>
      <div className="trail-end">
        {props.onPause && <TextBtn onClick={props.onPause}>Pause</TextBtn>}
        {props.onAccount && !props.onPause && <TextBtn onClick={props.onAccount}>{props.accountLabel || 'Account'}</TextBtn>}
      </div>
    </nav>
  )
}
