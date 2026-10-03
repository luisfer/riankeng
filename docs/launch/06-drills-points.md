# Drills, memory and points

Pre-flight agent 6 of 7, Saturday 3 Oct 2026. Code claims cite file:line on `cursor/claude-agent-briefs-3695`; web sources, checked the same day, are at the end. Points stay post-PMF (`docs/claude-agents/learning.md:16-21`, `code.md:23-29`).

## Verdict

- **The drill engine is sound and needs nothing before Monday.** It already does the three things with the strongest evidence: a test on every card, spacing across days, and the right answer after a miss with a retest later in the sitting.
- **Its gaps are tone perception and review load.** Tone pairs exist only on Voice 0, in one synthetic voice. Earlier levels get 4 seats a sitting, so the due pile keeps growing (simulated: 123 due by day 90 at two sittings a day). Leeches and tone confusions are not tracked.
- **Top three after launch:** review first when 16 or more are due; a tone-pair listening drill across levels with a second voice; remediation from the grader's tone slips.
- **Before launch:** optionally record which tone was written for which. Data only, 1 to 2 hours. Nothing else.
- **Points:** 100 points take $1 off. Caps: $5 off a renewal, $5 off the move to forever, $20 per account in all. A drill is a finished sitting: 1 point, at most 2 a day and 5 a week. The server applies Stripe coupons, not customer balance.
- **Forever:** points cut the move from yearly to forever. Forever bought outright is already the lowest total and has no later payment, so its points stay a record. No refunds.

## 1. How the drill engine works

| Part | What the code does | Where |
|---|---|---|
| Intervals | Seven fixed steps: now, 4 hours, 1, 3, 7, 16, 35 days. Nothing goes past 35 days | `src/engine/srs.ts:11-21` |
| Ease | None. The gap depends on the stage only | `srs.ts:92-101` |
| Right | Up one stage when due. An early right answer counts the day, not a stage | `srs.ts:85-101` |
| Miss | Wrong: down two stages, one lapse. Tone or length slip: down one, no lapse. Due at once. A second miss in the sitting changes nothing | `srs.ts:103-115`, `src/ui/Session.tsx:230` |
| Lapses | Counted and exported, never used | `srs.ts:57`, `src/storage/export.ts:26` |
| Mastered | Stage 3 or more, right on three separate days | `srs.ts:127-130` |
| New and review | 16 cards: the level's due cards, up to 8 new (`newPerSession`, not in the UI), then 4 seats for earlier levels' due cards, most overdue first | `src/engine/session.ts:60-115`, `src/storage/progress-schema.ts:35` |
| Look | An unseen card shows both sides; its test goes to the back of the sitting | `session.ts:82,226-233` |
| Exercise mix | Voice cards above seed, levels 1 and up: meaning from romanization 35%, romanization from English 35%, write what you heard 15%, name the tone 15%. Half of Voice 0 pair cards ask "Which did you hear?". Script: pick the letter or write the romanization. The stage weighting the comment promises is not in the code | `src/engine/scheduler.ts:278-316` |
| Grader | Only exact counts. A slip names the syllable and both tones. Low or mid on an unstressed short a both pass | `src/engine/grader-thai.ts:44-71,119-124` |
| Retype | A wrong typed answer is held until the target is typed exactly, then goes to the back. Slips, English and choice misses show the answer and requeue | `Session.tsx:250-289`, `session.ts:282-316` |
| Hear, Slower, autoplay | One voice, `th-TH-PremwadeeNeural`, a clip for each of the 1,638 Voice cards. Hear 1.0, Slower 0.7 at the default rate; Alt+H, Alt+S. Dictation locks Check until heard. Autoplay is on by default after Begin. The pitch line draws with the voice | `scripts/gen-audio.py:23`, `src/audio/tts.ts:113,174-176`, `Session.tsx:148-174,336,433-437`, `progress-schema.ts:33`, `src/ui/ToneRom.tsx:33-38` |
| Unlock | Voice: every card mastered. Script: every card right once. An opened level never locks again | `scheduler.ts:74-97,145-150` |
| Motivation | Account shows the run of consecutive days and today's count | `scheduler.ts:236-248`, `src/ui/Account.tsx:299-313` |

