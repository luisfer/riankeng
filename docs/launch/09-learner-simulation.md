# 09. A learner through the whole course

Sat 3 Oct 2026. A simulated learner did every lesson, logged out, logged in, and opened the course on a browser that had never seen it. This page says what was checked, what broke, and what is still open.

## Verdict

- **Progress is saved and comes back.** The learner finished all 28 Voice and 29 Script levels: 1,843 cards, every one mastered, 16,715 answers kept, over 107 days at three visits a day. After logging out and in, and after opening the course on a new browser, every card, sitting and opened level was exactly as it was left. The result is the same on an in-memory Supabase and on the real project.
- **It found three problems. All are fixed, with tests.**
  1. A new device reset the learner's settings to the defaults, and wrote those defaults over the account's copy.
  2. Every answer cost about 14 ms, and every screen update about 13 ms more, because the course recomputed every level from scratch. Now about 0.2 ms each.
  3. Every answer sent and fetched the whole progress document, up to 1.7 MB each way, and every sync re-sent it even when nothing had changed. Now a sync per sitting, and 48 bytes when nothing moved: **15.8 times less** over a whole course. This is the first half of the plan in [10-progress-storage.md](10-progress-storage.md), which also answers why progress is on the device at all.
- **The two migrations are applied to the real project and checked.**

## The migrations

`supabase db push` applied `20261003120000_events.sql` and `20261003120100_waitlist_attribution.sql` to the linked project. A dry run listed exactly those two first. Both only add: one table and seven empty columns.

Thirteen checks ran against the live database, all passing, and every test row was deleted afterwards:

| Check | Result |
|---|---|
| `events` exists with every column | yes |
| `waitlist` has the seven new columns | yes |
| The public anon key cannot read or write `events` | refused, status 401 |
| The anon key still cannot read the waitlist | refused, status 401 |
| One event sent through the site's own server code is stored and reads back with every mark: ref, five utm tags, referrer, landing page, typed text | yes |
| One waitlist sign-up with all its marks is stored and reads back | yes |
| Waitlist count before and after | 13 and 13 |

## What the simulation does

It signs a learner in through the gate, sits the course day by day, and after each step asks whether what the learner did is still there, exactly.

| Step | What is checked |
|---|---|
| Sign in | A wrong password is refused. The right one gives a session. The gate's cookie opens `/learn/`, a visitor with none is sent to sign in, `/api/session` answers in and out, the course's audio is gated and the landing's clips are public |
| A sitting left halfway | It reads back as it was, and Continue is offered |
| The whole course | Every level of both tracks complete. The device's copy and the account's copy equal what the learner has |
| Log out | The cookie is cleared, no session is left, the cards stay on the device |
| Log in again | The course opens with every card and the same Continue. Sync reports saved |
| A new device | A browser with empty storage signs in and gets back every card, sitting, opened level and setting |
| A month later | The learner reviews what is due on the new device, and the account holds both devices' work |
| Two devices at once | Each is used while the other has no signal. Both then sync, one after the other. They end with exactly the same work, the account holds it, no answer from either is missing, and the second device sends nothing |
| Tokens that run out | An expired access token is refreshed and the sync still saves. A refresh token the server refuses ends the session and leaves the cards alone |
| A second account | It never receives the first learner's cards. The first learner gets every card back on signing in again |
| A dropped connection | Sync reports failed, the cards stay, and the next sync sends all of it (in-memory run only) |

**How it plays.** The course's own functions do the work, in the order the sitting screen and the app call them: meet a card, test it, record the attempt, hold a typed miss for a retype, requeue, log the sitting, save to the device, and sync to the account after each sitting, as the app does. Only the typing is stood in for, by choosing what a learner who knew the card would type. About 12% of cards are missed on their first try, in every exercise type, and a few of those again at once.

**Time.** `Date.now()` is faked, so every stamp the course writes agrees with the simulated day. The learner visits at 09:00, 14:30 and 20:00.

**The real project.** A throwaway learner and a second throwaway learner are made with the service role, use the real sign-in and the real progress table, and are deleted at the end along with their progress rows. The project's counts were identical before and after: 13 waitlist sign-ups, 1 progress row, 1 account, 0 events.

## Results

| | In-memory Supabase | The real project |
|---|---|---|
| Days, visits, sittings | 107, 322, 1,278 | 107, 321, 1,277 |
| Cards met and mastered | 1,843 and 1,843 | 1,843 and 1,843 |
| Answers kept | 16,715 | 16,715 |
| Progress document at the end | 1,662 KB | 1,662 KB |
| Copy in localStorage | 1,654 KB | 1,654 KB |
| When it syncs | after every sitting | every 7 days, to keep the real project's load down |
| Checks | 76 pass, 0 fail, no findings | 73 pass, 0 fail, no findings |
| Uploads of the document | 1,280, 962 MB | 20, 19.7 MB |
| Whole documents read back | 1,286, 967 MB | 24, 27.8 MB, which was **4.5 MB on the wire** |
| Small questions (when was the row written) | 6 | 3 |
| Merged copies the app had to re-adopt | 2 | |
| Time | 105 s | 33 s |

For comparison, syncing after every look and every answer, which is what the app did, would have sent and read back **15,186 MB each way** over the same course. That is 15.8 times what it sends now.

The real project ran 3 fewer checks because the dropped-connection step needs a connection that can be cut. Its token refreshes are high because the test's clock runs ahead of the server's, so a fresh token always looks expired to the client. That is the test, not the app.

A finished course fits a browser's storage: 1.7 MB against a limit of about 5 MB.

## Found and fixed

### 1. A new device reset the learner's settings

