# 05. Exams and tests

Pre-flight agent 5 of 7, 3 Oct 2026. Post-PMF design only. Nothing here is part of the validation launch. Briefs: `docs/claude-agents/learning.md`, `docs/claude-agents/code.md`.

## Verdict

- **Possible: yes, with conditions.** The engine already grades the core skills without AI. What is missing is everything around a scored exam: server grading, a hidden item bank, opaque audio, paid identity and a ledger.
- **Not now.** Exams, certificates and the ledger are on both "do not build yet" lists (`learning.md:16-21`, `code.md:23-29`).
- **Shape.** Six Voice checkpoints of 30 items, then a 60-item Voice final. Script later. Mostly typed recall, timed, no feedback until the end, 80% to pass.
- **Must-haves.** Server grading. Items and clips served by the server under random names. One item at a time, with a nonce and an expiry. Cooldowns. One ledger row per first pass.
- **Effort.** Phase 1: 10 to 12 build days plus about 6 content days. Phase 2: 8 to 10 build days plus about 7.
- **Trigger.** 10 paying learners who have mastered all of Voice 0 to 3.
- **Certificate.** A dated score record, never a level.

## 1. What the engine grades today

Voice has 1,638 cards in 28 levels, Script 205 in 29 (`ENTRIES`, `content/index.ts:106-112`). All 1,638 clips are Voice (`src/audio/clip-manifest.json`).

| Skill | Where | Grading | Measures | For an exam |
|---|---|---|---|---|
| Hear, type romanization | `listen` (`src/ui/Session.tsx:258`, `:333`) | `gradeThai`: exact, tone slip per syllable, length, wrong (`src/engine/grader-thai.ts:27-71`). Only exact is correct (`:16`) | form recall from sound, tone, vowel length | Ready; the clip URL leaks the answer (section 3) |
| English to romanized Thai | `en-th` (`Session.tsx:257-268`). Twins accept the other right answer (`src/engine/twins.ts:30-52`) | `gradeThai` with alternatives | active recall | Ready. Store accepted answers per item; twins scan the whole catalog (`twins.ts:16-28`) |
| Tone discrimination | `tone`: letters without marks (`src/engine/tone-step.ts:22-26`), one pick per syllable (`:28-36`). Voice 0 pairs pick 1 of 2 to 6 (`src/engine/scheduler.ts:318-326`, 30 cards) | exact choice | tone identification by ear | Ready. Skip the unstressed "a" that accepts low or mid (`grader-thai.ts:47-55`) and slash forms (`scheduler.ts:313`) |
| Script reading | Script `th-en`: Thai shown, type romanization (`Session.tsx:333`, `:417`) | `gradeThai` | decoding spelling to sound and tone | Ready. Single words only |
| Script writing | Script `pick`: English shown, 1 of 4 spellings (`scheduler.ts:346-368`) | exact choice | spelling recognition | Recognition only. Thai typed answers are refused (`Session.tsx:259`, `:283`) |
| Meaning | Voice `th-en`: romanization shown, type English (`Session.tsx:280-289`, `:418-424`) | `gradeEnglish`: glosses, synonyms, fuzzy match, "No AI" (`src/engine/grader-en.ts:1-4`) | passive recall from writing | Ready |
| Listening comprehension | None. No card plays audio and hides the romanization while asking meaning | n/a | n/a | New item type, small: clip plus `gradeEnglish`. Words and short phrases only |

Grading is deterministic and tested: every entry grades exact against itself (`tests/syllables.test.ts:54`), and hedging every tone is not exact (`:60`). The risks are item sampling and cheating, not the scorer.

## 2. Exam formats

Sections by content. Voice: V1 levels 0-3 (301 cards), V2 4-7 (304), V3 8-11 (222), V4 12-16 (255), V5 17-21 (271), V6 22-27 (285). Script: S1 0-8 (40), S2 9-16 (51), S3 17-21 (50), S4 22-28 (64).

