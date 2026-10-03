import { describe, expect, it, vi } from 'vitest'
import { levelsFor } from '@content/index'
import { fakeBackend, liveBackend, liveSettings } from './support/backend'
import { failures, formatReport, runJourney } from './support/journey'

vi.mock('idb-keyval', async () => await import('./support/idb-mock'))

/*
 * Every lesson of both tracks, then the same story as learner-journey.test.ts.
 *
 *   npm run simulate        against an in-memory Supabase, about a minute
 *   npm run simulate:live   against the real project: a throwaway learner is made with the service
 *                           role, does the course, and is removed again with their progress
 *
 * Skipped in `npm test`.
 */
const mode = process.env.E2E

describe.skipIf(!mode)('a learner through the whole course', () => {
  it(
    mode === 'live' ? 'finishes it on the real project' : 'finishes it on an in-memory project',
    async () => {
      const settings = mode === 'live' ? liveSettings() : null
      if (mode === 'live' && !settings) throw new Error('simulate:live needs SUPABASE_URL, VITE_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY in .env.local')
      const backend = settings ? liveBackend(settings) : fakeBackend()
      const report = await runJourney(backend, {
        scope: { voice: levelsFor('voice').length, script: levelsFor('script').length },
        // The app syncs when a sitting ends. Against the real project, once a week of use is plenty to test with.
        syncEvery: process.env.SIM_SYNC ? (process.env.SIM_SYNC === 'sitting' ? 'sitting' : Number(process.env.SIM_SYNC)) : mode === 'live' ? 7 : 'sitting',
        trackSize: Boolean(process.env.SIM_TRAFFIC),
        log: (line) => console.log(line),
      })
      console.log(`\n${formatReport(report)}\n`)
      expect(failures(report)).toEqual([])
    },
    45 * 60_000,
  )
})
