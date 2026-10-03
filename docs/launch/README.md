# Launch plan: the validation fortnight, 5 to 18 Oct 2026

Written Sat 3 Oct 2026 from the seven pre-flight reports in this folder. Each report was made from the role briefs in `docs/claude-agents/`. The reports hold the detail, the sources and the file:line references. This page is the plan. Lines marked (confirm) need an accountant or a lawyer.

| Doc | Covers |
|---|---|
| [01-content.md](01-content.md) | Thai accuracy, the demo and the preview, onboarding |
| [02-money.md](02-money.md) | Stripe through Pristine Mekong, tax, consumer law, the paid build |
| [03-growth.md](03-growth.md) | Evidence so far, the posting plan with full drafts, ads, metrics |
| [04-codebase.md](04-codebase.md) | Health, ranked gaps, the event logger, security, stale facts |
| [05-exams.md](05-exams.md) | Exams and certificates, after product-market fit |
| [06-drills-points.md](06-drills-points.md) | The drill engine, and points that cut the price, after product-market fit |
| [07-ideas.md](07-ideas.md) | Positioning, concierge, other ideas, the voice licence |
| [08-thai-review.md](08-thai-review.md) | The whole course's Thai, the fixes made, and Athita's list |

## Verdict

- **Validation has not started.** All 13 on the waitlist joined on 29 Sep from one untagged share on LinkedIn and X. The only account is Luis's, so no outside learner has used the course. Visits fell to zero by 3 Oct (03 §1).
- **The product is ready to show.** Tests (479 of 479), typecheck, content validation and the build pass. Production dependencies have no known vulnerabilities (04 §1). The Thai in the 40 demo cards, the 25 preview words and Voice 0 to 2 checked clean (01 §1).
- **It cannot yet measure the launch or take money.**
  - Nothing counts a return try.
  - The privacy page says "no analytics" while Vercel Analytics runs.
  - Vercel Hobby forbids showing prices.
  - There is no checkout and no paid gate (04 §2, 02).
- **The plan:**
  1. Close the P0 list by Tue 6: about two days of code, plus Luis in dashboards.
  2. Post from Wed 7, with the prices as text.
  3. Turn on checkout when Stripe clears, probably Wed 14 to Fri 16.
  4. Read the scoreboard on Sun 18.
- **Money:** Stripe on Pristine Mekong's own account, with Managed Payments on. Link, a Stripe company, becomes the seller of record and files VAT and GST from the first sale. Prices include tax, and no registrations are needed for now (02).
- **Ads:** none in the fortnight. At $10 and $20 they very likely cost more per payer than the payer pays. The earliest test is Mon 19 Oct, and only if the brief's trigger fires: Reddit, $100 over 7 days, no pixel (03 §4).

## Status, Sat 3 Oct (evening)

Built on branch `luis/validation-launch`, not committed yet. Typecheck, 502 tests, content validation, the copy lint and the build pass.

**Done:**
- **Analytics.** `api/event.ts` and an `events` table (migration `20261003120000_events.sql`) count views, checks, plays, the ways on, waitlist joins and finished previews. A missed card keeps what was typed, romanization only. `npm run numbers` prints the scoreboard.
- **Consent, the same in every country.** One banner, Allow and Don't allow alike, nothing kept for counting before a yes. Global Privacy Control counts as a no. Privacy choices in the footers asks again. Without a yes, visits and tries are still counted, but not returns.
- **Campaign attribution.** `?ref=`, the five `utm_` tags, the referring site and the landing page go to the waitlist (migration `20261003120100_waitlist_attribution.sql`) and to every event. Without consent they ride on the links between the site's own pages.
- **Demo fixes.** Slower at 0.7, the five-tones line, the clip on Continue, and Join the waitlist beside Next card and on every preview word.
- **Pages.** The headline shows after 2 s even if the script stalls. Privacy rewritten with a Counting section. Terms say synthetic voice clips.
- **Thai.** The whole course reviewed ([08-thai-review.md](08-thai-review.md)). Four wrong sounds or tones fixed, with aliases so saved progress follows: kà-mǒoi, tan, mái too, and the Script ee, εε, oo. The หวัด grading bug is fixed. Athita's list is in 08.
- **SITE_PASSWORD rotated** in Vercel Production and Preview.

