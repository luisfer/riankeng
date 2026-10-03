# Content and lessons, pre-flight

Agent 1 of 7, briefs `learning.md` and `social.md`. Written Sat 3 Oct 2026 for the week of Mon 5 Oct.

## Verdict

The Thai is ready. I found no wrong spelling, tone or romanization in the 40 demo cards, the 25 preview words, or the 235 entries of Voice 0 to 2. Validation and the five content suites pass. The demo is not ready: five small fixes, and three words in the terms, should land before the first post, with no new content. A native speaker should hear two clips and read five lines before Monday.

## 1. Accuracy spot-check

Scope:
- The 40 cards in `src/landing/demo.ts:22-383`. `index.html` has no `data-entry` rows now: `src/landing/comic.ts:87-104` paints its empty slots from `DEMO` (`tests/landing.test.ts:20-27`). Its static Thai (tea card `:171-193`, waitlist button long chʉ̂ʉ rɔɔ, ลงชื่อรอ `:87-88`, wordmark) is correct.
- The 25 words in `src/preview/catalog.ts:9-35`.
- Voice 0 to 2 in `content/words/level-00.ts` to `level-02.ts`, `content/phrases/level-01.ts`, `level-02.ts`, and `content/levels.ts:3-45`.

Tones were checked from consonant class, syllable type and mark. The ไหม homograph already has its own clip text (`scripts/gen-audio.py:25-29`).

| # | Where | Issue | Fix | Severity |
|---|---|---|---|---|
| 1 | `content/phrases/level-01.ts:9` | The note says Literally "well, yes?". mái asks, it does not mean yes. | Literally "comfortable and good?" mái makes it a yes or no question. | Low |
| 2 | `src/ui/Account.tsx:24-29` | The trail says "Khun Luis". The course writes คุณ as kun (`content/words/level-01.ts:14`). | Pick one: kun in the romanization face, or Khun as an English honorific. | Low |

Check with a native speaker:

| Item | Where | Question |
|---|---|---|
| ฉัน, เขา | `w:chǎn` (preview, Voice 1), `w:kǎo` (Voice 0) | Written rising, said high in speech, as the notes say (`level-01.ts:13`, `level-00.ts:19`). If a clip says chán or káo, a listening card plays one tone and grades another. Then accept the spoken form or override the clip. Medium, as chǎn is in the preview |
| pǒm dtʉ̀ʉn cháa | `content/phrases/level-02.ts:17` | ตื่นสาย, dtʉ̀ʉn sǎai, is the usual "woke up late" |
| จอดที่นี่ | demo "stop" | Correct. Riders often say จอดตรงนี้, jɔ̀ɔt dtrong níi |
| ลงชื่อรอ | `index.html:87-88` | Clear, but terse for "Join the waitlist" |
| Speak with Thainess. | `index.html:230` | ความเป็นไทย has state-campaign overtones for some Thai readers |
| ao … nɔ̀i | `content/levels.ts:66`, Voice 4 | Glossed "I will have a little". There nɔ̀i softens the request |

## 2. Tests

`npm run validate`, exit 0, per-level counts and the list of 64 left out:

```text
voice: 1638  script: 205
64 English prompt(s) shared by different Voice answers (the sitting accepts either):
content ok
```

The five suites, exit 0:

```text
 ✓ tests/grader-thai.test.ts (19 tests) 9ms
 ✓ tests/try-card.test.tsx (7 tests) 230ms
 ✓ tests/preview.test.ts (8 tests) 30ms
 ✓ tests/landing.test.ts (12 tests) 46ms
 ✓ tests/content.test.ts (10 tests) 431ms

 Test Files  5 passed (5)
      Tests  56 passed (56)
```

They hold the demo and preview to the course data, clips and copy rules, not to Thai. The lede is pinned at `tests/landing.test.ts:99-101`, so the lede fix edits that string.

## 3. Demo and preview against the settled loop

All six known gaps are confirmed. P0 is before the first post. P1 is before the first payment. `main.tsx` alone means `src/preview/main.tsx`.

