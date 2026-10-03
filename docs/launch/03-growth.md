# 03 Growth: evidence, the unpaid fortnight, and paid ads

Agent 3 of 7, growth. Sat 3 Oct 2026. Data from Supabase (aggregates only) and Vercel Web Analytics (`vercel metrics`), read the same day. Web sources are at the end.

## Verdict

- **Validation has not started.** The 13 sign-ups came from one untagged share on LinkedIn and X on 29 Sep. Luis holds the only account, so no invited learner exists to come back, and no try can be counted today.
- **Unpaid fortnight:** six places from Wed 7 Oct, at most one a day, plus two where Luis only answers questions, each with its own `?ref=`. Gate: both prices on the page, Vercel Pro, and the event logger.
- **The 13 get their one email the morning checkout works** (`privacy.html:50`).
- **Ads: not now, and very likely never at a profit at $10 and $20.** A Meta education lead, only an email, averages $26.31. Earliest test Mon 19 Oct, only if the brief's trigger fires: Reddit, $100, no pixel, bought as research.

## 1. Evidence on 3 Oct 2026

**Supabase**, about 15:45 Bangkok time.

| Item | Result |
|---|---|
| Waitlist rows | 13 |
| By source tag | null 13 |
| By day | All 13 on Tue 29 Sep, 12:42 to 20:48 Bangkok, 2 to 94 minutes apart |
| Likely internal or test rows (test, example, luis, lfrc, pristinemekong, romero, calero, plus-addressing) | 0 |
| Auth users | 1, created 23 Sep, matching an internal pattern. Invited learners: 0 |
| Signed in ever, in 7 days, in 14 days | 1, 0, 1. Last sign-in 23 Sep |
| `progress` rows | 1. Learner 1 is that internal account: doc created 17 Sep, updated 24 Sep, 0 sittings logged, 1 card, 2 answers on 2 days |

**Vercel Web Analytics**, production, from about 17:45 Bangkok on 29 Sep, when PR #8 went live.

| Item | Result |
|---|---|
| Page views | 50 |
| Visitors per day, 29 Sep (from 17:45) to 3 Oct (to 15:45) | 10, 14, 7, 3, 0 |
| Referrers, visitor-days | none 23, t.co (X) 7, LinkedIn 7 |
| Pages | `/` 34, `/preview` 4 |
| Countries | TH 15, US 10, CA 2, ES 2, SG 2, ID 1, JP 1, TW 1 |

Vercel's visitor hash resets every 24 hours, so these are visitor-days, not people.

What it says:
- The 13 most likely came from Luis's own network: the only referrers are LinkedIn and X. A waitlist count is not proof anyway (`growth.md:11`).
- Do invited learners come back? None exist. The only account and progress document are Luis's.
- Traffic fell to zero in four days, and 4 visitors opened the preview. Tag every link from now on, with `li` and `x` for Luis's own channels, kept out of the success bar.
- Payers will be measurable from `progress` (`sessions[].startedAt`, `items[].days`, `src/storage/progress-schema.ts:41-67`). Visitors only through the logger.

## 2. The unpaid fortnight, 5 to 18 Oct

### Gate

Posts name both prices, so nothing goes out before:
1. both prices are on the page;
2. Vercel Pro is on, since Hobby forbids commercial use;
3. the event logger (`04-codebase.md`, section 3) runs with its optional `view` event on, because Vercel cannot split visits by `?ref=`;
4. the privacy page names the logger and Vercel Analytics.

Payments and the email also need live checkout, which `02-money.md` puts at P1 (Stripe activation, the Managed Payments review, webhook, entitlements, terms) and may take longer than this fortnight. Until then, prices show as text with no buy button (`02-money.md` P0), and the posts still measure tries and returns. Hold Farang Can Learn Thai, the largest group, until checkout is live, but no later than Fri 16 Oct.

### Order, dates and tags

Tags match `[a-z0-9_-]{1,32}` (`src/waitlist-join.ts:22-26`). Post in the Bangkok evening and stay two hours to answer. If the gate slips, shift every date and keep the order.

