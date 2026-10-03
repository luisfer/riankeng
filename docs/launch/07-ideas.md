# 07. Other ideas for the product and the repo

Pre-flight agent 7 of 7. Sat 3 Oct 2026. Stage: validation and waitlist (`docs/claude-agents/README.md:5`). Web facts are as of today. Sources are at the end.

## Verdict

- The best ideas for the next two weeks cost Luis's time, not code. The top five need about 12 hours over the fortnight and two small code changes.
- Price is not the open question. At $10 a year or $20 forever, rian gèng is the cheapest paid Thai course I found, and none of the Thai apps I checked says it grades typed romanization by tone. The open question is who it is for. Make the beachhead the thing to learn by Sun 18 Oct.
- Most new Thai apps this year are script first or AI speech. Romanization first is an open lane, but script first is the common advice to learners, so every pitch should name the bridge to Script.
- One risk turned up on the way: the licence of the voice clips. Clear it before the first live charge (see "Before the first live charge").

## The market this month

| Product | Price | Approach |
|---|---|---|
| rian gèng | $10/year, $20 forever | romanization first, typed answers, tone-aware grade |
| Jamkham | $5/month, $30/year, $39 lifetime; "founding" price ends 15 Oct | script first |
| Phuut | $4.99/month | script first, tone detection by microphone |
| SatawBerry | $9.99 to $44.99/month | AI voice tutor |
| Ling | $16.99/month, $89.99/year, $219.99 lifetime | 60+ languages |
| Pimsleur | $19.95/month; Thai is 1 level, 30 lessons | audio only, no script |
| ThaiPod101 | $4 to $23/month on 24-month terms, 60-day refund | podcast lessons |
| Glossika | about $17 to $20/month | sentence repetition |
| Paiboon, "Thai for Beginners" | $20.95 to $40.95, book and CDs | the same romanization |
| A Thai tutor on italki or Preply | about $5 to $30 an hour | live lessons |
| Duolingo | no Thai course | |

What it means: $20 forever is about the price of one Thai textbook or one tutor hour. The barrier is trust and fit, not price.

## Ranked ideas

Ranked by validation value over effort. Ties go to what can start sooner.

| # | Idea | Signal | Effort | When | Brief check |
|---|---|---|---|---|---|
| 1 | Two pitches, one product | positioning: engaged tries per pitch | 1 h, copy only | first post | none |
| 2 | Concierge the first ten | returns, payments, reasons | 30 min a person | launch week on | none |
| 3 | Phrase of the week from her day | return tries | 2 h, then 1 h a week | Mon 12 Oct | opt-in only (`privacy.html:50`) |
| 4 | Report-a-card link | engaged learners, content errors | 1 to 2 h | launch week | none |
| 5 | Native review, named and paid | trust; fewer public corrections | 2 to 3 h plus one lesson | Sun 4 or Mon 5 Oct | none |
| 6 | "Why Thai?" in one tap | beachhead, per sign-up | 3 to 5 h | launch week | privacy line |
| 7 | Payer referral tags, no reward | word of mouth | 1 h | with Checkout | a reward hits `learning.md:21`, `code.md:28` |
| 8 | Price learning inside the ladder | price | 1 to 2 h | with Checkout | no discounts (`money.md:11`) |
| 9 | `npm run numbers` | every signal, weekly | 3 to 4 h | week 1 | none |
| 10 | Real quotes, with permission | trust | 1 h | week 2 | `PRODUCT.md:47` |
| 11 | Preflight, CI, release checklist | none; protects the posts | 2 to 3 h | before first post | none |
| 12 | Partners who already use this romanization | homework returns; positioning | 3 to 4 h | week 2 | no free student accounts (`money.md:12`) |
| 13 | The landing remembers | return tries | 1 day | week 2 | none |
| 14 | A Paiboon typing pad | tries from romanization users | 3 to 4 h | after 18 Oct | none |
| 15 | Ten phrase pages as reply links | tries per page | 1.5 to 2 days | after 18 Oct | needs Vercel Pro |

### Notes