Voice holds 1,638 cards (32 to 110 a level), Script 205. Only the 30 Voice 0 cards carry authored pairs (`content/words/level-00.ts:72-85`).

### A simulated learner

A throwaway script outside the repo drove the real `startSession`, `applyAttempt`, `stampOpened` and `hereLevel` for 90 days: 85% right on first tests and 90% later, 20 seconds a card, sittings 5 hours apart. It has no forgetting model, so overdue cards are too easy. Read it as direction, not forecast.

| Rule | Sittings a day | Voice 1 opens | Voice 2 opens | Cards met by day 90 | Due on day 90 |
|---|---|---|---|---|---|
| Today | 1 | day 20 | day 56 | 224 | 59 |
| Today | 2 | day 12 | day 27 | 435 | 123 |
| Voice gate at 90% mastered | 2 | day 9 | day 26 | 480 | 213 |
| Review first at 16 due | 2 | day 12 | day 28 | 399 | 8 (peak 31) |

- Today the due pile grows without limit. Review first holds it near 30 for about 8% fewer new cards.
- Repeats of cards not yet due are only 4 to 9% of answers.
- New cards arrive at about 2.5 a day with one sitting, 5 with two. At two a day, Voice takes a year or more.
- Paying learners spend the two-week validation window on Voice 0: Voice 1 opens on day 12 at two sittings a day, or day 5 if Voice 0 used Script's right-once rule. That is agent 1's call, not a change before Monday.
- In a matched run, two cards stuck at 40% held Voice 1 from day 16 to day 21. A level waits for its worst card.

### Against the evidence

| Practice | Evidence | Here | Verdict |
|---|---|---|---|
| Testing over rereading | Rowland 2014; Rawson 2013, successive relearning | Every card is a test; a miss is retested, then spaced | Strong |
| Spacing | Cepeda 2006 (317 experiments); Kim and Webb 2022, L2; Latimier 2021 (spaced retrieval g = 0.74; expanding against equal gaps g = 0.03) | 4 hours to 35 days; early answers do not raise the stage | Strong. The ladder's shape matters little. The 35-day cap is short: the best gap grows with the retention interval (Cepeda 2006) |
| Answer after a miss | Pashler 2005: final retention up 494% | Answer shown, retype, slip line | Strong |
| Feedback timing | Butler 2007 (delayed better on multiple choice); Metcalfe 2009, Nakata 2015 (no difference for adults once lag is equal) | Immediate, plus a later retest | Keep |
| Interleaving | Brunmair and Richter 2019: g = 0.42 overall, but blocking beat interleaving for words (g = -0.39); best for categories that look alike | Earlier reviews mixed in | Do not mix words across levels for its own sake. Mix confusable tones |
| Tone perception | Wang 1999 (+21%, new talkers, held 6 months); Uchihara 2025 (79 studies, g = 0.67 against controls); Wayland and Guion 2004 (English speakers struggle with Thai mid against low); Wayland and Li 2008 (both training tasks help) | Tone cards are 15% of Voice; pair listening on 30 cards | Main gap |
| Several voices | Zhang 2021 (g = 0.28 to 0.36); Brekelmans 2022 (no difference, large replication); Perrachione 2011 (depends on pitch aptitude); Al-Shami and Cardoso 2025 (varied TTS voices, no difference) | One synthetic voice | Add a second: nearly free, and exams need one. Expect a modest effect |
| Visual pitch | Baills 2019, pitch gestures | Pitch line drawn with the clip | Strong |
| Speaking | Hamada 2016, Foote and McDonough 2017 (shadowing helps); Dlaska and Krekeler 2008 (learners catch half the errors raters hear); Sakai and Moorman 2018 (small production gains from perception training) | No spoken step | Gap. Ungraded shadowing, no self-scoring |
| Leeches | Anki suspends at 8 lapses by default | Lapses unused | Gap |

## 2. Ranked improvements

### Before launch, small

1. **Optional: record the tone slip on each attempt.** The grader returns the syllable and both tones (`grader-thai.ts:6-12`), but the attempt keeps only `v: 'tone'` (`srs.ts:32-47`, `Session.tsx:238`). Add an optional field such as `s: '0:low>mid'`. The sanitizer keeps extra fields (`progress-schema.ts:100-104`); the JSON schema gains one property. 1 to 2 hours with a test. Signed-in rows then show the first cohort's tone confusions, and item 3 has its data.