**What happened.** The learner had set audio rate 0.9, autoplay off, 10 new cards a sitting, Thai script on and the name "Luis Sim". On a browser with empty storage, signing in brought back all the progress and none of that: the defaults came back (0.85, on, 8, off), and the name was replaced by the account's display name. The new browser then uploaded those defaults, so the account's own copy was overwritten, and the next sync on the old device took the defaults too.

**Why.** `mergeAccount` lets settings follow "whichever copy was written later". A new browser's empty document is stamped with the moment it was made, which is later than anything the account holds, so it won the merge.

**Who it hits.** Anyone who signs in on a second device, or after "Erase this device", or after the browser cleared its storage. iPhone Safari can clear a site's storage after about a week without a visit, except for apps added to the Home Screen. Progress was never affected.

**The fix.** In `src/storage/account-sync.ts`, a document that holds no cards, no sittings and only default settings has no say in the settings. Three tests: two fail on the old behavior, and they pass now.

### 2. Every answer cost 14 ms, every screen update 13 ms more

**Measured** on a fast laptop with a finished course:

| | Before | After |
|---|---|---|
| `stampOpened`, on every answer | 14 to 16 ms | 0.18 ms |
| Voice level statuses, on every screen update | 7 ms | 0.23 ms |
| Script level statuses, on every screen update | 5.7 ms | 0.02 ms |

A phone is commonly several times slower than a laptop, so the old cost would have been a visible stall each time a learner pressed Check or Next. It also made the simulation slow: its first 8 days took 54 seconds before the fix and 1 second after.

**Why.** `levelStatus` asked for the level below, which asked for the one below that, so each sweep of the 28 Voice levels did about 400 scans, and each scan filtered all 1,843 entries.

**The fix.** `content/index.ts` builds each level's card list once and freezes it. `src/engine/scheduler.ts` splits the per-level counts from the recursive "is this level open" check, which the two hot paths never read. The answers are unchanged, and all the existing tests pass.

Still computed on every screen update: `reviewEntries`, 3.5 to 13 ms, because it sorts with `localeCompare`. Left alone.

### 3. Every answer moved the whole progress document

**What happened.** Each look and each answer changed the document, and the app synced 400 ms later: a full download and a full upload, up to 1.7 MB each way. Even when nothing had changed, a sync re-uploaded it. Syncing after every card would have moved 15,186 MB each way over one course.

**Why the idle uploads.** Postgres stores `jsonb` with its keys in a different order than the app wrote them, and the app compared documents as JSON text, so a document that had been to the database never looked equal to itself. That also made the app re-adopt a merged copy after 110 of 113 syncs. It reproduced on the real project.

**The fix.** See [10-progress-storage.md](10-progress-storage.md) for the design and the numbers.
- The sanitizer writes every document in one canonical shape, so the same cards are the same text.
- A sync runs when a sitting ends, when the tab hides, when the network returns, after a failed try, and a moment after a change outside a sitting. During a sitting it runs at most every 3 minutes, as a safety net.
- After a finished sync the browser remembers when the account's row was written and a digest of its own cards. If neither has moved, the next sync asks one 48-byte question and stops.
- When the merge shows the account already holds everything, nothing is uploaded.

**It cannot lose work.** The 48-byte skip needs both the account's timestamp and the browser's cards to match the last finished sync exactly. A document that was erased, replaced or rolled back never matches, so it takes the long way and merges. Tests cover each case, and the two-devices step runs it on the real database.

**Measured.** 15.8 times less over a whole course, in memory. 2 re-adopted copies instead of 110. A sync with nothing to do moves no document on the real project.

## Found, not fixed

The rest of the storage plan, one record per card on the account and on the device, is in [10-progress-storage.md](10-progress-storage.md). It is a design, not a defect: each sitting still sends the whole document, up to 1.7 MB late in the course, and each answer still rewrites it on the device, about 21 ms in Chrome on this laptop.

### 1. Logging out does not end a copied cookie

Already listed as P1 in `04-codebase.md`. The `rk_gate` cookie is the same for every learner and stateless, so logging out clears it only in that browser. The paid build replaces it with a per-learner signed cookie.

## What this does not cover

- **The screens.** The simulation calls the functions the screens call, with a stand-in for typing. It does not drive the real input, the page turns or the key strip. The existing tests cover those separately.
- **A deployed gate.** The gate handlers and `decideGate` run in-process. The Vercel edge middleware and a real cookie in a real browser are only exercised once the site is redeployed.
- **Offline and several tabs.** The service worker, the PWA cache, two tabs open at once in one browser, and real IndexedDB quota or eviction are not exercised. Two devices are. IndexedDB is a map that clones what it stores, as a real one does.
- **Email.** Invite and reset links are not covered.
- **Later slips.** Misses happen only on a card's first tries, so a card that is mastered and then forgotten is exercised less. The review rules for that are covered by unit tests.

## Run it

| Command | What it does |
|---|---|
| `npm test` | Includes a short version, the first levels of both tracks, in about 2 seconds |
| `npm run simulate` | The whole course against the in-memory Supabase, with a sync after every sitting, about 2 minutes. `SIM_TRAFFIC=1` also totals what syncing after every card would have moved. `SIM_SYNC=7` syncs every 7 days instead, which is quicker |
| `npm run simulate:live` | The whole course against the real project with throwaway learners, about half a minute. It syncs every 7 days unless `SIM_SYNC=sitting`, which sends about a gigabyte to the project. Needs the three Supabase values in `.env.local` |

The code is in `tests/support/` (`learner.ts` plays the learner, `journey.ts` holds the story and the checks, `backend.ts` the two backends, `fake-supabase.ts` the in-memory one) and the two entry points are `tests/learner-journey.test.ts` and `tests/learner-full-course.test.ts`.