**Waiting on Luis:**
1. Redeploy production. The new SITE_PASSWORD only takes effect on the next production deploy, and the old one is live until then.
2. Run the two migrations on Supabase (`supabase db push`, or paste the SQL). Until then, events are refused, and the waitlist saves without the new columns.
3. Hosting. Vercel stays on Hobby, so no prices and no checkout on this site: Hobby's terms count advertising a sale as commercial use. Choose Pro, a host that allows commercial use on its free plan, or a fortnight without prices.
4. Athita's first eight questions in 08, before the first post.
5. Review the branch and commit it.

## The answer on exams and money back

No pricing plan, brief, branch or commit gives money back for passing exams. The idea that exists is points that cut the learner's own price, after product-market fit (`docs/claude-agents/learning.md`).

Doc 06 designs it to Luis's rules:
- 100 points take $1 off.
- At most $5 off a renewal, and $20 per account in all.
- The server grants points after it grades the work.
- Never cash, never a gift card.

A forever buyer has no later payment to cut. So doc 06 proposes that points cut the move from yearly to forever, and stay a record for forever bought outright.

Doc 05 sets the trigger for building exams: 10 paying learners who have mastered Voice 0 to 3. Until then, keep exams, points and certificates out of posts and off the landing.

## What success looks like

| | Rule | Source |
|---|---|---|
| Success | 10 return tries in 7 days, or 3 payments, at least 2 of them from learner places rather than friends | growth.md, 03 §6 |
| Each place, 72 h after its post | 20 or more visits and no try: change the opening line or the clip. Under 5 visits: nobody saw it, so don't repost | 03 §6 |
| Read Sun 18, final Tue 20 | Under 30 tries: reach or message. 30 or more tries, under 3 returns: fix the first run. Returns, few price clicks: test the price block. Price clicks, no payment: walk checkout in the Facebook and Reddit in-app browsers | 03 §6 |
| Hard stop, Sun 1 Nov | Under 5 return tries and no payment, after all 8 places and 300 visits: pause posts and talk to 10 people who tried | 03 §6 |
| Ads | Only after success, only where a try or payment came from, at most $10 per year payer and $20 per forever payer | growth.md, 03 §4 |

Definitions (03 §5):
- A **try** is a browser that checks at least one card.
- A **return try** is a check on a later day, within 7 days of the first.
- Counts are lower bounds, because in-app browsers keep their own storage.

## Go or no-go

### P0, before the first post (Wed 7, 20:00 Bangkok)

| # | Item | Owner | Effort | Doc |
|---|---|---|---|---|
| 1 | Upgrade Vercel to Pro. Hobby forbids commercial use, and showing prices counts | Luis | 15 min, $20 a month | 02, 04 P0-5 |
| 2 | Rotate `SITE_PASSWORD` to 32 random bytes. Until 23 Sep it was the shared gate password, and anyone who knew it can make the course cookie | Luis | 10 min | 04 P1-1 |
| 3 | Export the waitlist to CSV now, then weekly | Luis | 5 min | 04 P0-6 |
| 4 | One event logger: `api/event.ts`, an `events` table, and hooks on the landing card and the preview. Events: `view`, `check`, `correct`, `miss`, `hear`, `price_click`. Typed text on misses only, with doc 01's character rules | Claude | 6 to 8 h | 04 §3, 01 §5b, 03 §5 |
| 5 | Privacy: name Vercel Analytics, the logger and the demo answers. Terms: "synthetic voice clips" instead of "recordings" | Claude writes, Luis approves | 1 h | 04 P0-2, 01 §7 |
| 6 | Prices on the page as text, with no buy button. Terms gain Plans and prices, Forever, and Contact. Contact email in the footer | Claude writes, Luis approves | 2 h | 02 P0, §8 |
| 7 | Demo fixes: Slower at 0.7, the new tone line, the clip plays on Continue, and a Join the waitlist link beside Next card and in the preview's nav | Claude | 2 to 3 h | 01 §3, §4 |
| 8 | The hero shows after about 2 s even if JS stalls, and the first panel ships in the HTML | Claude | 1 h | 04 P0-4 |
| 9 | Vercel Firewall rate limits on `/api/waitlist` and `/api/event` (needs Pro) | Luis sets it, Claude writes the rule | 15 min | 04 P0-6 |
| 10 | Keep the waitlist thanks line ("One email goes to this address when the course opens") if decision 18 is yes. Otherwise reword it | Claude | 15 min | 04 P0-3 |
| 11 | Native check: one paid italki or Preply lesson on the demo and preview, the chǎn and kǎo clips, and the lines in 01 §1 | Luis | a 1 h lesson, $5 to $30 | 01 §1, 07 #5 |
| 12 | Join the groups and the Discord, and read their rules. Send the permission messages. Confirm Speak Thai Daily exists. Check r/learnthai's karma floor | Luis | 1 h, Mon 5 | 03 §2 |
| 13 | Deploy, then the smoke test: `/learn/` returns 307 to `/?signin`; sign in; check a demo card; join with `?ref=smoketest`; read the logs; check the link preview | Both | 30 min, Tue 6 | 04 P0-6, 07 #11 |