| Gap | Confirmed at | Fix | P |
|---|---|---|---|
| Slower is 0.6 on the landing | `TryCard.tsx:130,149`. Preview `main.tsx:183` is 0.7. So is the course: `tts.ts:175` takes 0.7 of the rate, `tts.ts:113` divides by the 0.85 default (`progress-schema.ts:32`) | Export `SLOWER = 0.7` from `src/audio/rate.ts` for all three | P0 |
| "five tones", four keys, mid unmarked | `index.html:165-167` | New lede, section 4 | P0 |
| A card can be done unheard | Hear is click only (`TryCard.tsx:53-61`). The course autoplays (`Session.tsx:148-155`) and locks listening cards (`:336`, `:434-437`) | `play(1)` inside `goWrite` (`TryCard.tsx:63`), since Continue is a gesture. Same on the preview's Continue (`main.tsx:193`). Never block Check | P0 |
| No next step from the card | After Right, only Next card (`TryCard.tsx:197-201`) | A text link, Join the waitlist, to `/#close` beside it. `openWaitlistAt` opens the form (`src/landing/main.tsx:199-208`) | P0 |
| Preview waitlist after 25 words | `main.tsx:104-105`, link only in Finish (`:55-57`) | The same link in the nav row (`main.tsx:227-237`), always | P0 |
| A miss keeps the wrong text | Typing only clears the grade (`TryCard.tsx:166-170`). The course clears the field and holds an exact retype (`Session.tsx:251-255`, `:273-276`) | On wrong: clear, show "Retype the romanization.", grade the next Check exact against `grade.matchedTarget`. On a tone or length slip keep the text and slip line (`TryCard.tsx:179-183`), as the course does. Preview too | P1 |
| No skip | Only a panel click, which nothing mentions, loads another card (`src/landing/main.tsx:241`) | Text button Another card beside Hear and Slower, calling `next()` | P1 |
| Wraps after 40 | `TryCard.tsx:83` | After the last card, the night panel (`demo.ts:386-389`), "Forty lines of her day.", Join the waitlist as the commit, Start over as text | P1 |
| Found: hard card early | Card 6 is coffee, six syllables with ɔ, ε and ʉ (`demo.ts:415`) | `TRY_ORDER` tea, mango, door, thanks, nospicy, tired, bike, tooth, then the day. Short cards that bring in ɔ, ʉ, ə, dt and bp one at a time | P1 |
| Found: preview hides the grade | A slip says "Almost right." with the grader's sentence behind Hint (`main.tsx:84-92`, `:225-226`) | Show the sentence and slip line, as the landing does | P1 |

## 4. What a first-time visitor needs

Two lines. Replace `index.html:165-167` with:

> Thai has five tones. à is low, â falling, á high, ǎ rising, and mid has no mark.
> Keys 1 to 4 write the marks. Keys 5 to 8 type ε, ɔ, ə and ʉ.

Keep the `<br />` after the first line and the narrow break between the key sentences. The first card, chaa yen, is all mid, so it shows the rule at once.

P1: one line under the card on Look, only when the card has those letters, worded as `SYSTEM_SUMMARY` is (`content/system.ts:119-149`):

> g, bp and dt are the k, p and t of skin, spin and still. k, p and t carry a puff of air.
> ε as in cat, ɔ as in or, ə as in ago, and ʉ between i and u, lips flat.
> A doubled vowel is long, aa as in father.

The tone line also belongs under the Voice 0 chart (`LevelIntro.tsx:75`). Every line proposed here passes `tests/copy-rules.ts` and slopless.

## 5. Open questions in learning.md

### (a) First paid proof: Voice 0, sitting one

Recommend The sound system, sitting one: maa, máa, mǎa, mâi, mài, mái, mǎi, kâo.
- Every account starts there. Nothing changes.
- It proves what the demo cannot. The demo shows the romanization just before the write. Voice 0 asks "Which did you hear?" on minimal pairs, with tone picks and listening cards (`scheduler.ts:293-302`).
- It books the return the validation counts: cards come back after four hours, then a day (`srs.ts:11-19`).
- Its 50 words are checked here and all have clips.

The cost: the demo is phrases, Voice 0 is pairs. Voice 1 opens once all 50 are mastered, right on three separate days (`scheduler.ts:146-150`, `srs.ts:128-130`): day three at the earliest. Of the 40 demo lines, 6 are in Voice 1, 1 in Voice 2, 6 in Voice 3, 9 in Voice 4, 18 in Voice 6 to 16.

Measure sitting one finished within a day of access, and due cards sat within 48 hours.

### (b) Demo mistakes to keep

Every Check on the landing card and the preview. Typed text for misses only.

| Field | Example | Rule |
|---|---|---|
| card | w:má-mûang | In `DEMO_IDS` or `PREVIEW_IDS` |
| surface | landing | landing or preview |
| typed | ma-muang | Misses only. NFC, at most 60 characters of Latin letters, ε ɔ ə ʉ, tone marks, space, hyphen or apostrophe. Anything else, an @ say, drops it |
| verdict | tone | exact, tone, length, wrong, invalid |
| slips | 1:falling>mid | From `toneSlips` |
| ref | r-learnthai | `currentRef()`, `src/landing/ref.ts:41` |
| day | 2026-10-05 | UTC date set by the server |
| visit, optional | 2 | This browser's nth day of trying, counted locally. Return tries without an identifier |

No IP, cookie, user agent, visitor id or email. Post to an `/api/demo-check` built like `api/waitlist.ts`, origin check included (`src/waitlist-join.ts:84-92`). Log reasons, never rows.