**1. Two pitches, one product.** Same demo, two one-line promises. "Speak first": everyday Thai in a romanization with tone marks, graded as you type, for groups of people living in Thailand. "Script bridge": every Thai letter taught on a word you already say, for script-first places such as r/learnthai. Add the pitch to agent 03's tag (`sp-` or `sc-`, within 32 characters, `src/waitlist-join.ts:25`). Judge by engaged tries per visit and payments, not sign-ups (`growth.md:11`). Small numbers and the place confound it, so aim for direction. Script is not an upsell: splitting it would change the locked ladder (`money.md:11`). It is the hook for script-first places and the reason to renew.

**2. Concierge the first ten.** Luis writes by hand to each payer within a day, from pristinemekong@gmail.com (`waitlist-email.md:9`), offers a 15-minute call, and checks in on day 3 and day 7: "Where did you stop?" Add five 15-minute calls with people who tried the demo and joined. Ask about the last time they tried to learn Thai, what they used and paid, and why they stopped, not whether they like this (The Mom Test). Hand contact raises the odds of a return and says why people pay. Stop at ten payers, and promise no features.

**3. Phrase of the week from her day.** Each Monday, one of the 40 lettered panels with its line, clip and pitch strokes, linked as `/?card=<stem>&ref=pow-01`. A few lines read `card` and open that card through the existing hook (`src/landing/TryCard.tsx:14`). The 40 panels are 40 weeks of material with no new drawing. Post only where mods allow it (`growth.md:14`), saying Luis built it (`growth.md:13`). The waitlist consented to one message (`privacy.html:50`), so email only those who opt in, by hand, since no provider is chosen (`waitlist-email.md:19`). Ask in agent 03's email: "Reply yes for one phrase a week."

**4. Report-a-card link.** A quiet "Report this card" mailto under each card in the demo, preview and course, filled in with the card id, the Thai and what was typed. No backend. It turns a native's public correction into a private one, and each report marks an engaged learner. Unlike agent 01's saved misses, it carries the learner's own words.

**5. Native review, named and paid.** Book one 60-minute lesson with a Thai teacher on italki or Preply and spend it on the 40 demo cards and 25 preview words: naturalness, politeness, gendered forms, the synthetic voice. Ask to quote one sentence with name and city, and say it was paid. One public correction in a launch thread costs more than a lesson, and a named reviewer is the only honest trust line on hand (`PRODUCT.md:47`). Keep it inside the lesson, since italki bans off-platform deals. Later, `npm run review-sheet` can export Voice 0 to 3 as a CSV for a deeper review.

**6. "Why Thai?" in one tap.** After the address is saved, the thanks line offers five optional taps: I live in Thailand, my partner is Thai, my family is Thai, a trip, other. Every sign-up becomes beachhead data, not only the tagged ones. It needs a column, the API, a test and a line in `privacy.html:39`. Zero-code version: ask the same in agent 03's email to the 13.

