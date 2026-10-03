# 10. Where progress lives, what it costs, and the plan

Sat 3 Oct 2026. Luis asked why progress is still stored on the device, and said that efficiency matters because there will be many learners. This page answers the first, measures the second, and says what is done and what is next.

## Verdict

- **Keep a copy on the device, but it should be a cache and an outbox, not the home of the data.** The account is the source of truth. Both sides should move only what changed.
- **The device copy is not the problem. Writing the whole document every time is.** It made every answer cost a full download and a full upload, and a full rewrite of the device's storage.
- **Done this round:** sync after each sitting instead of after each card, an idle sync that costs 48 bytes, and no more re-sending what the account already holds. About **15 times less traffic**, measured over a whole course on the in-memory backend and on the real project.
- **Not done, and worth doing before launch if there is time:** store one row per card on the account and one record per card on the device, so each answer moves about a kilobyte. By the end of a course that is about 100 times less again. The plan is below.

## Why progress is on the device at all

| Reason | Why it holds |
|---|---|
| **Every answer has to feel instant** | A learner answers every 10 to 20 seconds. A network round trip per answer, 100 to 400 ms on a phone and sometimes failing, would make the course feel slow and unreliable. |
| **The course works offline** | It is an installable app that opens without a network, and its words and clips are cached (`README.md`, `PRODUCT.md`, `vite.config.ts`). Answers have to be written somewhere when there is no signal. The settings even include a silent mode "for a plane". |
| **It holds what has not been sent yet** | The learner can close the tab, lose signal or run out of battery between syncs. A browser cannot reliably send a 1.7 MB request while a page closes: requests allowed to outlive the page are limited to 64 KB. So the device keeps the unsent answers until the next sync. Any efficient design needs this. |
| **Opening the course should not wait** | The cards load from the device, then sync in the background. |
| **The free pieces have no account** | The preview's 25 words and the landing card keep their place on the device, by design. |

**What is left over.** `README.md` says "No account. Progress lives in IndexedDB" and `PRODUCT.md` principle 3 says "The device owns the work. Nothing leaves it unless the learner exports it." Both come from before accounts. The whole course now sits behind a sign-in, so every learner has an account, and the device is no longer where their work lives for good. Two copies also mean merge rules, and this week's settings bug (09) came from exactly that. `PRODUCT.md` should say the device keeps the working copy and the account keeps the safe one.

**Why not account only.** Every answer would wait for the network, or be queued, and a queue is a device store again. It would lose the offline course and the instant feel. Not recommended.

## What it cost

Measured on the finished course, 1,843 cards.

| | |
|---|---|
| Document on the device | about 1.7 MB. Answer history is 68% of it, then card state, then sittings |
| The account's row, as sent back | 1.9 MB, which is **218 KB on the wire**, because the API compresses it (8.9 times, measured on the real project) |
| Asking only when the row was last written | **48 bytes** on the wire |
| Writing the document to the device on one answer | about **21 ms** of the browser's main thread, in Chrome on this laptop: 4.8 ms to serialize, 4.2 ms for the localStorage copy, 12.1 ms to clone it for IndexedDB. Writing one card costs nothing measurable. Not measured on a phone, which is commonly several times slower |
| Each answer before this round | one full download and one full upload of the document |

**A correction to 09.** It first said a diligent learner would pull about 1.4 GB a month in month one. That assumed uncompressed responses. The API compresses, and the real figure is about 8 times lower. The table below uses the measured sizes.

A **step** is a look or an answer. The simulated diligent learner takes 174 a day, in 12 sittings. A casual learner takes about 15, in one.

| Learner | Document | Steps a day | Read from the account a month, before | After this round | Sent from the browser a day, before | After |
|---|---|---|---|---|---|---|
| Casual, first week | 0.1 MB | 15 | 6 MB | 0.4 MB | 1.5 MB | 0.1 MB |
| Diligent, month one | 0.27 MB on average | 174 | 179 MB | 12 MB | 47 MB | 3.2 MB |
| Diligent, end of the course | 1.7 MB | 174 | 1.1 GB | 79 MB | 300 MB | 21 MB |

