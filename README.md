# rian gèng, เรียนเก่ง

A local-first Thai primer. **Voice** is romanization. **Script** is the letters, on words you already say.

No account. Progress lives in IndexedDB with a localStorage mirror. Export a JSON file when you want a copy.

## Two doors

- `/` is the public landing page: a comic page of the day with the password in its title panel, one live card graded by the real grader, and a waitlist at the close.
- `/learn/` is the course. Hash routes live under it, for example `/learn/#/account`. On Vercel it sits behind the `rk_gate` cookie, set after the account signs in. Log out on the Account page returns to `/`.
- `/audio/*` is gated too, except the clips the landing page plays.

## Run

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173/

```bash
npm test
npm run typecheck
npm run build && npm run preview
npx tsx scripts/validate-content.ts
```

Locally the course is open when `SITE_PASSWORD` is empty, and `/api/session` answers `in: true`. Signing in uses the account password. Set the secret in `.env.local` to try the real gate.

## How a sitting works

Type the answer. Paste is blocked. A correct card stays up with **Right.** until you hit Next. A miss keeps the grader's reason on screen and makes you retype the target. **Begin** unlocks speech; cards play once when autoplay is on. **Hear** and **Slower** play recorded Thai (Voice clips in `public/audio`). `npm run audio` rebuilds them.

Voice unlocks the next level when the previous one is mastered. Script unlocks when every item on the previous level has been answered correctly.

## Tracks

- Voice 0–26: tones, survival, verbs, food, time, the city, particles, heart words, months, kin, errands, trouble, jobs.
- Script 0–27: the whole script. All 44 consonants (including the two retired ones), every vowel sign, the short mark, the silent mark, ๆ, ฯ and the Thai digits. Each letter is taught before any word that uses it, and each bridge word is a Voice word. `content/script/alphabet.ts` is the checklist; tests hold the levels to it. `/learn/#/alphabet` shows the whole chart with where each letter is taught.

Romanization follows the textbook system in `content/system.ts` (à â á ǎ, g/bp/dt, ε ɔ ə ʉ). The open e is stored as Greek ε.

## Type and art

- Brygada 1918 sets headlines and big numbers, Onest the interface, Didact Gothic every romanization. Noto Serif Thai sets Thai, Fahkwang the wordmark, Mali the balloons. All OFL, self-hosted in `public/fonts`. `npm run fonts` rebuilds the three Latin faces as single woff2 subsets, so every combining tone mark ships in the same file as its letter.
- The mark is ก carrying the mai ek, paper on a lacquer square. `npm run brand` draws it and the lockup from the real outlines (Fahkwang Bold for the mark, kept in `art/fonts`): `favicon.svg`, `favicon.ico`, the app icons in `public/icons`, the masters in `public/brand`, and `src/brand/paths.ts`. DESIGN.md, Mark, has the rules.
- The comic panels are 1024² sources in `art/scenes`. `npm run scenes` crops them to 980² webp in `public/scenes` and measures each empty balloon into `src/landing/scenes.css`, so the Thai can be lettered into the drawing. New panels start in `art/candidates` and are graded against the shipped ones with `python3 scripts/gen-scenes.py --candidates` before `--approve` moves them in. `art/STYLE.md` holds the prompts, the character sheet and the checklist.

## Live site

The Vercel URL is gated by `SITE_PASSWORD` (server-only, never in the bundle). `middleware.ts` guards `/learn` and `/audio`; the decision lives in `decideGate` in `src/gate-token.ts`. On Vercel, set the variable for Production and Preview, then deploy. Without it the landing page says so.
