import { describe, expect, it, vi } from 'vitest'
import { fakeBackend } from './support/backend'
import { failures, formatReport, runJourney } from './support/journey'

vi.mock('idb-keyval', async () => await import('./support/idb-mock'))

/*
 * The first lessons of both tracks, start to finish, against an in-memory Supabase: the sign-in and
 * the gate, a sitting left halfway, logging out and in, a browser that has never seen the course, a
 * token that runs out, a second account on the same browser, a dropped connection. The whole course
 * runs the same story with `npm run simulate`, and against the real project with `npm run simulate:live`.
 */
describe('a learner through the first lessons', () => {
  it('keeps every card across logging out, logging in, a new device and a dropped connection', async () => {
    const report = await runJourney(fakeBackend(), { scope: { voice: 2, script: 1 }, syncEvery: 'sitting' })
    // The report prints when something failed, or on request: SIM_REPORT=1 npx vitest run tests/learner-journey.test.ts
    if (process.env.SIM_REPORT || failures(report).length) console.log(`\n${formatReport(report)}\n`)
    expect(failures(report)).toEqual([])
  }, 180_000)
})