Ship nothing else to the engine before Monday.

### After launch

| # | Change | Impact | Effort | Evidence |
|---|---|---|---|---|
| 1 | Review first: at 16 or more due, Continue opens a review sitting and new cards wait | High | S: `session.ts`, `src/ui/App.tsx:316-322` | Simulation; Cepeda 2006 |
| 2 | Tone-pair drill across levels: "Which did you hear?" on the 41 tone-only groups already in Voice (88 cards), plus one syllable read in all five tones from Thai spelling. Tones mixed, feedback each trial, 5 minutes | High | M: content, clips | Wang 1999; Uchihara 2025; Wayland and Li 2008 |
| 3 | Remediation: the learner's top confusion (mid for low, say) adds 2 to 4 pair cards to the next sitting | Medium-high | M, needs the field above | Wayland and Guion 2004; Pashler 2005 |
| 4 | Second voice, `th-TH-NiwatNeural` (male, in edge-tts), on listen and tone cards from stage 2. Premwadee keeps Look. About 20 MB | Medium; exam integrity | S-M: `gen-audio.py` (he says ครับ) | Zhang 2021; Brekelmans 2022 |
| 5 | Leeches: at 6 lapses, show the Look again with its pair; past 8, the card stops holding a Voice level | Medium | S | Anki; simulation |
| 6 | Voice gate at 90% mastered, only with item 1 | Medium | S: `scheduler.ts:145-150` | Simulation |
| 7 | Daily target in place of the run of days: "Today, 23 due and 8 new." Keep the 12-week grid | Low-medium | S: `Account.tsx:299-313` | Locke and Latham 2002 |
| 8 | Ungraded shadowing on phrases: say it with the clip, record on the device, play both | Medium for speaking | M | Hamada 2016; Foote and McDonough 2017 |
| 9 | Gaps past 35 days (75, 150) for ripe cards | Medium, long run | S, plus the stage cap at `progress-schema.ts:94` | Cepeda 2006 |
| 10 | Weight dictation and romanization-from-English up for flowered cards, as `scheduler.ts:279-282` says | Low-medium | S | Testing evidence |

Not recommended: mixing words across levels (Brunmair and Richter 2019), leagues, social.

## 3. Points to price, post-PMF

### a. Earning

Agent 5 proposes 6 Voice and 4 Script checkpoints and one final per track (`docs/launch/05-exams.md:33-43`). Exam points in all: 500 + 400 + 250 = 1,150.

| Event | Points | Rule |
|---|---|---|
| Drill | 1 | A finished sitting, level or Already yours, graded on the server: at least 10 scored cards (Looks excluded), every card ended right, at least 4 seconds a card, a server-issued sitting id used once. A card counts toward a drill once a day. A sitting started offline earns nothing |
| Drill caps | 2 a day, 5 a week | At most 260 a year, $2.60 |
| Checkpoint | 50 | First pass only |
| Final | 200 | First pass only, one per track |
| Clear-all | 250 | Every checkpoint and final passed. Same ledger, same caps |

A drill is a sitting, not a card. At one point a card, a section would pay about 1,000 drill points against a 50-point checkpoint. Drills alone reach about half the renewal cap; the rest takes exams. That keeps the volume reward small: expected rewards tied to performance lower free-choice motivation (Deci 1999, d = -0.28).

### b. Rate and caps

- 100 points take $1.00 off.
- At most 500 points ($5) on one yearly renewal, so a renewal never costs less than $5.
- At most 500 points ($5) on the move from yearly to forever, and that move never brings the total paid below $20.
- At most 2,000 points ($20, one forever price) redeemed per account, ever.
- Unused points carry over. They lapse 12 months after the paid plan ends, or when the account closes.

**Yearly, Mia.** Two sittings most days, 240 drill points a year. Voice checkpoints 1 to 4 in year 1; Voice 5, 6, the Voice final and Script 1, 2 in year 2; Script 3, 4, the Script final and clear-all in year 3.