Supabase includes 5 GB of egress a month on Free and 250 GB on Pro, and database reads count ([Supabase](https://supabase.com/docs/guides/platform/manage-your-usage/egress)). How many learners that covers, on reads alone:

| | Free, before | Free, after | Pro, before | Pro, after |
|---|---|---|---|---|
| Diligent, month one | 28 | about 420 | 1,400 | about 21,000 |
| Diligent, end of the course | 4 | 63 | about 220 | about 3,200 |

Casual learners are about 20 times lighter than the diligent ones. Uploads cost nothing in egress, but they cost the learner's mobile data and battery, which is why the second half of the table matters.

## Done this round

All in `src/storage/` and `src/ui/`, tested, and checked on the whole course on the in-memory backend and the real project (09).

1. **A sync per sitting, not per card.** A new scheduler (`sync-schedule.ts`) and hook (`useAccountSync.ts`) replace the old effect in `App.tsx`. A sitting's end, the tab hiding, the network coming back and a failed try sync at once. During a sitting a sync runs at most every 3 minutes, as a safety net. After a change outside a sitting it waits 1.5 seconds. One sync runs at a time, and a result that is about an out-of-date document is dropped.
2. **An idle sync costs 48 bytes.** After each finished sync the browser remembers when the account's row was written and a digest of its own cards (`syncMark` in `device.ts`). If neither has moved, the next sync asks when the row was last written, finds it the same and stops.
3. **Nothing is re-sent that the account already holds.** The sanitizer now writes every document in one canonical shape (`progress-schema.ts`), because Postgres hands a stored object back with its keys in a different order and the old comparison, which read JSON text, never saw two copies as equal. That is why every sync used to re-upload, and why the app re-adopted a merged copy after 110 of 113 syncs.
4. **The skip cannot lose work.** It happens only when both the account's timestamp and the browser's cards are exactly as at the last finished sync. A document that was erased, replaced or rolled back never matches, so it takes the long way and merges. Tests cover each case.

**Measured over a whole course** (in memory, a sync after every sitting): 962 MB sent and 967 MB read back, against 15,186 MB each way for a sync after every card. **15.8 times less.** Merged copies re-adopted: 2, down from 110. On the real project, 27.8 MB of documents read back was 4.5 MB on the wire.

**What a learner can lose.** If the tab closes in the middle of a sitting, up to 3 minutes of answers are not yet in the account. They are safe on the device and go at the next open.

## Next: one record per card

The 15 times is the easy part. What is left is that each sitting still sends the whole document, up to 1.7 MB, and each answer still rewrites it on the device. The fix is to make the card the unit, on both sides.

**On the account.** A new table, one row per card:

```sql
create table public.progress_items (
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id text not null,
  item jsonb not null,            -- the card's progress, as the device folds it
  updated_at timestamptz not null default now(),
  primary key (user_id, card_id)
);
-- Row level security: a learner reads and writes their own rows only. A trigger sets updated_at.
```

Settings, opened levels and the sitting log stay in the small `progress` row. A sync then does four things:

1. Pull the rows with `updated_at` after the last one seen. Usually none, a few bytes.
2. Merge each with the device's copy using `mergeItem`, which already exists and is tested.
3. Push the cards that changed on the device since the last sync, found by comparing object references, which is free because the course never changes a card in place.
4. Remember the newest `updated_at` seen.

A first sync on a new device pulls every row once, in pages, as it pulls the document today. An account that still holds a v1 document is upgraded on its first sync: the items are taken from it and sent as rows.

**On the device.** Write each changed card under its own key instead of the whole document: a few hundred bytes per answer instead of 21 ms at the end of the course. The localStorage copy becomes small, settings and a recent window, and writing it moves to the end of a sitting.

**What it buys.**

| | After this round | With a record per card |
|---|---|---|
| Sent per sitting | the whole document, up to 1.7 MB | the cards that changed, about 14 KB |
| Sent per diligent day, end of the course | 21 MB | about 0.2 MB |
| Read per sync | the whole document, if anything changed | only cards changed elsewhere |
| Device write per answer, end of the course | about 21 ms | well under a millisecond |
| Account database writes | the whole row, up to 1.7 MB, 12 times a day | a few rows |

**Cost and risk.** I estimate 2 to 3 days: the migration, the sync module, change tracking, the upgrade path, the fake backend, and tests. The device side adds 1 to 1.5 days and touches the persistence layer, the part where a bug loses a learner's work. The simulation is the safety net: it already runs a whole course, two devices used at once, a new device and a dropped connection, and it can run a candidate design against the real project.

**Why before launch if there is time.** There is no learner data to migrate yet except Luis's own two answers, and no old copies of the app in learners' phones to stay compatible with. After launch, every change to the account's schema has to support learners on the old and the new version for as long as the app takes to update on their phones, and migrate real progress. The same work then costs about twice as much and carries more risk.

**Why it can wait.** For the first weeks the documents are small, 100 to 300 KB, and this round's changes make the traffic negligible at any size the validation phase will reach. Doing the record-per-card work during launch week competes with checkout, the legal pages and the posts.

**When it must be done.** When a typical learner's document passes about 500 KB, which is around 500 cards met, or when active learners pass a few hundred.

## Decisions for Luis

1. **Do the record-per-card work before launch, or after the validation fortnight?** My recommendation: after Stripe is live and the first posts are out, but within the first month, and before the account schema has real learners in it.
2. **Update `PRODUCT.md` principle 3 and the README line about no account.** They contradict how the course works now.
3. **Keep a copy on the device.** Recommended, for the offline course and the instant feel.