Each week:
- Habits from other spellings (kh, ph, ee, sawasdee) get a grader sentence naming them, "kh is written k here.", with a test in `tests/grader-thai.test.ts`. The system never loosens.
- Slips per syllable tune the lede, the Look lines and `TRY_ORDER`. Marks on consonants mean the key strip is unclear.
- A miss a Thai speaker would accept, chán for ฉัน, goes to the native check, then into the data as an alternative, like kráp/kâ.

Privacy: `privacy.html:47` says no analytics, already untrue with PR #8. That edit should add: "Demo answers. On the demo cards, what was typed on a missed card, the card, the grade, the link's tag, and the day. Nothing that names the person, and no cookie." Plus a retention period. `PRODUCT.md:53` says nothing leaves the device. Amend it: the course stays on the device, the public demo reports grades. EU rules may treat the visit counter like a cookie. Confirm with a lawyer or the accountant.

## 6. Onboarding a new learner

Path: invite link, password on Log in (`src/landing/main.tsx:146-170`), hub (`Journey.tsx:118-148`), Voice contents, Level 0 intro with tone chart, examples and Begin (`LevelIntro.tsx:59-165`), then 16 seats with 8 new cards, autoplay on (`session.ts:60`, `progress-schema.ts:33-35`).

| Gap | Smallest fix | P |
|---|---|---|
| No line in the course on mid tone or the keys | The section 4 tone line under the Voice 0 chart | P1, P0 if anyone is invited first |
| Hub and track say Continue before anything is begun (`Journey.tsx:53`, `TrackPage.tsx:45`) | Begin while unseen, as `startLabel` does (`bits.tsx:15-18`) | P1 |
| Sitting one ends on "0 of 50 mastered" (`Finish.tsx:72-75`) | Under the meter: "Mastered is right on three separate days." | P1 |
| Demo phrases, then pairs | On the Voice 0 intro: "Every card here is a real word. A pair differs only in tone or length." | P1 |

## 7. Thai-specific risks

| Risk | Evidence | Level | Action |
|---|---|---|---|
| Polite particles | No demo line has kráp or kâ, so expect "she should say kâ". kɔ̌ɔ already asks politely, Voice 1 teaches both (`level-01.ts:5-7`), and the voice says ค่ะ (`gen-audio.py:41-43`) | Low | Keep, have the reply ready |
| Gendered speech | 81 Voice phrases use pǒm, 1 uses chǎn, 14 of 28 in Voice 2, all in a woman's voice (`gen-audio.py:23`), which sounds marked. From English, chǎn counts (`twins.ts:45-52`). No such phrase in the demo or preview | Medium, paid | Now, on Voice 1's intro: "The voice is a woman's. A woman says chǎn where a card has pǒm, and either is right when writing from English." Later: a male voice for those lines (breaks `PRODUCT.md:20`), or drop the subject where Thai does |
| Register | kun in 6 demo lines is textbook polite. gèp dtang and 555 are casual. A normal mix | Low | None |
| Spoken tone | chǎn, kǎo, see section 1 | Medium if high | Listen before Monday |
| Voice wording | `terms.html:44,53,57` say recordings and recorded clip | P0 | 44: "synthetic voice clips". 53: "A voice clip is fetched over the network the first time it plays." 57: "a missing clip". Fold into agent 2's terms edit |
| Clip licence | edge-tts (`gen-audio.py:2`) is an unofficial client of Edge's read-aloud voice. Azure sells the same voice with clear terms | P1 | A lawyer confirms commercial use before the first payment |
| Script audio | No Script entry has a clip (the 1,638 manifest ids are all Voice). Script falls back to the device voice (`tts.ts:110-142`). Without one, Hear is silent, and only Account says why (`Account.tsx:523`) | Medium, paid | P1: play the Voice clip with the same Thai (123 of 205 have one), and voice the 82 letter cards with clip text overrides, as ไหม has |

## 8. Social scope

Nothing social is needed. Validation is solo access, the demo and the paid loop (`social.md:9-10`). Reject usernames, a friend graph, shared progress, leaderboards, leagues and friend-activity invites (`social.md:13-19`), learner counts, live activity or the waitlist count on any page (`social.md:11`, `PRODUCT.md:47`), share buttons, public progress pages and comments on cards. A referral screen waits: `growth.md:27` ties referral to the forever price later. The `?ref=` tags stay. They are attribution, not social.

## Decisions for Luis

1. Ship the five P0 demo fixes and the terms wording before the first post.
2. Voice 0 sitting one as the paid proof. Keep the Voice 1 rule, which forces returns, or open Voice 1 once Voice 0 is all met.
3. Demo capture: yes or no, privacy line, retention, `PRODUCT.md:53`.
4. pǒm in a woman's voice: a line now, new clips later.
5. Script clips: reuse and overrides, or the device voice.
6. edge-tts for paid use: ask a lawyer.
7. A native speaker for the check list before Monday.
8. Khun or kun.