| Date | Place | `?ref=` | Clip |
|---|---|---|---|
| Mon 5 | Join the groups and the server, verify the Discord phone, read the rules, send the permission messages | | |
| Tue 6 | Gate check and smoke test | `smoketest` | |
| Wed 7 | r/learnthai resource thread, a comment, 20:00 Bangkok (09:00 New York) | `rd-learnthai` | a still, if allowed |
| Thu 8 | Discord, once the mods agree. The email to the 13 goes at 09:00 on the morning checkout goes live, Thu 8 at the earliest | `dc-learningthai`, `email-waitlist` | c-suu-suu |
| Fri 9 | Farang Can Learn Thai, if checkout is live. If not, the day it goes live, Fri 16 at the latest | `fb-farangcanlearnthai` | c-suu-suu |
| Sat 10 | I Want to Learn Thai | `fb-iwanttolearnthai` | b-hear-write-read |
| Sun 11 | No post. Read week one. | | |
| Mon 12 | THAI LANGUAGE V2.0 | `fb-thailanguagev2` | b-hear-write-read |
| Tue 13 | Speak Thai Daily | `fb-speakthaidaily` | c-suu-suu |
| Any day | r/ThaiLanguage and Digital Nomads Thailand, only under a fitting question | `rd-thailanguage`, `fb-dnthailand` | none |
| Wed 14 to Sat 17 | Replies only | | |
| Sun 18 | Scoreboard read. Final read Tue 20, when the 13 Oct window closes | | |

### Each place's rules

reddit.com and private Facebook groups could not be read from here. Unverified means check by hand before posting.

| Place | Known | Check by hand |
|---|---|---|
| r/learnthai resource thread | The brief's link; resources go in as comments | Unverified: promotion rule, images in comments, karma floor |
| r/ThaiLanguage | Reactive only | Unverified: promotion rule |
| Farang Can Learn Thai | Private, since 2013, 24,000+ members in 2021; teachers link their own free material | Unverified: current rules, post approval |
| I Want to Learn Thai | Nothing public found | Unverified: all rules |
| THAI LANGUAGE V2.0 | Group 284182522051018, posts on word meanings | Unverified: all rules |
| Speak Thai Daily | Search found no group by this name | Confirm it exists |
| Digital Nomads Thailand | Reactive only; nomad groups usually allow a link only when asked | Unverified: this group's rule |
| Discord, Learning Thai Language | 1,582 members, 116 online (Discord API, 3 Oct); Thai-English, both ways; highest verification level | Which channel; ask the mods first |
| Reddit, sitewide | Content Policy rule 2: authentic content, no spam; the 10% rule is reddiquette | Disclose every time |
| Facebook, sitewide | The same link and text in many groups at once reads as spam | Vary the text, one group a day |

### Which clip goes where

| Clip | Length, size, shape | Shows | Use |
|---|---|---|---|
| `c-suu-suu.mp4` | 19.5 s, 1.5 MB, 4:5 | A miss graded (mǎa rising, written mid), Hear | Farang Can Learn Thai, Speak Thai Daily, Discord. Ad A later. |
| `b-hear-write-read.mp4` | 26.2 s, 3.2 MB, 4:5 | ไม้ใหม่ไม่ไหม้ไหม in four tones, Hear, write, Script | I Want to Learn Thai, THAI LANGUAGE V2.0. Ad B later. |
| `a-one-day.mp4` | 24.6 s, 5.8 MB, 4:5 | The comic day, no grade | A Meta ad later, not these posts |
| `riangeng-screen.mp4` | 62.7 s, 15 MB, 16:9 | The whole walk-through | Replies, when someone asks to see more |

- Discord's free upload cap rose from 10 MB to 20 MB on 13 Aug 2026, so all four fit.
- Reddit comments cannot carry video. If r/learnthai allows images in comments, attach a still of the graded miss: `ffmpeg -ss 6 -i c-suu-suu.mp4 -frames:v 1 grade.png`.
- The clips show the course; the landing try card uses the same grader and clips (`src/landing/TryCard.tsx:4`, `:18`, `:79`). Each ends on "Join the waitlist": fine for posts, re-cut with the prices before any ad.

