# riian gèng — เรียนเก่ง

A local-first Thai journey app. Spoken Thai, written so you can hear it. Two tracks: **Voice** (phonetic romanization) and **Script** (letters, tied to words you already say).

No account. Progress lives in IndexedDB with a localStorage mirror. Export a JSON file when you want a copy.

## Run

```bash
npm install
npm run dev
```

Open http://127.0.0.1:5173/

```bash
npm test
npm run typecheck
npx tsx scripts/validate-content.ts
```

## How a sitting works

Type the answer. Paste is blocked. A correct card stays up with **Right.** until you hit Next. A miss keeps the grader’s reason on screen and makes you retype the target. **Hear** speaks the Thai (click only — nothing autoplays).

Voice unlocks the next level when the previous one is mastered. Script unlocks when every item on the previous level has been seen.

## Tracks

- Voice 0–21: tones, survival, verbs, food, time, the city, particles, heart words.
- Script 0–8: seats, ม/มา, the mark on ม้า, ก, ไม่, คน/ไข่, ไป/ยา, ตา/ข้าว, ห on หมา. Level 9 is still empty.

Romanization follows the textbook system in `content/system.ts` (à â á ǎ, g/bp/dt, ε ɔ ə ụ).

## Live site

The Vercel URL is gated by `SITE_PASSWORD` (server-only, never in the bundle). Local `npm run dev` stays open if that var is empty. On Vercel, set it for Production and Preview, then deploy.