| | Voice checkpoint | Voice final | Script checkpoint | Script final |
|---|---|---|---|---|
| Items | 30 | 60 | 20 | 40 |
| Mix | 10 dictation, 8 English to Thai, 6 meaning from audio, 6 tone | 20 dictation (half phrases), 16 English to Thai, 12 meaning from audio, 12 tone. A quarter of clips in a second voice | 14 read and type romanization (5 never drilled, spelled with taught letters), 6 hear and pick the spelling | 26 reading (10 never drilled), 8 hear and pick, 6 tone from spelling |
| Time | 18 min | 40 min | 12 min | 25 min |
| Pass | 80% | 80%, and 60% in each part | 80% | 80%, 60% per part |
| Retake after a fail | 24 h, 3 tries per 7 days | 3 days, 2 tries per 14 days | as Voice | as Voice |
| Opens for | any paid account | all Voice checkpoints passed (server record) | any paid account | all Script checkpoints passed |
| Points (agent 6 sets) | about 50, first pass | about 200 | about 50 | about 200 |

- **Scoring.** Typed Thai: 1 for exact, 0.5 for a tone or length slip, 0 for wrong. Meaning and choices: 1 or 0. A tone item scores only if every syllable is right. Knowing every word but no tones tops out near 50% on typed items, so it fails.
- **Clips.** Two plays, the second may be Slower. A clip that fails voids the item. Never fall back to speech synthesis.
- **Pass mark.** 80% is the mastery bar in Guskey's account [6]. It is provisional: a cut score is a judgment to check against results [7]. With 30 items a learner near the cut can be misclassified, so review it after the first 30 passes.
- **Retakes.** Each try draws a new form and skips items from the last two tries. Mastery learning uses a parallel second test, and a later pass counts as much as a first [6]. Retest gains are larger on identical forms [8]. After a pass, retakes are practice and pay nothing.
- **No-audio form** for silent mode (`src/storage/progress-schema.ts:15`): no dictation or tone items, named on the record.

**Recall, not recognition.**

| Drill today | Exam |
|---|---|
| New cards show both sides first (`src/engine/session.ts:82`, `:226-233`) | No teaching face |
| Feedback names the answer at once (`grader-thai.ts:111-131`) | Nothing until the end, then a review of misses |
| A miss holds you to retype it (`session.ts:21-26`) | One answer per item |
| Hear and Slower without limit (`Session.tsx:582-604`) | Two plays |
| One level plus 4 review seats (`session.ts:60-65`) | Interleaved across the section |
| The same prompts return on schedule | A third are new combinations of known words |
| Meaning cards show the romanization (`Session.tsx:418-424`) | Meaning items are audio only |
| Choices are common | Choices only for tones and spelling |
| Browser-graded, untimed | Server-graded, timed |

Recall is harder than recognition. Active recall (English to Thai) is hardest, and passive recall (meaning from audio) best predicted classroom performance [1]. Dictation is a long-standing integrative test [2]. Tone items should over-sample mid against low, which English listeners struggle with [3]. A checkpoint is also retrieval practice [4], and feedback after short-answer tests helps [5], hence the end review.

**Placement test.** Voice opens a level only when every card is mastered, right on 3 separate days (`scheduler.ts:145-150`, `src/engine/srs.ts:127-130`), so a learner who already speaks some Thai grinds Voice 0 to 3 for weeks. Up to 3 stages of 8 items (Voice 0-3, 4-11, 12-21), about 8 minutes, 6 of 8 moves on. The result sets the existing `opened` floor (`scheduler.ts:61-72`, `:92`), and `hereLevel` must learn to skip placed levels, since Continue still goes to the first unstudied one (`scheduler.ts:109-126`). No points, so the browser may grade it (`code.md:17`). About 2 days.