| Year | Earned | Balance at renewal | Used | Renewal | Carried |
|---|---|---|---|---|---|
| 1 | 240 + 200 | 440 | 440 | $5.60 | 0 |
| 2 | 240 + 400 | 640 | 500 | $5.00 | 140 |
| 3 | 240 + 550 | 930 | 500 | $5.00 | 430 |
| 4 | 240 | 670 | 500 | $5.00 | 170 |

Five years cost $30.60 instead of $50. Then 60 points remain under the $20 cap.

**Forever outright, Ben.** $20 on day one. He earns the same points, but forever has no later payment, so they stay a record. He pays the lowest total for forever.

**Yearly, then forever, Nok.** $10 at month 0; 310 points by month 8 (3 checkpoints, 160 drill points). If agent 2 credits the unused 4 months ($3.33), the move costs $16.67 before points. Points take $3.10; she pays $13.57, $23.57 in all. If agent 2 credits the whole $10, the $20 floor leaves no room and her points stay a record.

### c. Stripe mechanics

**Yearly renewal**, all on the server:

1. Set Billing, Upcoming renewal events, to 7 days. On `invoice.upcoming` the server checks balance and caps, writes a `redeem` row and a redemption record, creates a coupon (`amount_off`, `currency: usd`, `duration: once`, `max_redemptions: 1`, the redemption id as idempotency key and metadata), and adds it to the subscription's `discounts`, keeping existing ones.
2. Stripe applies a `once` coupon to the next invoice and drops it after finalization. On `invoice.paid` the server marks the redemption applied, with the invoice id.
3. If the subscription ends or the invoice is voided first, the server deletes the coupon and writes a `reversal` row.
4. Backstop: a renewal invoice stays draft about an hour after `invoice.created`, so a missed coupon can go there. A failing `invoice.created` handler delays finalization up to 72 hours. Keep it fast.

**A coupon, not customer balance:**

- A coupon cuts the price, and Stripe Tax computes tax after discounts. A balance credit is, in Stripe's words, money "you owe them", applied up to the invoice total. That is stored value, the gift card Luis ruled out.
- The balance does not apply to invoices from Checkout Sessions, so it cannot serve the forever move.
- Negative invoice items also work. The coupon wins because the same object works in Checkout.
- If prices show in more currencies, the coupon needs `currency_options`.

**Move to forever:** the server creates the forever Checkout Session with `discounts: [{ coupon }]`. A Session takes one coupon or promotion code, so agent 2's upgrade credit and the points share one `amount_off` coupon. `checkout.session.completed` applies the redemption; expiry reverses it.

**Forever options, none a refund:**

| Option | How | For | Against |
|---|---|---|---|
| **A. Points cut the move to forever (recommended)** | Yearly learners use up to $5 on the move; forever never totals under $20. Outright forever: points stay a record, said before checkout | No refund, no new product, same Stripe objects as renewals, fair to outright buyers | Outright buyers never turn points into money |
| B. Forever in two parts | $15 now, then up to $5 at month 12 less points | Points cut the forever price itself | Breaks the locked single $20 payment; stores a card for an off-session charge; a failed second part needs a rule |
| C. No redeemable points on forever | Forever accounts see exams, not points | Simplest | Drops "points cut $20/forever" |

### d. Data model

```sql
create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id),
  kind text not null check (kind in
    ('drill','checkpoint','final','clear_all','redeem','reversal','adjust','lapse')),
  amount integer not null check (amount <> 0),
  source_session_id text not null,  -- graded drill or exam session, or redemption id
  exam_id text,                     -- e.g. 'voice-1'; 'all' for clear_all
  graded_by text not null,          -- 'grader@<git sha>' or 'admin:<name>'
  created_at timestamptz not null default now(),
  unique (kind, source_session_id)
);
create unique index points_once_per_exam on public.points_ledger (user_id, exam_id)
  where kind in ('checkpoint','final','clear_all');

create table public.points_redemptions (
  id uuid primary key default gen_random_uuid(),   -- also the Stripe idempotency key
  user_id uuid not null references auth.users (id),
  target text not null check (target in ('renewal','forever')),
  points integer not null check (points between 1 and 500),
  cents integer not null,                          -- so a rate change leaves old rows true
  status text not null check (status in ('reserved','applied','reversed')),
  stripe_coupon_id text unique,
  stripe_subscription_id text,
  stripe_checkout_session_id text unique,
  stripe_invoice_id text unique,
  created_at timestamptz not null default now(),
  settled_at timestamptz
);

create view public.points_balance with (security_invoker = true) as
  select user_id, sum(amount)::int as balance from public.points_ledger group by user_id;
```