Code total: about 12 to 15 hours. It can start as soon as decisions 1 to 7 are in.

### P1, before the first live charge

| # | Item | Owner | Effort | Doc |
|---|---|---|---|---|
| 1 | Open the Stripe account as Pristine Mekong Pte. Ltd. (UEN 202609906N): the SGD bank account, KYC including the Singapore items new in Sept 2026, two-factor sign-in | Luis | start now, allow about a week | 02 §2, §9 |
| 2 | Turn Managed Payments on, set prices to include tax, leave Stripe Tax off. Create the two test Prices: $10 recurring yearly and $20 one-time, tax code `txcd_20060058`. Send the IDs | Luis | 30 min | 02 §7 step 1 |
| 3 | Re-voice the 1,638 clips through Azure Speech with the same voice on a paid key, or get Microsoft's answer in writing. Managed Payments requires the rights to everything it sells | Luis gets the key, Claude runs it | 2 to 4 h, under $1 | 04 P1-4, 07 |
| 4 | The paid build (detail below the table) | Claude | about 5 days | 02 §7, §9 |
| 5 | Supabase custom SMTP (a Gmail app password on pristinemekong@gmail.com), Site URL `https://riangeng.com`, redirect `/learn/`, an invite template | Luis, Claude drafts | 1.5 h | 04 P1-2 |
| 6 | Supabase Pro, or a nightly dump. Entitlements are money records | Luis | $25 a month | 04 P1-3 |
| 7 | Security headers, a same-site check on logout and checkout, CI on push, an `error` event, the app manifest only on `/learn/` | Claude | about 5 h | 04 P1-5 to P1-10 |
| 8 | The lawyer reads the clauses in 02 §8. The accountant gets the six questions in 02 §9 | Luis | | 02 §9 |
| 9 | Test-mode run of every case: both plans, a renewal and a failed renewal on test clocks, a refund, a dispute. Then live setup, and Luis buys forever and refunds it | Both | half a day | 02 §7 step 9 |
| 10 | Luis says go. The buy buttons appear, and the email to the 13 goes at 09:00 that day | Luis | | 02, 03 §3 |

The paid build in item 4 covers:
- checkout and the webhook;
- entitlements, with a free ("comp") row for every invited learner;
- the success page, where a buyer who pays first sets a password with no email needed;
- a signed cookie per user, in place of the shared one;
- price cards with the renewal checkbox;
- a Plan block on the Account page;
- the full terms and privacy text.

During the fortnight, and not blocking:
- **Demo P1 fixes** (Claude, about 5 h, 01 §3): retype after a miss, a skip, a closing card after the 40th, easier first cards, the grade shown in the preview.
- **Optional:** record each tone slip in the progress data (Claude, 1 to 2 h, 06 §2).

## Calendar