### The posts, in full

If checkout is not live yet, add one line after the prices: "Payments open on [date]. The waitlist on the page gets one email when they do."

**r/learnthai resource thread** (a comment)

> rian gèng, a web course for spoken Thai. I built it.
>
> It teaches everyday spoken Thai in phonetic romanization first, the Paiboon system with every tone marked, and adds the Thai script later on the same words. You type each answer. Keys 1 to 4 mark the tone and keys 5 to 8 type ε, ɔ, ə and ʉ. A miss names the syllable and the tone you wrote, for example that mǎa is rising and you wrote it mid. Hear and Slower play a synthetic Thai voice, read from the Thai spelling.
>
> The cards on the page and a 25-word preview are free, with no account.
> https://riangeng.com/?ref=rd-learnthai
>
> The full course is $10 a year, or $20 forever, for the life of the course.
>
> Did the grade feel right? I would like to know where it was too strict or too loose.

**Farang Can Learn Thai** (with `c-suu-suu.mp4`)

> I built a small web course for spoken Thai, rian gèng, and I would like this group's view on one part of it, the grading.
>
> You hear a word and type it in phonetic romanization, the Paiboon system with tone marks. When a tone slips, it names the syllable and what you wrote, as in the clip, where mǎa is rising and the answer was mid. The voice is synthetic, one Thai neural voice read from the Thai spelling. The script comes later, on words you already say.
>
> The cards on the first page and a 25-word preview are free, with no account.
> https://riangeng.com/?ref=fb-farangcanlearnthai
>
> The full course is $10 a year or $20 forever.
>
> Did the grade feel right?

**I Want to Learn Thai** (with `b-hear-write-read.mp4`)

> Luis here. I made rian gèng, a web course that starts Thai with how it sounds. Words are written in phonetic romanization with tone marks, the Paiboon system, and the Thai script gets its own track later, on the same words.
>
> On each card, Hear and Slower play the word in a synthetic Thai voice. You type it, and the grader checks the letters and every tone.
>
> You can try the cards on the page and a 25-word preview without an account.
> https://riangeng.com/?ref=fb-iwanttolearnthai
>
> After that it is $10 a year, or $20 forever.
>
> If you try a few, did the grade feel right?

**THAI LANGUAGE V2.0** (with `b-hear-write-read.mp4`)

> ไม้ใหม่ไม่ไหม้ไหม, mái mài mâi mâi mǎi. The clip opens on that line, one sound in four tones, written the way my course writes it.
>
> I built rian gèng. It writes spoken Thai in Paiboon romanization with every tone marked, and you type each answer. A miss names the syllable and the tone you wrote. The Thai script follows on the same words. The audio is a synthetic Thai voice.
>
> Free cards and a 25-word preview, no account.
> https://riangeng.com/?ref=fb-thailanguagev2
>
> The full course is $10 a year or $20 forever.
>
> Did the grade feel right to you?

**Speak Thai Daily** (with `c-suu-suu.mp4`)

> I'm Luis, and I made rian gèng, a course built on a few Thai words a day.
>
> You hear each word and type it in phonetic romanization, the Paiboon system with tone marks. The grader checks the letters and each tone, and shows a slip on the syllable where it happened. Hear and Slower replay a synthetic Thai voice.
>
> The cards on the first page and a 25-word preview need no account.
> https://riangeng.com/?ref=fb-speakthaidaily
>
> The full course is $10 a year or $20 forever.
>
> Did the grade feel right?

**Discord, Learning Thai Language** (with `c-suu-suu.mp4`, after the mods agree)

