/**
 * The fortnight in numbers, from the live tables: the demo's visits, tries, engaged tries and return
 * tries by the post that brought them, the waitlist by the link it came from, the counting choice,
 * and the cards most missed. Aggregates only, never an address. Reads SUPABASE_URL and
 * SUPABASE_SERVICE_ROLE_KEY from .env.local (or the environment) and never prints them.
 *
 *   npm run numbers          the last 14 days
 *   npm run numbers -- 7     the last 7
 *
 * Definitions (docs/launch/03-growth.md, section 5):
 *   try          a visit with at least one Check
 *   engaged      a visit with 3 or more Checks
 *   return try   a browser that allowed counting and checked a card again on a later day,
 *                within 7 days of its first, counted once
 */
import { existsSync, readFileSync } from 'node:fs'

const DAY = 86_400_000

function loadEnv(): { url: string; key: string } {
  const vars: Record<string, string> = {}
  if (existsSync('.env.local')) {
    for (const line of readFileSync('.env.local', 'utf-8').split('\n')) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line)
      if (m) vars[m[1]!] = m[2]!.replace(/^["']|["']$/g, '')
    }
  }
  const url = (process.env.SUPABASE_URL || vars.SUPABASE_URL || '').trim().replace(/\/$/, '')
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || vars.SUPABASE_SERVICE_ROLE_KEY || '').trim()
  if (!url || !key) {
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.')
    process.exit(1)
  }
  return { url, key }
}