- RLS on both tables. A learner reads their own rows. Only the service role inserts. A trigger rejects every update and delete on the ledger, the service role included; corrections are new `adjust` rows.
- One grant function (`security definer`, service role only) takes a per-user advisory lock, checks the paid entitlement, caps and once-per-exam, then inserts with `on conflict do nothing`. This matches agent 5's grant (`05-exams.md:103`).
- One open redemption per user and target (partial unique index on `status = 'reserved'`). The lifetime cap sums reserved and applied rows.
- Stripe event ids are stored once, so replayed webhooks are skipped.
- Nothing reads `progress.doc`. The learner writes that row (`supabase/migrations/20260923140000_progress.sql:13,24-27`, `src/storage/account-sync.ts:91-108`).

### e. Anti-gaming

| Risk | Guard |
|---|---|
| The app claims points | The client sends raw answers and a session id, never a verdict or a number. The server grades with the same `gradeThai` |
| Replay | Server-issued, HMAC-signed, single-use session id, 2-hour expiry; `unique (kind, source_session_id)` |
| Bots on drills | Secrecy cannot stop them: the course and its answers ship in the public `/assets`. The cap is the guard, so a perfect bot earns $2.60 a year. Plus 4 seconds a card |
| Exam leaks | Items and keys stay on the server (agent 5). Audio goes through opaque per-session links, because clip names carry the answer (`/audio/w:máa.mp3`, `src/audio/clip-url.ts:11-13`). Exam clips are fresh files under random names (agent 5), many in the second voice, so they cannot be matched to the public clips |
| Grinding easy cards | A card counts once a day; daily and weekly caps |
| Many accounts | Only paid accounts earn. A balance cuts only its own account's price. No transfers or merges |
| Model output | Never writes the ledger (`learning.md:14`) |
| Refunds, disputes | Points from a refunded or disputed period are removed. Points used on a refunded invoice are not restored |
| Rate limits | Per user: 20 drill starts a day; exam starts per agent 5. Per IP on `/api/drill/*` and `/api/exam/*` |
| Review | A weekly query: accounts at every cap 4 weeks running, a median under 4 seconds a card, one card on several accounts. A flagged redemption waits for Luis |

### f. Accounting and legal

- A discount, not a refund: the invoice is issued at the lower price and no money goes back. Revenue is the discounted amount. Confirm with accountant.
- Unused points may be a material right under SFRS(I) 15 (IFRS 15 B39-B43), deferring part of revenue. Likely immaterial at this size. Confirm with accountant.
- GST and VAT fall on the discounted price, as Stripe Tax computes them. Confirm with accountant.
- MAS keeps retail loyalty points usable only with the issuer outside the Payment Services Act as limited-purpose e-money (MAS FAQ, question 10). Points with no cash value and no transfer should fit. Confirm with lawyer.
- Lapse, change and end rules need notice; EU and UK unfair-terms law protects consumers. Confirm with lawyer.

Draft terms, a section after Waitlist (confirm with lawyer):

> **Points.** A paid account earns points when the company's server grades its work as passed. A finished sitting earns 1 point, up to 2 a day and 5 a week. A section checkpoint earns 50 points the first time it is passed, and a final exam 200. Passing every exam earns 250 more.
>
> Points are a discount on the account's own price. 100 points take $1 off. They take at most $5 off a yearly renewal, at most $5 off the move from yearly to forever, and at most $20 off in all. The move to forever never brings the total paid below $20. Forever bought outright has no later payment, so its points stay on the account as a record.
>
> Points are not money. They have no cash value, are never paid out or refunded, and cannot be sold, transferred, or combined with another account. Points lapse when the account closes, or 12 months after its paid plan ends.
>
> The company may remove points earned through a refunded or disputed payment, through automation, or through other misuse. The company may change the points rates, or end points, with 30 days' notice. Points held when points end can be used for 12 more months.