> Hi all, posting with the mods' OK. I built rian gèng, a web course for spoken Thai in Paiboon romanization with every tone marked, and the Thai script later on the same words. You type each answer, and a miss names the syllable whose tone slipped. The audio is a synthetic Thai voice. If you speak Thai, tell me if any word sounds off.
>
> Free cards and a 25-word preview, no account. <https://riangeng.com/?ref=dc-learningthai>
> Full course $10 a year or $20 forever.
>
> Did the grade feel right?

**r/ThaiLanguage**, a reply, only under a question about speaking or romanization

> [Answer the question first, in two or three sentences, naming other good resources where they fit.]
>
> Disclosure, I built a course for this, rian gèng. It writes spoken Thai in Paiboon romanization with the tones marked, you type each answer, and a miss names the syllable whose tone slipped. The cards on the page and a 25-word preview are free without an account, then it is $10 a year or $20 forever.
> https://riangeng.com/?ref=rd-thailanguage
>
> If you try it, did the grade feel right?

**Digital Nomads Thailand**, a reply, only under a request for app recommendations

> [One or two honest options first.]
>
> Disclosure, I built one for speaking, rian gèng. Thai in romanization with tone marks, typed and graded per tone. Free cards on the page, then $10 a year or $20 forever.
> https://riangeng.com/?ref=fb-dnthailand

### Permission messages

**To the Discord mods**

> Hi, I'm Luis. I built rian gèng, a web course for spoken Thai, in romanization with tone marks first and the script later. Before posting anything, may I share it once, in whichever channel you prefer? It would be a short note saying I made it, a 20-second clip, the link, both prices ($10 a year or $20 forever), and one question, whether the grading feels right. The draft is below. If the answer is no, that is fine, and I won't post.

**To a Facebook group admin**

> Hi, I'm Luis, a member of [group]. I built a web course for spoken Thai, rian gèng, and I'd like to ask before posting. Would one post be OK? It says plainly that I made it, has a 20-second clip, the link and both prices ($10 a year or $20 forever), and asks members whether the grading feels right. If you prefer a promo day or a set thread, I'll use that. If it's a no, understood. The draft is below.

### Reply playbook

Answer within two hours on day one, then daily. No second accounts, no vote requests, no DMs to people who did not ask, and never argue twice. Log each grade complaint (word, typed answer, message) for docs 01 and 06.

| They say | Reply |
|---|---|
| Romanization is a crutch | Fair. Script is the second track, teaching each letter on words you already say, and the Thai can show beside the romanization from the start. |
| Is that a native speaker? | A synthetic Thai voice reading the Thai spelling, not a person. If a word sounds off, tell me which. |
| Are the drawings AI? | Yes, made with an image model. The grader is plain code, not a model. |
| Five tones, four keys? | Mid has no mark, so no key. Keys 1 to 4 mark low, falling, high and rising. |
| The grade was wrong | Thanks. What did you type, and what did it say? I'll fix it and reply here when it is live. |
| Why Paiboon, not RTGS? | RTGS marks neither tone nor vowel length. Paiboon marks both. |
| ฉัน is said chán | Written rising, often said high in speech, and the notes say so. If the clip and the grade disagree, tell me which card. (`01-content.md` asks a native speaker to check.) |
| Monthly? A trial? Refunds? | Neither; the cards and the 25-word preview are free. Refunds: in full within 30 days, once Luis adopts `02-money.md`'s rule. |
| Spam, or a removal | One reply: I built it, said so, and asked first where required. Never repost; ask the mods what would be OK. |

## 3. The email to the 13

**Hold it, and send it the morning checkout goes live, before that day's post.** The consent covers one message, "when the course is ready for that address" (`privacy.html:50`), and the page promised one email "when the course opens" (`src/landing/copy.ts:7`). Anything earlier spends it. With a checkout link, it can produce a payment. Free invites would fit the wording too, but break "no free trial" (`money.md`). These are warm leads, likely friends, so count them under `email-waitlist`.

Send from the company Gmail address on the privacy page, one recipient per message, plain text, and note the date sent per address. Anyone who joins from the posts before checkout gets the same email that morning, with the first line changed to their date.