**Public placement as a growth tool: later, maybe.** EF built its free, unsupervised EF SET partly for branding [16]. A 10-item "where would you start" check takes about 2 days and no server. During validation it adds little: the demo already grades this way (`src/landing/TryCard.tsx:79`), and return visits are invisible (settled facts). The cheapest version is a tally at the end of the 40-card demo, which wraps with no call to action (agent 1's call). It names a rian gèng level, never a CEFR one.

## 3. Integrity architecture

What leaks today:
- The whole catalog ships in the course chunk (`dist/assets/learn-*.js` in a local build), and `/assets` is not gated (`middleware.ts:20-23`).
- A clip's file name is its romanization (`src/audio/clip-url.ts:7-13`, e.g. `/audio/w:kâao.mp3`), `public/audio/catalog.json` maps ids to Thai, and demo clips are public (`src/gate-token.ts:28-29`).
- A failed clip is read out by speech synthesis from the Thai text (`src/audio/tts.ts:110-131`).
- The browser writes attempts to `progress.doc` (`Session.tsx:233-241`), which the learner's JWT may update (`supabase/migrations/20260923140000_progress.sql:13`, `:24-27`).
- `api/*` has no rate-limiting code.

**Storage.** Supabase, service role only, as the waitlist does (`supabase/migrations/20260923110405_waitlist.sql:13-16`). Never in the Vite bundle.

| Table | Holds | Rule |
|---|---|---|
| `exam_items` | section, type, prompt without answer, every accepted answer, clip object, origin (card or new) | read only by the API |
| `exam_sessions` | user, exam, item order, started, expires, status, score | one open session per user |
| `exam_answers` | session, slot, item, answer, verdict, points, served and answered times, plays | unique (session, slot) |
| `points_ledger` (agent 6) | user, delta, reason, source | insert only, unique source |
| bucket `exam-audio` | clips under random names | private |

**Endpoints.** Vercel functions. The browser holds only a random session id. Server state is the truth.

| Endpoint | Does | Checks |
|---|---|---|
| `POST /api/exam/start` | picks items by blueprint, random order | Supabase JWT, as `accountMayPass` checks it (`src/gate-account.ts:3-20`); paid entitlement; no open session; cooldown |
| `POST /api/exam/next` | serves the next slot only: prompt, clip link, nonce; stamps the time | session open and unexpired, slots in order |
| `GET /api/exam/clip?t=` | streams the clip | HMAC token (`EXAM_SIGNING_KEY`): session, slot, 3-minute expiry, unique id, like JWT `exp` and `jti` [10]; 2 plays |
| `POST /api/exam/answer` | grades with server `gradeThai` or `gradeEnglish`, stores, replies "saved" | nonce unused, current slot, 200 characters at most |
| `POST /api/exam/finish` | scores; on a first pass writes the ledger row in the same transaction; returns result and review | idempotent; past expiry, blanks score 0 |
| `GET /api/exam/results` | the learner's own passes | JWT |

- **Rate limits.** One open session per user, 3 starts a day, 2 requests a second per session, 2 plays per clip, a per-IP cap. Postgres counters suffice. Typed answers under a second are flagged, not refused.
- **Replay.** Single-use nonces, unique slots, status only moves forward, unique ledger source, one paying pass per user and exam.
- **Points grant.** One Postgres function finishes the session and inserts `{user, +50, "pass:voice-1", source: session id}`. Corrections are reversing rows. The ledger never reads `progress.doc` (`code.md:20`). Drills grade in the browser, so agent 6 should cap drill points.
- **Port.** `gradeThai` is pure but imports through the `@content` alias without `.js` (`grader-thai.ts:1-2`, `src/engine/normalize.ts:1-9`), which Vercel's Node ESM cannot resolve (`tests/api-imports.test.ts:5-6`, `:21-27`). Fixing that plus a parity test over all 1,843 cards: half a day.

**Cheating vectors.**

| Vector | Defence | Left over |
|---|---|---|
| Answers in the public course JS | a third of items new; meaning items audio only; time limit | slow word lookups |
| Answer in the clip name or bytes | private bucket, random names, fresh clips | none material |
| Speech-to-text or a chatbot | time limit, two plays, latency flags; exact Paiboon is a narrow target | real, capped by the price |
| Copied answers | per-learner random forms, rotation, per-item pass rates watched | low |
| Shared account, someone else sits it | the holder is responsible (`terms.html:40`) | accepted |
| Many accounts | exams need a paid entitlement; points cut only that account's price | farming costs more than it pays |
| Tampered client or replayed requests | server grading, nonces, unique slots | none |
| An LLM in grading | none today, keep it so. Learner text never reaches a model that decides; model output never mints points | n/a |

No unsupervised test is cheat-proof. Across 49 studies, unproctored scores ran about 0.2 SD higher, less for content hard to search, and countermeasures did not close the gap [9]. So: make cheating harder than learning, and let the price cap the prize.

**Paid entitlement is a hard dependency.** Points discount a price, and payment makes account farming a loss. The shared `rk_gate` cookie (`api/gate.ts:14-20`) identifies no one, so exams use the Supabase user.

**Phase 1 effort.**

| Work | Days |
|---|---|
| Grader port and parity test | 0.5 |
| Schema, RLS, finish function, private bucket | 1.5 |
| Six endpoints with tests | 3 |
| Exam sitting (reuses `RomanInput`, tone picks), timer, end review | 2.5 |
| Blueprint, item picker, exclusions | 1 |
| Rate limits, flags, admin SQL | 1 |
| Ledger write | 0.5 |
| **Build** | **about 10 to 12** |
| Items: 60 per Voice checkpoint, half new, keys, clips (Luis) | 5 |
| Native review of new items and clips | 1 to 2 |

Every new clip needs native sign-off. The synthetic voice already misreads isolated ไหม (`scripts/gen-audio.py:25-29`), and a wrong clip marks a right learner wrong.

## 4. Certificates

`terms.html:37`: "The course does not award a qualification." The honest claim is narrow: this person passed this exam on this date with this score, online and unsupervised.

| Option | Wording | Use |
|---|---|---|
| A. Record | "Name passed the rian gèng Voice final on 4 May 2027, 52 of 60. It asks for Thai typed in Paiboon romanization, from a synthetic voice and from English. Taken online without supervision. Not a qualification." | Recommended |
| B. Score lines | "Dictation 18/20. English to Thai 15/16. Meaning 10/12. Tones 9/12." | Under A |
| C. Completion | "Completed all 28 Voice levels" | No. Progress is browser-written |
| D. Levels | "CEFR A2", "ILR 1", "Certified in Thai", "Fluent" | Never |

**Verification.** `riangeng.com/c/<id>` with a 128-bit random id. The page shows the record, the SHA-256 of its canonical text (also printed on the PDF), and "valid" or "revoked". Opt-in, with a display name the learner picks, and named on the privacy page. Open Badges 3.0 later, if learners ask [17].

**Why no CEFR or ILR alignment.**
- Linking to the CEFR takes the Council of Europe's five procedures: familiarisation, specification, standardisation, standard setting, validation [11]. Duolingo's mapping rests on a concordance study validated by an outside psychometric firm [12].
- US government ILR tests are for government staff only [13], and ILR speaking is rated by interview.
- The construct is narrow: typed romanization, words and short phrases, one synthetic voice, no speaking, no Thai writing, no conversation. Listening learned from one talker transfers less to new talkers [14], hence a second voice in the final (edge-tts also lists th-TH-NiwatNeural, checked 3 Oct 2026).
- Unsupervised scores run high [9].

Anyone who needs proof of Thai should take CU-TFL, Chulalongkorn's four-skill test with five levels [15].

## 5. Fit with validation

**Why post-PMF.**
- Validation asks whether people use the demo, return or pay (`docs/claude-agents/README.md:5`, `growth.md:11`). Exams answer a later question: does a goal keep payers going?
- Nothing to build on: no checkout, webhook or entitlement (`code.md:21`), 13 waitlist sign-ups, no payers.
- Points are a money promise. Naming them before they exist risks a misleading price claim (agent 2 to confirm). The forever-buyer gap is open, so checkpoints must be worth taking without points.

**Learn now without building.** Ask about past behaviour, not wishes [18]:
1. "Have you ever taken a test in a language you were learning? Which, and why?"
2. "Do you need to show your Thai to anyone: an employer, a school, a visa office?" Yes points to CU-TFL, not us.
3. To payers: "What almost stopped you paying?" Price makes points matter. Time or doubt makes them irrelevant.
4. Last, weighted lightly: "If passing a checkpoint took a few dollars off your next year, would you take it?"

**A fake door, only if honest** [19]. For payers only, at the end of Voice 3: "A checkpoint for Voice 0 to 3 is planned. Want one?" Yes opens "It is not built yet. Thanks, this was the question." Count yeses on the server (agent 4's event design). Never on the landing or at checkout, and never mention points.

**Trigger.** 10 paying learners who have mastered all of Voice 0 to 3 (agent 3's progress aggregates), with at least 3 saying yes or asking for a test unprompted. If points stay in the plan, the latest useful date is about 3 months before the first yearly renewals: around July 2027, if payments start this month.

## 6. Phases

| Phase | When | Work | Effort | Needs |
|---|---|---|---|---|
| 0 | Now | No build. Add the four questions to the reply playbook. Keep exams, points and certificates out of posts and the landing. Decide the forever gap (agent 6). | about 1 hour | none |
| 1 | At the trigger | Six Voice checkpoints, server grading, item bank, session API, ledger write. Placement in the browser, earlier only if payers who speak some Thai complain about grinding Voice 0 to 3 | 10 to 12 build days, about 6 content days | paid entitlement (agent 2), ledger (agent 6), Vercel Pro, Supabase backups (settled facts) |
| 2 | After 30 checkpoint passes | Voice final with a second voice, cut scores reviewed, certificate page, item statistics. Script checkpoints and final, with hear-and-pick, tone-from-spelling and new decodable words | 8 to 10 build days, about 7 content days | phase 1 live |

## Sources

All accessed 3 Oct 2026.

1. Laufer and Goldstein (2004), Testing vocabulary knowledge, Language Learning 54(3). https://onlinelibrary.wiley.com/doi/abs/10.1111/j.0023-8333.2004.00260.x
2. Oller and Streiff (1975), Dictation: a test of grammar-based expectancies. https://www.researchgate.net/publication/31291455_Dictation_A_Test_of_Grammar-Based_Expectancies
3. Wayland and Guion (2004), Training English and Chinese listeners to perceive Thai tones, Language Learning 54(4). https://www.researchgate.net/publication/227960170_Training_English_and_Chinese_Listeners_to_Perceive_Thai_Tones_A_Preliminary_Report
4. Roediger and Karpicke (2006), Test-enhanced learning, Psychological Science 17. https://www.researchgate.net/publication/7270829_Test-Enhanced_Learning_Taking_Memory_Tests_Improves_Long-Term_Retention
5. Kang, McDermott and Roediger (2007), Test format and corrective feedback. https://profiles.wustl.edu/en/publications/test-format-and-corrective-feedback-modify-the-effect-of-testing-/
6. Guskey (2010), Lessons of mastery learning, Educational Leadership 68(2). https://tguskey.com/wp-content/uploads/Mastery-Learning-3-Lessons-of-Mastery-Learning.pdf
7. Zieky and Perie (2006), A primer on setting cut scores, ETS. https://www.ets.org/Media/Research/pdf/Cut_Scores_Primer.pdf
8. Hausknecht and others (2007), Retesting in selection: a meta-analysis. https://digitalcommons.ilr.cornell.edu/articles/13
9. Steger, Schroeders and Gnambs (2020), Proctored and unproctored ability assessments, European Journal of Psychological Assessment 36(1). https://econtent.hogrefe.com/doi/10.1027/1015-5759/a000494
10. RFC 7519, JSON Web Token, sections 4.1.4 and 4.1.7. https://www.rfc-editor.org/rfc/rfc7519
11. Council of Europe (2009), Relating language examinations to the CEFR: a manual. https://rm.coe.int/1680667a2d
12. Duolingo English Test, Externally validated mapping between the CEFR and DET subscores. https://www.ciol.org.uk/sites/default/files/DET-CEFR-Alignment-CIOL-Validated.pdf
13. Interagency Language Roundtable, FAQ. https://www.govtilr.org/FAQ.htm and Language Testing International, OPI on the ILR scale. https://www.languagetesting.com/oral-proficiency-interview-opi
14. Zhang, Cheng and Zhang (2021), Talker variability in nonnative phonetic learning, JSLHR. https://doi.org/10.1044/2021_JSLHR-21-00181
15. Sirindhorn Thai Language Institute, CU-TFL. https://www.sti.chula.ac.th/operation-service/thai-test/thai-test-for-non-native/cu-tfl-en/ and Newswise, 3 Mar 2025. https://www.newswise.com/articles/the-sirindhorn-thai-language-institute-chulalongkorn-university-organizes-the-cu-tfl-thai-language-proficiency-test-for-foreigners
16. EF Standard English Test. https://en.wikipedia.org/wiki/EF_Standard_English_Test
17. 1EdTech, Open Badges 3.0. https://www.imsglobal.org/spec/ob/v3p0
18. The Mom Test, book report. https://mtlynch.io/book-reports/the-mom-test/
19. Fake door tests and ethics. https://buildvoyage.com/articles/fake-door-tests-and-ethics