Learner copy:

- Finish, when a drill counted: "1 point. 4 this week, 5 at most."
- Account, yearly: "Points, 640. 500 come off the renewal on 12 March 2027."
- Account, forever outright: "Points, 640. Forever has no later payment, so points stay here as a record."
- Forever checkout: "Points cannot be used after this purchase."

### g. Why post-PMF, and the one test now

- It needs paid entitlement, a server grader and exams. None exists (`code.md:21`, `learning.md:16-21`).
- A renewal discount first applies 12 months after the first yearly sale, so it cannot move anything inside validation.
- It adds terms, a revenue question and a ledger to keep honest.
- The waitlist must not hint at it: joining "does not reserve a date, a price, or a place" (`terms.html:50`).
- First learn whether people come back with no reward at all (Deci 1999).

Test now without building, one interview question to people who tried a paid sitting: "If passing the test at the end of each section took up to half off your next year, would that change whether you renew?" Note the answer beside the plan they chose. Show points nowhere in the product or the posts.

## 4. Effort and phases

First: paid entitlement and Stripe (agent 2, `code.md:9-13`); `gradeThai` on the server, which is easy since `grader-thai.ts:1-2` imports only `content/system.ts` and `normalize.ts`; exams with a server item bank (agent 5).

| Phase | When | Work | Effort |
|---|---|---|---|
| 0 | Now, optional | Record the tone slip | 1 to 2 hours |
| 1 | First month | Review first, leeches, exercise mix, daily target | 3 to 4 days |
| 2 | Months 2 and 3 | Tone-pair drill, five-tone clips, Niwat voice, remediation | 2 weeks |
| 3 | Post-PMF, after entitlement | Server grader route, drill grading endpoint | 3 to 4 days |
| 4 | With agent 5's exams | Ledger, grant function, exam grants | 1 week |
| 5 | Then | Renewal coupons, forever Checkout coupon, webhooks, reversals | 1 week |
| 6 | Then | Terms, privacy (typed answers reach the server), Account copy, abuse query | 2 to 3 days |

Points are about three weeks of work once exams exist.

## Decisions for Luis