> Subject: rian gèng is open
>
> Hi,
>
> On 29 September you left this address at riangeng.com, and the page said one email would come when the course opened. This is that email.
>
> I'm Luis, and I built rian gèng. It teaches spoken Thai in phonetic romanization first, the Paiboon system with every tone marked, and adds the Thai script later on the same words. You type each answer, and a miss names the syllable whose tone slipped.
>
> The course is $10 a year, or $20 forever, for the life of the course.
> https://riangeng.com/?ref=email-waitlist
>
> Pay with the address you want to sign in with. The page after payment lets you set a password and go straight in.
>
> The cards on that page and a 25-word preview are free, with no account, if you would like to look first.
>
> If you try it, one question. Did the grade feel right? A reply reaches me directly.
>
> This is the only email this list sends. If you would like to hear about later changes, reply and say so. To have the address deleted, reply with the word delete.
>
> Luis
> Pristine Mekong Pte. Ltd., Singapore

## 4. Paid ads on Reddit and Meta

### Verdict

At $10 and $20, ads will very likely cost more per payer than the payer pays. They still buy speed when posts stall, a clean test of which clip pulls tries, a test of one country, and an answer to whether strangers come back. Run them as research with a fixed cap, and only after the trigger: `growth.md:9` and `:31-33` forbid ad accounts in this phase.

### The math

Net per payer, from `02-money.md`'s fee table (a foreign card, a USD price, an SGD payout):
- plain Stripe: $8.95 a year payer, $18.43 a forever payer;
- Stripe with Managed Payments, which `02-money.md` recommends: $8.60 and $17.73, before any tax Link carves out of the price. A UK buyer's 20% VAT leaves about $6.90 and $14.40.

The brief caps the cost per payer at $10 and $20. After fees, break-even is nearer $8.60 and $17.70. Cost per payer is the cost per click divided by the share of clicks that pay.

| Cost per click | 0.5% pay | 1% pay | 2% pay | Needed for forever under $17.70 | Needed for year under $8.60 |
|---|---|---|---|---|---|
| $0.40, Meta Thailand | $80 | $40 | $20 | 2.3% | 4.7% |
| $0.70, Meta education | $140 | $70 | $35 | 3.9% | 8.1% |
| $1.50, Reddit education | $300 | $150 | $75 | 8.5% | 17.4% |
| $2.69, Meta US average | $538 | $269 | $135 | 15.2% | 31.3% |

Benchmarks:
- Meta, Education and Instruction: traffic CTR 1.50%, CPC $0.70; a lead, only an email, $26.31 (LocaliQ, 23 Sep 2026).
- Meta by country, all industries, 2026 estimates: CPC $0.40 Thailand, $1.80 Singapore, $1.95 UK, $2.10 Australia, $2.69 US.
- Reddit: CPC about $0.59 overall, CPM $3.50 to $5.00, CTR about 0.5%. Education CPC $1.50, cost per lead $30 to $80.
- Freemium apps turn 2.1% of downloads into payers by day 35. Education annual plans renew at a 24% median, and cheap annual plans of any kind at 36% (RevenueCat 2026). So a $10 year payer is worth about $13 to $16 over its life before fees, hence the brief's $10 cap until a renewal is seen.

### How a campaign would work

| | Reddit | Meta |
|---|---|---|
| Objective | Traffic, billed per click | Traffic, link clicks (landing page views need the pixel) |
| Audience | Community targeting on the subreddits that sent tries, likely r/learnthai and r/ThaiLanguage; widen only if too small with r/Thailand, r/Bangkok, r/chiangmai, r/languagelearning (sizes unverified) | Thailand first, one country per ad set, English, Thai language and language-learning interests. Interests are only suggestions now; exclusions ended 31 Mar 2025. |
| Geos | All, or US, UK, AU, CA, SG, TH | TH, then SG, UK, AU, US only if TH works |
| Placements | Feed and conversation | Feeds; Reels need a 9:16 cut |
| Creative | A `c-suu-suu`, B `b-hear-write-read`, 4:5; comments on, Luis answers | `a-one-day` against `c-suu-suu` |
| Line | "Type Thai the way it sounds. The grader names the tone you missed. $10 a year or $20 forever." | The same. Never "farang": Meta bans copy implying ethnicity. |
| Bidding | Manual CPC, capped at $0.80 | Lowest cost under the daily cap |
| Smallest budget | $5 a day per ad group (Reddit recommends $50) | $5 a day per ad set for clicks |
| First | An ad account for Pristine Mekong | Verification: beneficiary and payer for Singapore (since May 2025) and, if flagged, Thailand (since Oct 2025); Thailand's advertiser ID rules from early Nov 2026 may also ask for papers and a face match. Allow a week. |