/** Every row of a query, a thousand at a time. null when the table or a column is not there yet. */
async function rows<T>(url: string, key: string, path: string): Promise<T[] | null> {
  const out: T[] = []
  for (let from = 0; ; from += 1000) {
    const res = await fetch(`${url}/rest/v1/${path}`, {
      headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + 999}`, 'Range-Unit': 'items' },
    })
    if (res.status === 404 || res.status === 400) return null
    if (!res.ok && res.status !== 206) throw new Error(`Supabase answered ${res.status} for ${path.split('?')[0]}`)
    const page = (await res.json()) as T[]
    out.push(...page)
    if (page.length < 1000) return out
  }
}

type Event = {
  at: string
  day: string
  name: string
  page: string
  visit: string
  device: string | null
  card: string | null
  detail: string | null
  typed: string | null
  ref: string | null
  utm_source: string | null
  referrer: string | null
}
type Signup = { created_at: string; source: string | null; utm_source?: string | null; referrer?: string | null }

/** The post a row is credited to: our tag, else the utm source, else the site that linked here. */
function channel(r: { ref?: string | null; source?: string | null; utm_source?: string | null; referrer?: string | null }): string {
  return r.ref ?? r.source ?? r.utm_source ?? (r.referrer ? `site:${r.referrer}` : 'none')
}

function table(head: string[], body: (string | number)[][]): void {
  const width = head.map((h, i) => Math.max(h.length, ...body.map((row) => String(row[i]).length)))
  const line = (cells: (string | number)[]) => cells.map((c, i) => (i === 0 ? String(c).padEnd(width[i]!) : String(c).padStart(width[i]!))).join('  ')
  console.log(line(head))
  console.log(width.map((w) => '-'.repeat(w)).join('  '))
  for (const row of body) console.log(line(row))
}

function count<T>(items: T[], by: (t: T) => string): [string, number][] {
  const m = new Map<string, number>()
  for (const item of items) m.set(by(item), (m.get(by(item)) ?? 0) + 1)
  return [...m].sort((a, b) => b[1] - a[1])
}

async function main(): Promise<void> {
  const { url, key } = loadEnv()
  const days = Math.max(1, Number(process.argv[2]) || 14)
  const since = new Date(Date.now() - days * DAY).toISOString()
  const today = new Date().toISOString().slice(0, 10)
  console.log(`rian gèng, the last ${days} days to ${today}\n`)

  const events = await rows<Event>(
    url,
    key,
    `events?select=at,day,name,page,visit,device,card,detail,typed,ref,utm_source,referrer&at=gte.${encodeURIComponent(since)}&order=at`,
  )
  if (!events) {
    console.log('No events table yet. Run supabase/migrations/20261003120000_events.sql.\n')
  } else {
    // Each visit and each counted browser is credited to the post of its first event.
    const visitChannel = new Map<string, string>()
    for (const e of events) if (!visitChannel.has(e.visit)) visitChannel.set(e.visit, channel(e))
    const checksByVisit = new Map<string, number>()
    for (const e of events) if (e.name === 'check') checksByVisit.set(e.visit, (checksByVisit.get(e.visit) ?? 0) + 1)
    const viewed = new Set(events.filter((e) => e.name === 'view').map((e) => e.visit))

    const deviceFirst = new Map<string, { day: string; channel: string }>()
    const deviceDays = new Map<string, Set<string>>()
    for (const e of events) {
      if (e.name !== 'check' || !e.device) continue
      if (!deviceFirst.has(e.device)) deviceFirst.set(e.device, { day: e.day, channel: channel(e) })
      const set = deviceDays.get(e.device) ?? new Set<string>()
      set.add(e.day)
      deviceDays.set(e.device, set)
    }
    const returned = new Map<string, string>() // device -> its return day
    for (const [device, first] of deviceFirst) {
      const t0 = Date.parse(first.day)
      const later = [...deviceDays.get(device)!].filter((d) => Date.parse(d) > t0 && Date.parse(d) - t0 <= 7 * DAY).sort()
      if (later.length) returned.set(device, later[0]!)
    }

    const channels = [...new Set(visitChannel.values())]
    const rowsOut = channels.map((ch) => {
      const visits = [...visitChannel].filter(([, c]) => c === ch).map(([v]) => v)
      const tries = visits.filter((v) => (checksByVisit.get(v) ?? 0) >= 1).length
      const engaged = visits.filter((v) => (checksByVisit.get(v) ?? 0) >= 3).length
      const devices = [...deviceFirst].filter(([, f]) => f.channel === ch).map(([d]) => d)
      const returns = devices.filter((d) => returned.has(d)).length
      const joins = events.filter((e) => e.name === 'join' && visits.includes(e.visit)).length
      const previews = events.filter((e) => e.name === 'cta' && e.detail === 'preview' && visits.includes(e.visit)).length
      const done = events.filter((e) => e.name === 'done' && visits.includes(e.visit)).length
      return [ch, visits.filter((v) => viewed.has(v)).length, tries, engaged, devices.length, returns, previews, done, joins]
    })
    rowsOut.sort((a, b) => Number(b[1]) - Number(a[1]))
    console.log('The demo and the preview, by post')
    table(['post', 'visits', 'tries', 'engaged', 'counted', 'returns', 'to preview', 'preview done', 'joined'], rowsOut)

    const weekAgo = Date.now() - 7 * DAY
    const recent = [...returned.values()].filter((d) => Date.parse(d) >= weekAgo).length
    console.log(`\nReturn tries in the last 7 days: ${recent} of the 10 the brief asks for.`)
    console.log('Counted browsers are only those that allowed counting, so returns are a lower bound.')

    const consent = count(events.filter((e) => e.name === 'consent'), (e) => e.detail ?? '?')
    console.log(`Counting choice: ${consent.map(([k, n]) => `${k} ${n}`).join(', ') || 'none asked yet'}\n`)

    const misses = events.filter((e) => e.name === 'check' && e.detail && e.detail !== 'exact' && e.detail !== 'empty')
    if (misses.length) {
      console.log('Cards most missed')
      table(['card', 'misses', 'tone', 'length', 'wrong'], count(misses, (e) => e.card ?? '?').slice(0, 10).map(([card, n]) => [
        card,
        n,
        misses.filter((e) => e.card === card && e.detail === 'tone').length,
        misses.filter((e) => e.card === card && e.detail === 'length').length,
        misses.filter((e) => e.card === card && e.detail === 'wrong').length,
      ]))
      const typed = count(misses.filter((e) => e.typed), (e) => `${e.card}: ${e.typed}`).slice(0, 10)
      if (typed.length) {
        console.log('\nWhat was typed most often on a miss')
        for (const [line, n] of typed) console.log(`  ${n}  ${line}`)
      }
      console.log('')
    }
  }

  const signups =
    (await rows<Signup>(url, key, `waitlist?select=created_at,source,utm_source,referrer&order=created_at`)) ??
    (await rows<Signup>(url, key, `waitlist?select=created_at,source&order=created_at`))
  if (signups) {
    const inWindow = signups.filter((s) => s.created_at >= since)
    console.log(`Waitlist: ${signups.length} in all, ${inWindow.length} in these ${days} days`)
    table(['post', 'all', 'these days'], count(signups, (s) => channel(s)).map(([ch, n]) => [ch, n, inWindow.filter((s) => channel(s) === ch).length]))
  }
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : 'Could not read the numbers.')
  process.exit(1)
})