**7. Payer referral tags, no reward yet.** Each payer gets a link with a plain tag (`?ref=p01`, never a name), and Checkout metadata keeps `currentRef()` (one line in agent 02's build). `growth.md:27` lifts the forever cap only for someone who refers, so see a referral before designing a reward. A credit or discount would hit `learning.md:21` and `code.md:28`.

**8. Price learning inside the ladder.** Prices untouched (`money.md:11` to `12`). Record the year and forever split of the first ten payments. If most choose forever, a renewal may never be seen and `growth.md:26` never unlocks more spend; that is the input for a ladder review after validation. Ask once, on the paid thanks page or in the concierge email: "What would you have paid?" Test one honest anchor in one pitch: "$20 once, about the price of one Thai textbook." No discount codes and no countdown. A deadline like Jamkham's would be invented urgency.

**9. `npm run numbers`.** Prints the week: tries, engaged and return tries (once agent 04's return event exists), waitlist by tag and day, "Why Thai?" answers, payments by plan. It reads `.env.local` without printing keys and appends a line to an uncommitted CSV. It makes the exit rule (`growth.md:24`) a Sunday habit. Aggregates only.

**10. Real quotes, with permission.** Ask to quote people who answer "did the grade feel right?" or speak on a call: exact words, first name or handle, a link to the thread. Show nothing until there are three (`PRODUCT.md:47`, `social.md:11`). Remove on request.

**11. Preflight, CI and a release checklist.** `npm run preflight` runs test, typecheck, validate, build and the copy lint, and checks that every public clip exists (`src/gate-token.ts:29`). A GitHub Action runs it on push; the repo has no `.github` folder. The checklist: deploy, open `/` on a phone, finish one card, join with a test tag, read the function log, check the link preview in Facebook's Sharing Debugger, tab through a card by keyboard. A broken page during a post wastes the post.

**12. Partners who already use this romanization.** Five Thai tutors who teach from the Becker books get a free account. Their students use the tutor's tag and pay the normal price, since free student accounts would be the free trial `money.md:12` rules out. Reach tutors on their own sites, not through italki messages. Send one letter to Paiboon Publishing: what rian gèng is, how it credits the system (`index.html:258`, `terms.html:47`), and a request for a review. Until they answer, keep "Paiboon" out of pitches. Relocation and visa agents come later, once a segment pays.

**13. The landing remembers.** Every visit starts at tea, mango, door (`src/landing/main.tsx:248`), and the try card keeps no state. Resume at the first card not yet right, and give the count in words, as the end of a sitting does ("Nine of forty."). Optionally letter the panels met, as Her day does in the course (`src/ui/HerDay.tsx:14`). Fail quietly when storage is off, as `src/landing/ref.ts` does.

**14. A Paiboon typing pad.** A public page with the course's own input: 1 to 4 set the tone, 5 to 8 type ε ɔ ə ʉ, and a Copy button, for notes and flashcards. Converters from Thai script exist (Thai Script Master, thai-language.com, SornSabai); I found no typing pad. Only romanization users need one, so its users are the beachhead. Skip a tone quiz or a converter: free ones exist (ThaiLearn, Thai Tone Reader).

**15. Ten phrase pages as reply links.** Static pages from ten demo cards, whose clips are already public. For example `/say/not-spicy` from `p:mâi pèt`: the panel, Thai, romanization with pitch strokes, Hear and Slower, the live card, one usage note, both prices, the waitlist and a share image. Use them to answer "how do I say X" in threads (`growth.md:14`). Search is a slow bonus: Ling, Thailo and others already hold "no spicy in Thai". Keep the pages few and hand-checked, because Google enforces its scaled content abuse policy (the March 2026 spam update). Needs a sitemap, which the site lacks, and Vercel Pro.

### Considered and folded in

- Script as an upsell: no, see 1.
- Offline as a selling point: true for a sitting once it opens (`DESIGN.md:49`). One line in a traveller pitch at most, since travellers are likely the least to renew. No whole-course download yet.
- Accessibility: a keyboard pass in the checklist (11). Not a lead message.
- An Anki deck of the demo phrases: no. It gives the clips away while their licence is open.
- A gift purchase by a Thai partner: later. It needs Checkout work.

## Before the first live charge: the voice licence

Not an idea, a risk found while researching. The clips come from edge-tts (`PRODUCT.md:20`, `scripts/gen-audio.py:2`), an unofficial client of Microsoft Edge's Read Aloud service. On 22 Jun 2026, a Microsoft Q&A moderator said no public document addresses commercial use of those voices, and pointed to Microsoft's legal team for certainty. The same voice, th-TH-PremwadeeNeural (`scripts/gen-audio.py:23`), is sold through Azure Speech under commercial terms. All 1,638 clips hold 12,198 Thai characters. At about $16 per million characters, a full re-voice costs under $1 on a paid key. Add 2 to 4 hours to adapt the script and re-hear the 40 demo clips. Do it before the first live charge. Confirm with a lawyer.

## Three things not to do now

1. **Pages for all 1,638 clips.** Tempting, because the words and clips exist. It pays off in months, not this fortnight, and invites the scaled content penalty. It would also make public the course audio that `src/gate-token.ts:29` keeps to the demo and preview, which widens the licence question. Ten pages (15) are enough.
2. **An AI speaking tutor or microphone tone scoring.** SatawBerry and Phuut already sell it. Per-minute model costs do not fit $10 a year, and any model brings the guardrails in `learning.md:14`. It also changes what the launch tests: typed romanization with a tone-aware grade.
3. **The next 50 panels.** Batch 03 is in progress (`art/shots.md:25`). The 40 lettered panels already cover the demo and 40 weeks of phrase posts. New art moves no launch number, and Luis's hours are the scarcest input this fortnight. Pick it up when a segment pays.

## The big bet after PMF

**The engine for a second tonal language, Cantonese first.** The hard parts of rian gèng are not Thai-specific: a typed romanization with a tone-aware grade (`src/engine/grader-thai.ts`), pitch strokes (`src/ui/tone-contour.ts`), a neural clip per card, the comic pipeline (`art/STYLE.md`) and the scheduler. Cantonese has about 85 million speakers and no Duolingo course for English speakers, and courses for English speakers usually teach through a romanization (Jyutping or Yale). Heritage learners and partners are the obvious buyers. Risks: two competing romanizations, six tones, and the same need for a native reviewer and a licensed voice. Gate it on Thai: renewals seen (`growth.md:26`) and steady weekly returns. It would be a new product with its own name; rian gèng's "forever" stays Thai.

## Decisions for Luis

1. Approve the two pitches (1), and Sun 18 Oct as the day to name the beachhead from the "Why Thai?" taps, the calls and any payments. My expectation: people who live in Thailand, and partners of Thais. Travellers are likely to renew least, and heritage learners usually want Script first.
2. Voice licence: re-voice on a paid Azure key before the first live charge, or get Microsoft's answer in writing. Confirm with a lawyer.
3. More than one email to the waitlist: opt-in by reply (recommended), or change `privacy.html:50` for new sign-ups. Confirm with a lawyer (Singapore PDPA).
4. Pause new panels until 18 Oct: yes or no.

## Sources (checked 3 Oct 2026)

- Jamkham pricing: https://jamkham.com/pricing/ and positioning: https://jamkham.com/compare/duolingo/
- Phuut comparison, 6 Jun 2026: https://phuut.app/articles/en/practical/thai-language-app-comparison/ and the script-first argument: https://phuut.app/articles/en/script/learn-thai-without-romanization/
- SatawBerry, 19 Sep 2026: https://satawberry.com/vs/duolingo-thai
- Ling pricing, 13 Feb 2026: https://help.ling-app.com/en-us/faqs/ling-premium-subscriptions-what-options-do-i-have-and-how-much-do-they-cost
- Pimsleur Thai content and price, 8 Jun 2026: https://studythai.ai/blog/studythai-vs-pimsleur
- ThaiPod101: https://www.thaipod101.com/pricing
- Glossika: https://www.alllanguageresources.com/glossika/ and https://languavibe.com/glossika-review/
- Paiboon book: https://paiboonlanguageacademy.com/product/thai-for-beginners/
- Thai tutor rates: https://ling-app.com/blog/learn-thai-with-a-tutor/ and https://www.italki.com/en/teachers/thai
- italki contact rules: https://support.italki.com/hc/en-us/articles/215325898-italki-teacher-policies-teacher-code-of-conduct
- No Thai on Duolingo: https://ling-app.com/blog/no-thai-on-duolingo/
- "No spicy" results: https://ling-app.com/blog/no-spicy-in-thai/ and https://thailo.app/no-spicy-in-thai/
- Free Thai tools: https://www.thaiscriptmaster.com/tools/romanization, http://www.thai-language.com/?nav=dictionary&anyxlit=1, https://sornsabai.com/tools/transliterate, https://thailearn.app/, https://www.thaitonereader.app/
- Scaled content abuse: https://developers.google.com/search/docs/essentials/spam-policies and the March 2026 update: https://www.searchenginejournal.com/google-begins-rolling-out-the-march-2026-spam-update/570428/
- edge-tts and commercial use, 22 Jun 2026: https://learn.microsoft.com/en-au/answers/questions/5925556/commercial-use-of-edge-read-aloud-voices-via-edge
- Azure Speech pricing: https://azure.microsoft.com/en-us/pricing/details/cognitive-services/speech-services/ and https://texttolab.com/blog/azure-text-to-speech-pricing
- Cantonese gap: https://ling-app.com/blog/no-cantonese-on-duolingo/ and https://www.uselearnai.com/blog/best-way-to-learn-cantonese-2026
- Concierge and interviews: http://paulgraham.com/ds.html and https://www.momtestbook.com/