### Tracking and the privacy page

- **First test: no pixel and no Conversions API.** Each ad gets its own ref (`rd-ad-suu`, `rd-ad-mai`, `fb-ad-day-th`, `fb-ad-suu-th`). The platforms report spend and clicks, the logger tries and returns, and checkout carries the ref into Stripe metadata (`02-money.md`). Optimizing for a conversion needs about 50 a week per ad set, which $100 cannot buy, and a pixel would break `privacy.html:47` and Principle 3 in `PRODUCT.md`.
- Pixels later: Meta Pixel plus Conversions API sharing an `event_id`, Reddit Pixel plus Conversions API sharing a conversion id. The privacy page would then name Meta and Reddit, the cookies (`_fbp`, `_fbc`, `_rdt_uuid` for 90 days), the purposes and the opt-out, with a notice on every page carrying a pixel (Meta Business Tools Terms) and consent first for EU and UK visitors. Thailand and Singapore PDPA: confirm with counsel.
- Never upload the 13 addresses as a custom audience.

### When

1. The unpaid posts reach 10 return tries in 7 days, or 3 payments (`growth.md:24`).
2. Only where a try or payment already came from (`growth.md:25`). Reddit can target r/learnthai itself. Meta cannot target a group, only interests, so Meta comes second.
3. Checkout is live, and the logger and refs work.
4. The first read is Sun 18 Oct, so the earliest test starts Mon 19 Oct. Payers need 7 more days to show use, so the earliest verdict is about Mon 2 Nov.
5. At most $10 per year payer until a renewal is seen, Oct 2027 at the earliest. Forever stays at $20 unless the buyer refers someone (`growth.md:26-27`).

### The first test

| Item | Setting |
|---|---|
| Platform and audience | Reddit, community targeting on the subreddits that sent tries |
| Budget and length | $100 lifetime, 7 days, CPC capped at $0.80 |
| Ads | A `c-suu-suu` (`rd-ad-suu`), B `b-hear-write-read` (`rd-ad-mai`) |
| My guess | 125 to 250 clicks, 30 to 80 tries, 0 to 3 payers |
| Success, all three | Under $10 per year payer or $20 per forever payer, by ref. Every payer answers a card 7 or more days after paying. At least 3 return tries from the ads. |
| Kill early | After $30: CPC over $1.50 or CTR under 0.3%. After $50: no try. Any time: comments show a wrong grade, so pause and fix. |
| After | Success: repeat once at $200. Otherwise stop; the $100 bought the answer. Meta only if a Facebook group sent tries: $70 over 7 days in Thailand, same rules. |

## 5. Metrics and the two-week scoreboard

| Metric | Definition | Source |
|---|---|---|
| Visit | A device with a `view` that day | Logger |
| Try | A device with at least one `check` | Logger |
| Engaged try | A device with 3 or more `check` on one day | Logger |
| Return try | A device with a `check` on a later local day, within 7 days of its first, counted once | Logger |
| Intent click | A `price_click`, year or forever | Logger, once buy buttons exist |
| Payment, refund | A paid Checkout by plan with the ref in metadata; a refund or dispute | Stripe |
| Still using | A payer who answers 7 or more days after paying | Supabase `progress` |
| Waitlist join | A row and its source | Supabase, works today |

