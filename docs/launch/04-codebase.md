# 04. Codebase gaps and weak points

Agent 4 of 7, Saturday 3 Oct 2026, branch `cursor/claude-agent-briefs-3695` at `1374434` (includes PR #8). Read-only: nothing else changed. Network checks were `curl -sI`, `dig` and the public Supabase settings endpoint only, so vendor limits below come from the settled facts or vendor docs not re-fetched today.

## Verdict

The code is healthy: tests, typecheck, validation and the build pass, and production dependencies have no known vulnerabilities. It cannot yet measure this launch or take money.

- Before the first post: nothing counts a return try, the privacy page denies the analytics production most likely runs, the waitlist promises an email nothing sends, and the hero stays invisible until all landing JS runs.
- Before the first payment: the gate admits any account through one shared cookie that never expires on the server, Auth email cannot reach learners, there are no backups, and the voice clips' licence is unclear.
- P0 is about 10 hours, most of it the event logger.

## 1. Health

| Command | Result, quoted | Notes |
|---|---|---|
| `npm test`, first run | `Test Files  1 failed \| 55 passed (56)`, `Tests  1 failed \| 478 passed (479)` | `FAIL tests/content.test.ts > content > every entry grades itself as exact and its first gloss as correct`, `Error: Test timed out in 5000ms.` Load average 33, other agents testing at once. |
| `npm test`, rerun | `Test Files  56 passed (56)`, `Tests  479 passed (479)` | Load 3.5. The file alone passes in 234 ms. A load flake at `tests/content.test.ts:25`, which grades all 1,638 entries under the default 5 s timeout. |
| `npm run typecheck` | `> tsc -p tsconfig.json --noEmit`, exit 0 | tsc prints nothing on success. |
| `npm run validate` | `content ok` (`voice: 1638  script: 205`) | Also lists 64 English prompts shared by different Voice answers, informational. |
| `npm run build` | `✓ built in 4.43s`, `precache  40 entries (1009.20 KiB)` | `dist/` is gitignored (`.gitignore:3`). |
| `npm audit --omit=dev` | `found 0 vulnerabilities` | Full audit: `3 vulnerabilities (1 low, 2 moderate)`, dev or build-time only: vitest with @vitest/mocker (fix is vitest 5, breaking), serialize-javascript under workbox-build. |

## 2. Ranked gaps

P0: before the first public post. P1: before the first live payment. P2: post-PMF. Hours exclude decisions.

### P0

| # | Gap | Where | Risk | Fix | Hours |
|---|---|---|---|---|---|
| P0-1 | Return tries cannot be counted | Only Vercel Analytics (`src/landing/main.tsx:255`, `src/preview/main.tsx:251`) | The proof is demo use plus returns (`growth.md:11`, `:24`). Vercel forgets visitors after 24 h; custom events need Pro. The first cohort is lost if the logger ships late. | Event logger, section 3. | 6 to 8 |
| P0-2 | Privacy denies analytics; terms say recordings | `privacy.html:47`, `:54`; `<Analytics/>` at `src/landing/main.tsx:255`, `src/preview/main.tsx:251`, `src/ui/App.tsx:479`, `src/gallery/main.tsx:65`; `terms.html:44`, `:53`, `:57` | The site was last modified 30 Sep 21:58 GMT, after PR #8 merged on 29 Sep, so the live notice is most likely wrong now. `PRODUCT.md:20` forbids "recorded". | Add Vercel Web Analytics and the logger (text in section 3); say voice clips; new date; keep `tests/legal.test.ts` green. | 1 |
| P0-3 | Waitlist thanks promises an email nothing sends | `src/landing/copy.ts:7` (settled facts say `:6`), `api/waitlist.ts:3`, `tests/waitlist.test.ts:7` | "One email goes to this address when the course opens." If buying opens this week, the course has opened. | Decision 2: send one personal email from pristinemekong@gmail.com when buying opens, or reword to "Thanks. You are on the list." | 0.25 |
| P0-4 | Hero and first waitlist hidden until all landing JS runs | `src/landing/landing.css:221`, `src/landing/main.tsx:237`, `index.html:80-99`; pinned by `tests/comic.test.ts:155` | Posts open in phone in-app browsers. The h1 and Join wait for about 93 KB gzip of JS (React is 70 KB). A failed chunk leaves a blank first screen; the noscript rule (`index.html:264`) only helps with JS off. Panels have no `src` until JS (`index.html:103`). | Keep the hide, plus a CSS animation that reveals `.comic` after about 2 s without `data-comic`. Ship the first panel's `src` in HTML. | 1 |
| P0-5 | Vercel Hobby forbids commercial use | `growth.md:10` puts prices on the page now | Prices count as advertising a sale. | Vercel Pro before prices show. It also brings Firewall rate limits and longer logs. | 0.25, $20 a month |
| P0-6 | No backup, rate limit or smoke test | No limit in code, though `src/waitlist-join.ts:82` cites one and the client handles 429 (`src/landing/waitlist.ts:61`) | A bad migration loses the 13 addresses. A script without Origin passes the site check by design (`src/waitlist-join.ts:84-92`). | Export the waitlist CSV now and weekly. Add, or confirm, a Firewall rule per IP on POST `/api/waitlist` and `/api/event`. After each deploy: `/learn/` gives 307 to `/?signin` (not `=unset`), sign in, Check a demo card, join with `?ref=smoketest`. | 0.75 |

### P1

| # | Gap | Where | Risk | Fix | Hours |
|---|---|---|---|---|---|
| P1-1 | Gate admits any account through one shared cookie | `src/gate-account.ts:3-20`, `api/gate.ts:8-20`, `src/gate-token.ts:7-10`, `:58-59` | Payers and non-payers get the same access; a refund revokes no one. The cookie is sha256(SITE_PASSWORD) for all; `Max-Age` binds only the browser, so a copied value works until the secret changes. Until 23 Sep SITE_PASSWORD was the shared password typed at the gate (`a51934b`), so anyone who knew it can mint the cookie. | Agent 2: entitlement check in `/api/gate`, per-user signed token (user, plan, expiry). Rotate SITE_PASSWORD to 32 random bytes now. | 6 to 10 (rotation 0.1) |
| P1-2 | Auth email cannot reach learners | `supabase/config.toml:198`, `:235-243`; resets at `src/storage/auth.ts:180-194` to `${origin}/learn/` (`src/landing/main.tsx:181`, `src/ui/Account.tsx:290`) | The default mailer reaches team addresses only, 2 an hour: buyer invites and resets fail silently. A default Site URL sends links to localhost. | Custom SMTP (decision 4). Site URL `https://riangeng.com`, redirect `https://riangeng.com/learn/`. An invite template beside `supabase/templates/recovery.html`, both pasted into the dashboard. | 1.5 |
| P1-3 | Supabase free tier | All tables | Pauses after about a week idle; no automated backups. Entitlements are money records. | Supabase Pro, or a nightly dump. | 0.5, $25 a month |
| P1-4 | Voice clips made with edge-tts | `scripts/gen-audio.py:69-75`; ownership claimed at `terms.html:44` | edge-tts is an unofficial client of Edge's read-aloud service; commercial use of its output is not clearly licensed. Confirm with accountant. | Re-voice the 1,638 clips through Azure AI Speech, same voice `th-TH-PremwadeeNeural`, paid account, a few dollars. | 3 |
| P1-5 | Nobody sees errors | Only `console.error` (`src/waitlist-join.ts:29-31`); Hobby keeps runtime logs about an hour | A failing waitlist or webhook goes unnoticed. | Client errors as an `error` event via `/api/event`; hourly uptime check on `/` and `/api/session`; Stripe webhook failure emails. | 2 to 3 |
| P1-6 | Only HSTS among security headers | `vercel.json:11-16`; `curl -sI` | The Log in form can be framed. | `X-Frame-Options: DENY`, `frame-ancestors 'none'`, `nosniff`, `Referrer-Policy` on `/(.*)`. | 0.5 |
| P1-7 | Logout, and money routes to come, accept cross-site posts | `api/logout.ts:4-14` | Any page can log a learner out; a checkout built alike could be driven from elsewhere. | `refusal()` (`src/waitlist-join.ts:84-92`) on logout, checkout, portal. | 0.5 |
| P1-8 | No terms of sale; Stripe not a processor; "forever" undefined | `terms.html:50`, `:53`; `privacy.html:54` | Needed before a charge. | Agent 2 drafts; wire the page and link; extend `tests/legal.test.ts`. | 0.5 |
| P1-9 | Install from the landing opens a sign-in | `vite.config.ts:107-123` (`start_url: '/learn/'`); the plugin links the manifest from every built page, landing and preview included | An icon installed from a post bounces to `/?signin` (`src/landing/redirect.ts:11`). | Strip the link everywhere but `/learn/` with a `transformIndexHtml` plugin. | 1 |
| P1-10 | No CI | No `.github/`; Vercel runs `tsc` and `vite build` only (`package.json:13`) | Payment code ships with tests unrun. | One GitHub Action for test, typecheck, validate. A 20 s timeout at `tests/content.test.ts:25`. | 0.75 |
| P1-11 | Auth hardening unverified | Local minimum password 6 (`supabase/config.toml:181`) | Weak passwords on paid accounts. | Minimum 8; run the Security Advisor. | 0.25 |

### P2

| # | Gap | Where | Fix, hours |
|---|---|---|---|
| P2-1 | Course bundle is public | `middleware.ts:22` gates `/learn` and `/audio` only; public `/sw.js` names `assets/learn-*.js` (every level) | Fine now. Keep scored items and keys out of the bundle; grade on the server (`code.md:17-18`). With exams. |
| P2-2 | Offline access outlives logout or refund | `vite.config.ts:143-186` (audio cached 180 days), `src/gate-check.ts:12` | Decision 7. 1 |
| P2-3 | No sitemap | `public/robots.txt:1-4` | `sitemap.xml` with `/`, `/preview/`, `/privacy`, `/terms`. 0.25 |
| P2-4 | No CSP; tokens in localStorage | `src/storage/auth.ts:58-76` | `script-src 'self'` plus `/_vercel/insights`. No XSS sink today. 2 |
| P2-5 | Sign-out keeps the refresh token valid | `src/storage/auth.ts:78-80` | `POST /auth/v1/logout`. 0.5 |
| P2-6 | Progress doc uncapped | `supabase/migrations/20260923140000_progress.sql:6` | Size check. 0.25 |
| P2-7 | Account check has no timeout | `src/gate-account.ts:13` | Abort after 5 s. 0.25 |
| P2-8 | Gallery ships to production | `vite.config.ts:216`; a local build adds 46 candidate PNGs, 10 MB (`src/gallery/main.tsx:6`) | Dev only, or gated (decision 9). 0.5 |
| P2-9 | Dev advisories | vitest 3, serialize-javascript | vitest 5, `npm audit fix`. 1 to 2 |
| P2-10 | Unhandled `play()` rejection | `src/preview/main.tsx:28` | Catch, as `src/landing/TryCard.tsx:60` does. 0.1 |
| P2-11 | Honeypot aria-hidden yet focusable | `index.html:58`, `:97`, `:245` | Hidden wrapper. 0.1 |
| P2-12 | Audio gate path variants untested | `src/gate-token.ts:39-41` checks the raw path | Try `//audio/<gated clip>` on production; expect 307. 0.25 |
| P2-13 | Reset requests for any address | `src/storage/auth.ts:180-194` | Auth CAPTCHA once custom SMTP lifts the cap. 0.5 |
| P2-14 | Stale docs | Section 5 | Refresh README, PRODUCT, HANDOFF. 1 |

### Hosted settings and live site

| Item | Status |
|---|---|
| Supabase sign-up | Off: `"disable_signup": true`; email only, `"mailer_autoconfirm": false` (GET `/auth/v1/settings`, 3 Oct) |
| Site URL, redirects, SMTP | Not public. Verify in the dashboard (P1-2). |
| riangeng.com | `HTTP/2 200`, `server: Vercel`, HSTS `max-age=63072000`, `www` 308 to apex |
| DNS | NS `ns1.vercel-dns.com`, `ns2.vercel-dns.com`; no MX; no TXT, so no SPF or DMARC |
| Bundle secrets | Service role key in 0 built files; anon key and URL in 1, as expected |

Accessibility, performance and mobile are otherwise sound: Thai and romanization carry `lang` (`index.html:87-88`), the waitlist note describes its field (`src/landing/waitlist.ts:14-18`), reduced motion is honored (`src/landing/landing.css:680`, `:755`), and the phone keyboard is handled (`src/ui/keyboard-inset.ts:15-57`). P0-4 also hides the h1 from screen readers until JS runs.

## 3. Measurement: the smallest event logger

Vercel counts pages, not people across days. This counts a device that checks a card one day and comes back on a later one.

- **Endpoint.** `api/event.ts` calls `handleEvent()` in a new `src/event-log.ts`, copied from the waitlist pair (`api/waitlist.ts`, `src/waitlist-join.ts:84-130`): `refusal()`, fixed-list validation, a service-role insert with `Prefer: return=minimal`, 204. Body under 1 KB, never logged. Add the route to `gateDev` (`vite.config.ts:26-88`).
- **Client.** `src/landing/events.ts`, for landing and preview. `track(name, page, card?, detail?)` never throws. Device: `crypto.randomUUID()` in localStorage `rk-device`, renewed after 13 months, in memory if storage is off. Day: local `YYYY-MM-DD`, accepted within one day of the server's date. Ref: `currentRef()` (`src/landing/ref.ts:41`), so a return without `?ref=` still credits its first post for 30 days. Sent by `fetch` with `keepalive`.
- **Events** (detail in brackets): `check`; `correct`; `miss` (grader verdict: wrong, tone, length, invalid, `src/engine/grader-thai.ts:28-70`); `hear` (normal or slow); `price_click` (year or forever). Optional: `join` (saved, no address) and `view`.
- **Hooks.** `src/landing/TryCard.tsx:53-61`, `:78-80`; `src/preview/main.tsx:22-29`, `:84-92`; the price buttons once they exist.
- **Limits.** Firewall rule per IP, for example 60 a minute on `/api/event` and 5 on `/api/waitlist`. Cards checked against the lists the gate already bundles (`src/gate-token.ts:29`).
- **Caveat.** In-app browsers keep separate storage, so the count is a lower bound.

Schema, a new migration with the waitlist's grants:

```sql
create table public.events (
  id bigint generated always as identity primary key,
  at timestamptz not null default now(),
  device uuid not null,
  day date not null,
  name text not null check (name in ('check','correct','miss','hear','price_click','join','view','error')),
  page text not null check (page in ('landing','preview','course')),
  ref text check (ref ~ '^[a-z0-9_-]{1,32}$'),
  card text check (char_length(card) <= 64),
  detail text check (detail ~ '^[a-z0-9_.-]{1,24}$')
);
create index events_device_day on public.events (device, day);
create index events_name_day on public.events (name, day);
alter table public.events enable row level security;
revoke all on table public.events from public, anon, authenticated;
grant all on table public.events to service_role;
```

Return tries in the last 7 days by first post (agent 3 names the metrics):

```sql
with d as (
  select device, day, min(ref) as ref from public.events where name = 'check' group by device, day
), f as (
  select device, min(day) as first_day from d group by device
)
select coalesce(d.ref, 'none') as ref, count(*) as return_tries
from d join f using (device)
where d.day > f.first_day and d.day >= current_date - 6
group by 1 order by 2 desc;
```

Delete rows older than 13 months, monthly.

Privacy text for `privacy.html`, in its own style:

- Data: "Demo use. A random number this browser keeps for up to 13 months, the day, the page, the link's tag, and which card was checked, heard, right or missed, or which price was clicked. It does not include the email, the typed answer, or the IP address."
- Line 47, second sentence: "The site uses no advertising cookies and no cookies for analytics. Vercel Web Analytics counts page views without cookies: the page, the referring site, the country, and the browser, system and device type."
- Purposes: "Demo use counts how many people try a card and come back on a later day, which cards are missed, and which price is clicked. It is not joined to a waitlist email."
- Processors and Retention: "Vercel also runs Web Analytics." "Demo use is deleted after 13 months. Clearing the browser's storage ends the random number."
- A stored analytics id may need consent for EU and UK visitors. Confirm with accountant.

Effort: migration 0.5, endpoint and handler 1.5, client and hooks 1.5, tests 1.5, privacy 0.5, Firewall rule and queries 0.5. About 6 hours; plan 6 to 8.

## 4. Security pass

| File | Finding | Severity |
|---|---|---|
| `api/gate.ts` | Any valid session passes (`:8-12`); one static token (`:14`). Not CSRF-able: it needs an `Authorization` header, which a cross-site form cannot send, and a cross-site fetch needs a preflight nothing grants. | High for payments (P1-1) |
| `api/logout.ts` | No site check (`:4-14`); a cross-site form post clears the cookie. | Low (P1-7) |
| `api/session.ts` | One boolean, `no-store` (`:4-10`). | None |
| `api/waitlist.ts`, `src/waitlist-join.ts` | Good: JSON only and site check (`:84-92`), honeypot (`:123-124`), strict email (`:13-19`), tag pattern (`:22-26`), duplicates ignored so no enumeration (`:59`, `:70`), address never logged (`:28-31`). Gap: no rate limit; Origin-less clients pass (`:82`). | Medium (P0-6) |
| `middleware.ts`, `src/gate-token.ts` | Only `/learn` and `/audio` matched (`middleware.ts:22`). Non-constant-time compare of a hash (`src/gate-token.ts:59`), negligible. | Low (P2-1, P2-12) |
| `src/gate-account.ts` | `res.ok` is the whole test (`:16`); no timeout (`:13`). | High for payments (P1-1) |
| `src/gate-check.ts` | Offline, a signed-out browser stays in (`:12`), by design. | Low (P2-2) |
| `src/storage/auth.ts` | Tokens in localStorage, no CSP (`:58-76`); local-only sign-out (`:78-80`); resets for any address (`:180-194`). Good: password change re-checks the current one (`:150-157`); link tokens leave the address bar before analytics loads (`src/landing/main.tsx:23-24`, `src/ui/App.tsx:63-66`). | Low (P2-4, P2-5, P2-13) |
| Migrations | Waitlist: RLS on, no anon or authenticated grants (`20260923110405_waitlist.sql:13-16`). Progress: own-row policies (`20260923140000_progress.sql:16-27`), no size cap. | Low (P2-6) |
| Bundle | No service role key in `dist/`; no `innerHTML` or `dangerouslySetInnerHTML` in `src/`. | None |

## 5. Stale facts

| File:line | Says | Corrected line |
|---|---|---|
| `docs/claude-agents/waitlist-email.md:11` | "The domain has no DNS or MX, and ownership is unverified." | riangeng.com is on Vercel DNS and serves the site over HTTPS. It has no MX and no SPF or DMARC record yet. |
| `waitlist-email.md:12`, `:18` | Revisit domain email "after Luis registers the domain"; "Do not assume the domain is owned." | The domain is registered and controlled through Vercel; check whether Luis or Pristine Mekong is the registrant. Domain email needs MX, SPF, DKIM and DMARC when Luis decides. |
| `docs/claude-agents/README.md:3` | "riian gèng" | rian gèng |
| `code.md:11` | "not only `SITE_PASSWORD`" | Gate `/learn` on paid entitlement, not on any Supabase session plus the shared sha256(SITE_PASSWORD) cookie (`api/gate.ts:8-20`). |
| `code.md:35` | SITE_PASSWORD as "an admin preview bypass" | Nobody types SITE_PASSWORD now; it only seeds the shared cookie. Decide whether a per-user token replaces it. |
| `social.md:10`, `:28` | "solo signup" | No self-serve sign-up: hosted `disable_signup` is true and accounts are invited by hand. |
| `learning.md:11` | "One Voice sitting sits behind the gate." | The whole course is gated. Public: 40 demo cards (`src/landing/demo.ts`), 25 preview words (`src/preview/catalog.ts`). |
| `README.md:5`, `PRODUCT.md:22` | No account; progress only on the device | Progress stays on the device and syncs to the account (`src/storage/account-sync.ts:130-145`). |
| `README.md:9` | "the password in its title panel" | The title panel holds the headline and Join the waitlist; Log in is in the nav (`index.html:60-99`). |
| `README.md:26` | `npx tsx scripts/validate-content.ts` | `npm run validate` |
| `README.md:52`, `PRODUCT.md:11`, `:28` | Gated by a shared `SITE_PASSWORD` | The course opens after an account sign-in; SITE_PASSWORD only seeds the `rk_gate` cookie and must be set. |
| `PRODUCT.md:47` | Pricing absent | $10/year and $20/forever are settled (`money.md:10`). Show only those. |
| `PRODUCT.md:53` | "Nothing leaves it unless the learner exports it." | Progress syncs to the account; the waitlist, link tag and page views leave the device. |
| `HANDOFF.md:15`, `:34`, `:36` | Fake waitlist removed; `api/gate.ts` unchanged; any password passes | A real waitlist writes to Supabase. `/api/gate` opens only for a signed-in account, in dev too (`vite.config.ts:51-56`). |
| `HANDOFF.md:110`, `:114`, `:141`, `:143`, `:144`, `:148` | 30 or 38 demo rows; Slower 0.75; order jasmine first; Voice 27 and Script 28 levels; "recorded clip (1,512 of 1,512)" | 40 demo cards, order tea, mango, door (`src/landing/demo.ts:415`); Slower 0.6 on the landing (`src/landing/TryCard.tsx:130`), 0.7 in the preview (`src/preview/main.tsx:183`); Voice 28, Script 29 levels; 1,638 synthetic clips. |
| `HANDOFF.md:189-202` | Progress unchecked | Shipped. Archive the file. |
| Plan, settled facts | `src/landing/copy.ts:6` | `src/landing/copy.ts:7` |

`growth.md:10` is not stale but not done: no page shows a price yet.

## 6. Stripe touchpoints (no design)

| File | Lines | Change |
|---|---|---|
| `api/gate.ts` | `POST` `:4-24` | Entitlement check; a per-user token instead of `gateToken(secret)`. |
| `src/gate-account.ts` | `accountMayPass` `:3-20` | Return user id and email, not a boolean. |
| `src/gate-token.ts` | `gateToken` `:7-10`, `readCookie` `:12-19`, `decideGate` `:49-61` | Verify a signed token with plan and expiry. |
| `middleware.ts` | `:7-18` | Pass the signing secret instead of SITE_PASSWORD. |
| `api/session.ts` | `GET` `:4-10` | Report entitlement, so the landing shows Open or prices. |
| `api/logout.ts` | `POST` | Site check; clear the new cookie. |
| `vite.config.ts` | `gateDev` `:26-88` | Dev routes for checkout, portal, webhook (Stripe CLI). |
| `src/landing/main.tsx` | submit `:79-136`, `markSignedIn` `:42-57`, `?signin` `:139-144` | No plan shows prices; price buttons start checkout; handle the return. |
| `src/ui/Account.tsx` | `:355-370`, `:529-538` | Plan status; Manage billing for yearly. |
| `src/gate-check.ts` | `leaveIfSignedOut` `:7-23` | Leave on a revoked entitlement. |
| `supabase/migrations/` | new | Entitlements written only by the service role; webhook idempotency. |
| New `api/checkout.ts`, `api/stripe-webhook.ts`, `api/portal.ts` | | Waitlist pattern with `.js` imports (`tests/api-imports.test.ts:21-28`); raw body for the webhook. |
| `privacy.html`, `terms.html`, `.env.example` | | Stripe as processor, terms of sale, the four `STRIPE_*` names (`money.md:17`). |

## 7. Decisions for Luis

1. Vercel Pro now, before prices show (P0-5). Recommended.
2. Waitlist promise: send one email by hand when buying opens, or reword (P0-3).
3. Approve the event logger, its device id and the privacy text (P0-1, P0-2). EU and UK consent: confirm with accountant.
4. Auth email: Gmail SMTP with an app password for pristinemekong@gmail.com (fits `waitlist-email.md:9`), or a provider on riangeng.com, which needs DNS the brief rules out for now (P1-2).
5. Supabase Pro at $25 a month, or a nightly dump (P1-3).
6. Re-voice the clips through Azure AI Speech, or accept the edge-tts risk (P1-4).
7. Offline access after a refund or lapse: accept until the next online open, or enforce (P2-2).
8. Rotate SITE_PASSWORD now; every learner signs in once more (P1-1).
9. `/gallery/` public or dev-only (P2-8).
