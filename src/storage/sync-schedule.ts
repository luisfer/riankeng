/**
 * When the course next syncs with the account. Many changes ask for a sync; the earliest asked-for
 * time wins. A burst of answers is one sync, and a request for now, a sitting ended or the tab
 * hiding, is never held back by an earlier request for soon.
 */
export interface Clock {
  now(): number
  setTimeout(fn: () => void, ms: number): unknown
  clearTimeout(id: unknown): void
}

const realClock: Clock = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (id) => clearTimeout(id as ReturnType<typeof setTimeout>),
}

export class SyncScheduler {
  private timer: unknown = null
  private due = Infinity

  constructor(
    private readonly run: () => void,
    private readonly clock: Clock = realClock,
  ) {}

  /** Sync no later than `delayMs` from now. A sync already due sooner stands. */
  request(delayMs: number): void {
    const wait = Math.max(0, delayMs)
    const due = this.clock.now() + wait
    if (this.timer !== null && this.due <= due) return
    if (this.timer !== null) this.clock.clearTimeout(this.timer)
    this.due = due
    this.timer = this.clock.setTimeout(() => {
      this.timer = null
      this.due = Infinity
      this.run()
    }, wait)
  }

  cancel(): void {
    if (this.timer !== null) this.clock.clearTimeout(this.timer)
    this.timer = null
    this.due = Infinity
  }

  get pending(): boolean {
    return this.timer !== null
  }
}
