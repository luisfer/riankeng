# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Primary: English-speaking adults learning everyday spoken Thai first, then the Thai script. *Inferred from the course content (greetings, food, directions, family, errands, jobs); not yet confirmed by Luis.* Access is by a shared password, so the course is for invited learners.

## Product Purpose

rian gèng (เรียนเก่ง, "learn well") is a local-first Thai primer in two tracks. **Voice** teaches spoken Thai written in a fixed textbook romanization. **Script** teaches the Thai letters on words the learner already says. Success means a learner can say and type everyday phrases with the right tones, then read and write the same words in Thai script.

## Positioning

- The romanization comes from "Getting to Know Thai, Level 1": à â á ǎ for tones, g/bp/dt for unaspirated stops, and ε ɔ ə ụ for the vowels English has no letter for. That is the Paiboon system of Benjawan Poomsan Becker with ụ where Paiboon writes ʉ, and the course credits it on Voice 0 and in the landing footer. Grading is tone-aware, and names the syllable whose tone slipped.
- Every Voice card has a recorded Thai clip (1,512 of 1,512), so tones are never a synthetic voice's guess.
- Voice comes first. Script then teaches each letter on words from Voice.
- Local-first: there is no account. Progress lives on the device, with a backup file the learner keeps.

## Operating Context

- A sitting: type the answer, with paste blocked. A miss makes the learner retype the target. Hear and Slower play the recorded clip.
- It is an installable PWA that opens without a network.
- It is deployed on Vercel behind `SITE_PASSWORD`. The public landing page at `/` is the front door, and the course lives at `/learn/`.

## Capabilities and Constraints

- Voice has 27 levels (0 to 26) and Script has 28 (0 to 27). Script covers all 44 consonants, every vowel sign, the marks and the Thai digits. Always read counts from `content/levels.ts` and `content/script/levels.ts`.
- The romanization system in `content/system.ts` is fixed, and the data obeys it. The open e is stored as Greek ε (U+03B5).
- Any font that sets romanization must carry ɔ ε ə ụ with working tone-mark anchors. Fonts are self-hosted and OFL.
- Copy uses commas and periods: no middots, no em dashes, no uppercase kickers. Name the words, do not coach. Tests and `slopless` lint it.

## Brand Commitments

- Name: rian gèng / เรียนเก่ง. The wordmark's Thai is set in Fahkwang.
- Paper, ink and one lacquer red. See DESIGN.md.
- Type roles chosen by Luis (September 2026): Brygada 1918 for headlines, Onest for the interface, Didact Gothic for romanization.
- Comic scenes of one woman's day speaking Thai, in a single drawn style.

## Evidence on Hand

- Fifty comic panels at 1024² in `art/scenes/`, the 1,512 recorded clips in `public/audio/`, and the course itself.
- Absent, never fabricate: testimonials, learner counts, reviews, ratings, pricing, press, partner logos.

## Product Principles

1. The words are the product. Show real phrases, real clips and real grading.
2. The romanization is the standard, and tone marks are never decoration.
3. The device owns the work. Nothing leaves it unless the learner exports it.
4. Name the work. Do not coach or sell.