A device takes the ref of its first `check` day. In-app browsers keep their own storage, so counts are lower bounds. Vercel already gives visitors per day, pages, referrer domains, country and device, but not the ref, tries or returns: its visitor hash resets every 24 hours and its Pages panel drops query strings. Pro adds custom events with 2 properties; UTM needs the $10 a month Plus add-on.

Daily query on the logger's `events` table. For the bar, count return tries whose return day falls in the last 7 days.

```sql
with d as (
  select device, day, min(ref) as ref, count(*) as checks
  from public.events where name = 'check' group by device, day
), f as (
  select distinct on (device) device, day as first_day, ref from d order by device, day
), dev as (
  select f.device, f.ref,
    bool_or(d.checks >= 3) as engaged,
    bool_or(d.day > f.first_day and d.day <= f.first_day + 7) as returned
  from f join d using (device) group by f.device, f.ref
)
select coalesce(ref, 'none') as ref, count(*) as tries,
  count(*) filter (where engaged) as engaged,
  count(*) filter (where returned) as return_tries
from dev group by 1 order by 2 desc;
```

| Ref | Posted | Visits | Tries | Engaged | Returns | Price clicks | Paid year | Paid forever | Refunds | Waitlist |
|---|---|---|---|---|---|---|---|---|---|---|
| `rd-learnthai` | Wed 7 | | | | | | | | | |
| `email-waitlist` | checkout day | | | | | | | | | |
| `dc-learningthai` | | | | | | | | | | |
| `fb-farangcanlearnthai` | Fri 9 | | | | | | | | | |
| `fb-iwanttolearnthai` | Sat 10 | | | | | | | | | |
| `fb-thailanguagev2` | Mon 12 | | | | | | | | | |
| `fb-speakthaidaily` | Tue 13 | | | | | | | | | |
| `rd-thailanguage`, `fb-dnthailand` | reactive | | | | | | | | | |
| none | | | | | | | | | | |
| Bar | | | | | 10 in 7 days | | 3, either plan | | | |

## 6. Kill or adjust rule (my proposal)

Per place, 72 hours after its post: 20 or more visits and no try means the page lost them, so change the opening line or clip before the next place. Under 5 visits means nobody saw it. Do not repost.

At the read on Sun 18 Oct, final on Tue 20 Oct:

| Result | Reading | Next |
|---|---|---|
| Under 30 tries in total | Reach or message | Three more places, a new opening line. No ads. |
| 30 or more tries, under 3 return tries | The first sitting does not bring people back | Stop posting, fix the first run (docs 01 and 06), retest on new places |
| 10 or more return tries, no payment, under 5 price clicks | Use without buying intent | Test the price block and page copy, not ads |
| 5 or more price clicks, no payment | Checkout friction | Walk the checkout on a phone inside Facebook's and Reddit's in-app browsers |
| The brief's bar is met | Enough to test paid | Section 4's test, and keep posting |

Payments from `email-waitlist`, `li` and `x` count, but at least 2 of the 3 should come from a learner place, since friends buy to be kind.

Hard stop: by Sun 1 Nov, under 5 return tries and no payment after all 8 places and 300 visits. Pause public posts and talk to 10 people who tried and replied before building more.

## Blockers and decisions for Luis

Blockers:
1. Prices on the page, Vercel Pro, the logger with `view`, and the privacy text. Without the logger, the fortnight yields only waitlist counts.
2. Live checkout with `02-money.md`'s pay-first success page, before the email and the largest group.
3. Mod and admin answers, asked on Mon 5. Confirm that Speak Thai Daily exists.
4. Reddit account history. Check r/learnthai's karma floor by hand.

Decisions:
1. Accept the tag list.
2. Post once prices and the logger are live, even before checkout (recommended), or wait for checkout.
3. Send the one email the morning checkout goes live (recommended).
4. No ad accounts until the trigger. Then $100 on Reddit, and $70 on Meta only if Facebook sent tries.
5. No pixel, accepting that the platforms cannot optimize for payments.
6. Whether network payments count toward the 3.

## Sources