| Day | Luis | Claude | Posts (03 §2) |
|---|---|---|---|
| Sat 3, Sun 4 | Decisions 1 to 7. Vercel Pro, rotate the secret, export the CSV. Open Stripe and start KYC. Book the native lesson | P0 code, once the decisions are in | |
| Mon 5 | Groups, Discord, permission messages. Stripe test Prices. Azure key. Supabase SMTP | P0 code | |
| Tue 6 | Native lesson. Approve the copy | Native fixes, deploy, smoke test. Start the paid build | |
| Wed 7 | | Paid build | r/learnthai, 20:00 Bangkok |
| Thu 8 | | Paid build | Discord, once the mods agree |
| Fri 9 | | Paid build | Farang Can Learn Thai only if checkout is live. Otherwise on go day, Fri 16 at the latest |
| Sat 10 | | | I Want to Learn Thai |
| Sun 11 | Read week one | | none |
| Mon 12 | | Test-mode run, re-voice | THAI LANGUAGE V2.0 |
| Tue 13 | | | Speak Thai Daily |
| Wed 14 to Fri 16 | Go, once Stripe clears and the test run passes. Email the 13 at 09:00, then Farang Can Learn Thai the same day | Live setup with Luis | Replies only. Calls with the first payers |
| Sun 18 | Scoreboard (03 §5). Name the beachhead (07 #1) | | |
| Mon 19 | The Reddit test, only if the success bar is met | | |
| Tue 20 | Final read of the fortnight | | |
| Sun 1 Nov | Hard-stop check | | |

If plans slip:
- **Stripe clears late:** posts go on with prices as text. The email and the largest group wait.
- **The logger slips:** the posts wait too. Without it, the fortnight yields only waitlist counts (03, blockers).

r/ThaiLanguage and Digital Nomads Thailand get replies only, under a fitting question. Every link carries its place's `?ref=` (03 §2).

## Money in one page

- **Possible?** Yes. Pristine Mekong opens its own Stripe account in Singapore and sells worldwide. A self-study course that awards no qualification looks outside Singapore's Private Education Act (confirm, 02 §6.8).
- **Gateway: Stripe with Managed Payments.**
  - Stripe's eligibility page lists Singapore sellers and "online courses and training", checked 3 Oct.
  - Link, LLC is the seller on the receipt and files tax in 80+ countries.
  - The card statement reads `LINK.COM* RIANGENG`.
  - If Stripe refuses: plain Stripe plus the VAT steps in 02 §2, or Paddle.
- **What the company keeps:** about $8.60 of $10 and $17.73 of $20 where no tax applies. Less where tax is high: in the UK, $6.93 and $14.40 (02 §4.4).
- **Tax stance, first 3 months:**
  - prices include tax, Stripe Tax stays off, no registrations;
  - Singapore GST starts only above S$1M a year;
  - review after 3 months or US$5,000 of sales (02 §4.5).
- **Currency and payment methods:** USD. Cards, Apple Pay, Google Pay and Link. PromptPay needs a Thai Stripe account, so Thai buyers pay by card (02 §5).
- **Local currency at checkout:** yes, through Stripe Adaptive Pricing, in over 150 countries. The buyer pays a 2 to 4% conversion fee, the company still receives USD, and refunds cost nothing extra. It needs USD as one of the company's settlement currencies, which means a USD bank account on the Stripe account. Otherwise checkout shows USD. Cross-border subscriptions take cards, Link, Apple Pay and Google Pay ([Stripe](https://docs.stripe.com/payments/currencies/localize-prices/adaptive-pricing)).
- **Consumer law:**
  - a 30-day full refund covers the EU and UK 14-day right;
  - a renewal-consent checkbox and a reminder 30 days before renewal satisfy California;
  - "forever" is defined, with 90 days' notice and a refund if the course closes (02 §6).
- **Getting money out:** payouts in SGD to the company bank, the first 7 days after the first charge. For now, leave it in the company and repay Luis's own outlays. Salary, director's fee or dividend come later, with the accountant (02 §3).
- **Running costs:**
  - Vercel Pro, $20 a month;
  - Supabase Pro, $25 a month from the first charge;
  - the Azure re-voice, under $1;
  - the native lesson;
  - Stripe's fee on each sale.

## Also worth doing in the fortnight (07)

1. **Two pitches, one product.** "Speak first" for groups of people living in Thailand, "Script bridge" for script-first places like r/learnthai. Keep the tags, and note in the scoreboard which pitch each place got. 1 h of copy.
2. **Concierge.** Write by hand to each early payer, and hold five 15-minute calls with people who tried the demo. Ask about past behaviour, never promise features. About 30 min a person.
3. **Report this card.** A quiet mailto under each card, filled in with the card and the answer. 1 to 2 h.
4. **Phrase of the week** from the 40 panels, from Mon 12. Email only people who opted in by reply.
5. **"Why Thai?"** Ask it in the email to the 13 at no cost. Five optional taps after joining come later, if wanted.

## Decisions for Luis

Each carries the reports' recommendation.

**This weekend (they shape the P0 code):**
1. Vercel Pro now. **Luis: no, Vercel stays free.** So no prices or checkout on this site until the hosting is decided (Status, item 3).
2. Rotate `SITE_PASSWORD` now. **Done**, but production must be redeployed.
3. The event logger. **Built**, with one consent question for every country. The browser id is kept only after a yes.
4. Post before checkout is live, with prices as text. **Open.** Recommended: post from Wed 7 for tries and returns, prices or not, once the hosting is settled.
5. Ship the five demo fixes and the terms wording. **Done.**
6. The tag list in 03 §2. **Accepted, and attribution is built**: ref, utm_ tags, referrer and landing page.
7. The native check. **Athita, Luis's partner, who is Thai**, takes the list in 08. The whole vocabulary has been reviewed.

**Before the first charge:**
8. Managed Payments on. Yes.
9. Full refund within 30 days of any payment. Yes.
10. Forever means as long as rian gèng runs. Closing needs 90 days' notice, and the closing refund counts forever as two years of yearly. Yes.
11. Pay first, so the checkout email becomes the account. Yes.
12. `SITE_PASSWORD` stops being a way in. Luis and reviewers get comp rows. Yes.
13. Yearly to forever costs $10 during a paid year. Yes. Under doc 06's rule that no path to forever totals under $20, points could then only cut renewals. Settle that when points are built.
14. Payouts in SGD only. Yes.
15. Gmail SMTP for password resets. Yes, since domain email first needs MX, SPF, DKIM and DMARC.
16. Supabase Pro, or a nightly dump. Pro.
17. Re-voice on Azure, or a written answer from Microsoft. Re-voice.
18. Email the 13 the morning checkout goes live, since their consent covers one message. Yes. Use the shared link with `?ref=email-waitlist`; signed per-person links (02 §7 step 7) are optional.
19. Friends' payments count toward the 3, but at least 2 should come from learner places. Yes.

**During the fortnight:**
20. First paid proof: Voice 0, sitting one. Keep the rule that Voice 1 opens once Voice 0 is mastered on three separate days, since it forces returns, and add the line that explains it. Keep.
21. "pǒm" in a woman's voice: add the explanatory line on Voice 1 now, and a male voice later.
22. Script audio: reuse Voice clips plus overrides, or rely on the device's voice.
23. Pause new panels until 18 Oct. Yes.
24. `/gallery/`: dev only, or public.
25. Offline access after a refund lasts until the next online open. Accept.
26. Khun or kun.

**After product-market fit:**
27. Points: 100 to $1; caps of $5 a renewal, $5 on the move to forever, and $20 per account; a drill is a finished sitting, at most 2 a day and 5 a week; clear-all 250; forever option A; points lapse 12 months after a plan ends (06).
28. Exams: build at 10 paying learners who mastered Voice 0 to 3. Certificates are dated score records, never a CEFR or ILR level (05).

## Corrections to the briefs

These facts in the briefs are stale. Edit them once Luis confirms (04 §5):
- **`waitlist-email.md`:** riangeng.com is registered, on Vercel DNS, and serves the site. It has no MX, SPF or DMARC yet.
- **`money.md`:** under Managed Payments, tax is collected from the first sale, not after the first paid cohort.
- **`code.md`:** the gate admits any Supabase session through one shared cookie, and nobody types `SITE_PASSWORD` now.
- **`social.md`:** there is no self-serve sign-up. Hosted sign-up is off, and accounts are invited by hand.
- **`learning.md`:** the whole course is gated. The public parts are the 40 demo cards and the 25 preview words.
- **`README.md` in that folder:** "riian gèng" is a typo.
- **`PRODUCT.md`:** pricing is settled at $10/year and $20/forever. Progress syncs to the account, so "nothing leaves the device" no longer holds.

## Risks

| Risk | Likelihood | Answer |
|---|---|---|
| Stripe activation or the Managed Payments review takes over a week | Medium | Post with prices as text; hold the email and the largest group; Paddle as the fallback |
| A wrong grade or clip called out in a launch thread | Medium | The native lesson before Tue 6, the reply playbook, fix it and reply (03 §2) |
| The voice licence | Low to medium, high impact | Re-voice before the first charge |
| In-app browsers hide the hero or split storage | Medium | P0 item 8. Counts are lower bounds |
| EU consent for the logger's id | Low | The privacy text, or the lighter variant |
| Prices shown on Vercel Hobby | Certain if not upgraded | Pro first |
| The old gate password is known to early testers | Low, easy fix | Rotate it now |