1. Rate: 100 points to $1.
2. Caps: $5 a renewal, $5 on the move to forever, $20 in all.
3. A drill is a finished sitting, capped at 2 a day and 5 a week.
4. Clear-all bonus of 250, on agent 5's 10 checkpoints and 2 finals.
5. Forever: option A.
6. May any path to forever total under $20? Recommended no. Settle it with agent 2's upgrade credit.
7. Points lapse 12 months after a plan ends.
8. Before launch: the slip field, or nothing.
9. Paying learners spend the validation fortnight on Voice 0. Keep that, or open Voice 1 when Voice 0 is right once (agent 1's call).

## Sources

Checked 3 Oct 2026.

- Al-Shami and Cardoso 2025, CALL-EJ: https://callej.org/index.php/journal/article/view/713
- Baills et al. 2019, SSLA 41: https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/observing-and-producing-pitch-gestures-facilitates-the-learning-of-mandarin-chinese-tones-and-words/6BF1D83445A4C9E136CE01F7C53CE193
- Brekelmans et al. 2022, JML 126: https://ora.ox.ac.uk/objects/uuid:6d460df2-e4c8-48bc-b3ff-af4fa5c749f1
- Brunmair and Richter 2019, Psychological Bulletin 145(11): https://www.psychologie.uni-wuerzburg.de/fileadmin/06020400/2019/Brunmair_Richter_in_press__2019_META-ANALYSIS_OF_INTERLEAVED_LEARNING.pdf
- Butler, Karpicke and Roediger 2007, JEP: Applied 13: https://learninglab.psych.purdue.edu/downloads/2007/2007_Butler_Karpicke_Roediger_JEPA.pdf
- Cepeda et al. 2006, Psychological Bulletin 132: https://escholarship.org/uc/item/3rr6q10c
- Deci, Koestner and Ryan 1999, Psychological Bulletin 125(6): https://home.ubalt.edu/tmitch/642/articles%20syllabus/Deci%20Koestner%20Ryan%20meta%20IM%20psy%20bull%2099.pdf
- Dlaska and Krekeler 2008, System 36(4): https://www.sciencedirect.com/science/article/abs/pii/S0346251X08000602
- Foote and McDonough 2017, JSLP 3(1): https://www.researchgate.net/publication/316002411_Using_shadowing_with_mobile_technology_to_improve_L2_pronunciation
- Hamada 2016, Language Teaching Research 20(1): https://www.semanticscholar.org/paper/Shadowing:-Who-benefits-and-how-Uncovering-a-EFL-Hamada/39105d29b19f684534f8aa1f57a3fba5701d5b9e
- Kim and Webb 2022, Language Learning 72(1): https://files.eric.ed.gov/fulltext/EJ1365275.pdf
- Latimier, Peyre and Ramus 2021, Educational Psychology Review 33: https://link.springer.com/article/10.1007/s10648-020-09572-8
- Locke and Latham 2002, American Psychologist 57(9): https://eric.ed.gov/?id=EJ654871
- Metcalfe, Kornell and Finn 2009, Memory and Cognition 37: https://link.springer.com/article/10.3758/MC.37.8.1077
- Nakata 2015, Language Teaching Research: https://eric.ed.gov/?id=EJ1065607
- Pashler et al. 2005, JEP: LMC 31: https://escholarship.org/content/qt7fg8h6zq/qt7fg8h6zq.pdf
- Perrachione et al. 2011, JASA 130(1): https://pmc.ncbi.nlm.nih.gov/articles/PMC3155595/
- Rawson, Dunlosky and Sciartelli 2013, Educational Psychology Review 25: https://link.springer.com/article/10.1007/s10648-013-9240-4
- Rowland 2014, Psychological Bulletin 140(6): https://www.researchgate.net/publication/264988491_The_Effect_of_Testing_Versus_Restudy_on_Retention_A_Meta-Analytic_Review_of_the_Testing_Effect
- Sakai and Moorman 2018, Applied Psycholinguistics 39(1): https://par.nsf.gov/servlets/purl/10279429
- Uchihara, Karas and Thomson 2025, SSLA 47(3): https://www.cambridge.org/core/journals/studies-in-second-language-acquisition/article/high-variability-phonetic-training-hvpt-a-metaanalysis-of-l2-perceptual-training-studies/6ABB8C1F32D88D53EA8D05A4565E76F6
- Wang, Spence, Jongman and Sereno 1999, JASA 106: https://kuppl.ku.edu/sites/kuppl/files/documents/publications/Wang_Spence_Jongman_Sereno_training_JASA_1999.pdf
- Wayland and Guion 2004, Language Learning 54(4): https://onlinelibrary.wiley.com/doi/abs/10.1111/j.1467-9922.2004.00283.x
- Wayland and Li 2008, Journal of Phonetics 36(2): https://www.sciencedirect.com/science/article/abs/pii/S0095447007000277
- Zhang, Cheng and Zhang 2021, JSLHR 64(12): https://doi.org/10.1044/2021_jslhr-21-00181
- Anki manual, leeches: https://docs.ankiweb.net/leeches.html
- edge-tts Thai voices, from `edge_tts.list_voices()` run on 3 Oct 2026: Niwat (male), Premwadee (female)
- Stripe, customer invoice balance: https://docs.stripe.com/billing/customer/balance
- Stripe, subscription coupons and promotion codes: https://docs.stripe.com/billing/subscriptions/coupons
- Stripe, Checkout discounts: https://docs.stripe.com/payments/checkout/discounts
- Stripe, subscription invoices: https://docs.stripe.com/billing/invoices/subscription
- Stripe, subscription webhooks: https://docs.stripe.com/billing/subscriptions/webhooks
- Stripe Tax, discounts: https://docs.stripe.com/tax/calculating
- MAS, Payment Services Act FAQ of 19 Apr 2024, question 10: https://www.mas.gov.sg/-/media/mas-media-library/regulation/faqs/pd/faqs-on-payment-services-act-2019/payment-services-act-faq--19-april-2024.pdf
- IFRS 15 customer options, B39-B43: https://ifrscommunity.com/knowledge-base/customer-loyalty-programmes/