Checked 3 Oct 2026.
- Vercel Analytics plans and custom events (25 Aug 2026): https://vercel.com/docs/analytics/limits-and-pricing
- Vercel Analytics panels, UTM on Plus (16 Sep 2026): https://vercel.com/docs/analytics/using-web-analytics
- Vercel 24-hour visitor hash (26 Jun 2026): https://vercel.com/docs/analytics/privacy-policy
- `?ref=` not shown by Vercel: https://github.com/vercel/vercel/discussions/11571, https://community.vercel.com/t/which-referrer-url-parameter-does-vercel-track/6886
- Discord 20 MB from 13 Aug 2026: https://x.com/discord/status/2087987317298360489, https://tech.yahoo.com/apps/articles/discord-raises-free-upload-limit-144632691.html
- Discord server counts: https://discord.com/api/v10/invites/Jpz9Z5EShX?with_counts=true
- Farang Can Learn Thai (2021): https://mythailanguageblog.wordpress.com/2021/04/11/farang-can-learn-thai-language-facebook-review/
- THAI LANGUAGE V2.0: https://www.facebook.com/groups/284182522051018/
- Reddit self-promotion (2 Jul 2026): https://redship.io/blog/reddit-self-promotion-rules
- Reddit $5 a day (search snippet, fetch refused): https://business.reddithelp.com/en/categories/billing-payment/how-much-do-reddit-ads-cost
- Reddit $50 recommended, placements: https://business.reddithelp.com/articles/Knowledge/Set-up-a-Reddit-Ads-Campaign
- Reddit bidding: https://business.reddithelp.com/articles/Knowledge/How-much-do-Reddit-Ads-cost
- Reddit targeting: https://business.reddithelp.com/articles/Knowledge/Overview-Reddit-Ads-Audience-and-Targeting
- Reddit Pixel and CAPI: https://business.reddithelp.com/articles/Knowledge/supported-conversion-events, https://business.reddithelp.com/articles/Knowledge/capi-pixel-gtm
- Reddit cookie: https://business.reddithelp.com/s/article/Opt-out-of-first-party-cookies, https://cookiesentry.com/cookies/_rdt_uuid
- Reddit video specs: https://www.stackmatix.com/blog/reddit-ad-specs
- Reddit costs: https://www.shno.co/marketing-statistics/reddit-ads-statistics, https://benly.ai/learn/reddit-ads/reddit-ads-cost-benchmarks (24 Mar 2026)
- Meta minimum budgets: https://en-gb.facebook.com/business/help/203183363050448 (did not render here), https://www.stackmatix.com/blog/meta-ads-minimum-daily-budget-2026
- Meta education benchmarks (23 Sep 2026): https://localiq.com/blog/facebook-advertising-benchmarks/
- Meta by country (10 Sep 2026): https://www.adamigo.ai/blog/meta-ads-cpm-cpc-benchmarks-by-country-2026
- Meta targeting in 2026 (search summary, fetch refused): https://www.jonloomer.com/meta-ads-targeting-2026/
- Meta Conversions API: https://developers.facebook.com/docs/marketing-api/conversions-api
- Meta Business Tools Terms: https://www.facebook.com/legal/businesstech
- Meta personal attributes: https://transparency.meta.com/policies/ad-standards/objectionable-content/privacy-violations-personal-attributes/
- Meta and Singapore (6 Mar 2025): https://www.socialmediatoday.com/news/meta-implements-ad-requirements-singapore/741810/
- Meta and Thailand (27 Oct 2025, search summary): https://ppc.land/meta-expands-advertiser-verification-for-thailand-campaigns/
- Thailand advertiser ID law: https://lexbangkok.com/thailand-social-media-advertising-law-kyc-2026/, https://www.biometricupdate.com/202605/thailand-mandates-biometric-idv-for-all-social-media-advertisers-to-curb-scams
- Stripe Singapore fees: https://stripe.com/en-sg/pricing
- RevenueCat 2026: https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026, https://www.revenuecat.com/blog/growth/average-subscription-renewal-rates-by-app-category
