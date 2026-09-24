# HANDOFF: landing page + type system rebuild (for the next Claude session)

Written by Claude Opus 5 on 2026-09-22 because Luis was near his Claude Code limit. **Read all of this before you touch code.** The approved plan is also saved at `~/.claude/plans/for-the-riankeng-repo-composed-graham.md`, but everything you need is inline below. Update the **Progress** checklist as you go.

Repo: `/Users/luisfer/Downloads/code/my-projects/riankeng` (Vite 6 + React 19 + vite-plugin-pwa, deployed on Vercel). Branch `main`. The working tree already held **uncommitted work from an earlier session**: DESIGN.md, middleware.ts, public/gate.html, src/styles.css, Account.tsx, App.tsx, Journey.tsx, vite.config.ts, api/logout.ts, and new fonts and scenes. Build on top of it. **Do not commit or push unless Luis asks. He runs push and deploy himself.**

## What Luis asked for

"I need the landing page to look BEAUTIFUL, with the comic strips correctly sized (not stretched) and cropped, doing a collage or something beautiful, and the sign in / password gate taking to the course, and [a nice font] being the main font for all the English / romanized stuff. Think of how a BEAUTIFUL SaaS would have the landing page, and put it as the main entry point of the front-end (not /gate.html)."

## Decisions Luis made (final; do not reopen)

1. **Type (pairing A):** **Brygada 1918** for headlines and big numbers, **Onest** for the interface and English body, **Didact Gothic** for ALL romanization. Absans was dropped because it has no ε or ɔ.
2. **Scope:** the new type covers the whole app (landing and course). Fraunces and Charis SIL go away.
3. **Main action:** Sign in only. Remove the fake waitlist (it only wrote to the visitor's own localStorage).
4. **Live demo:** yes. One live card on the landing, using the real `RomanInput`, the real `gradeThai` and the recorded clips.
5. **Structure:** "C. Comic page hero": the first viewport IS a comic page, and a title panel with the headline and password form sits inside the panel grid.
6. **Panels:** Luis rejected taxi, boat, stallnight, the bordered night, stools (b) and rain (b), because they are not good or not the same style. The final twelve are in the table below.

## Routes (the core change)

| Path | Serves | Access |
|---|---|---|
| `/` | landing = new `index.html` (Vite entry `landing`) | public |
| `/learn/` | the course = current `index.html` moved to `learn/index.html` (entry `learn`); hash routes unchanged, e.g. `/learn/#/account` | cookie `rk_gate` |
| `/scenes/*`, `/fonts/*`, `/assets/*` | public | public |
| `/audio/*` | gated, except the demo clips | cookie |

- `middleware.ts`: `matcher: ['/learn', '/learn/:path*', '/audio/:path*']`. Put the decision in a pure, tested `decideGate(pathname, cookieHeader, secret, onVercel)` in `src/gate-token.ts`:
  - valid cookie → pass with header `X-Riankeng-Shell: 1`
  - otherwise → 307 to `/?signin`
  - no secret on Vercel → `/?signin=unset`; locally it stays open
  - demo clip paths are always public; build them with `clipUrl(id)` from a new manifest-free `src/audio/clip-url.ts` (move `clipStem`/`clipUrl` there; `clips.ts` re-exports them)
- `api/session.ts` (new): GET → `{ in: boolean }`, `Cache-Control: no-store`, reusing `gateToken` and `readCookie` from `src/gate-token.ts`. `api/gate.ts` and `api/logout.ts` are unchanged.
- Dev: in `vite.config.ts`, the `gate-logout` plugin becomes `gate-dev`, serving `/api/gate` (POST), `/api/session` (GET) and `/api/logout` (POST).
  - `SITE_PASSWORD` comes from `loadEnv(mode, cwd, '')`. When it is empty, any password passes and session returns `in: true`.
  - It redirects `/learn` → `/learn/`.
  - Add `appType: 'mpa'`, `build.rollupOptions.input = { landing: 'index.html', learn: 'learn/index.html' }` and `output.entryFileNames: 'assets/[name]-[hash].js'`.
- `vercel.json`:
  - redirect `/gate.html` → `/` (permanent)
  - redirect `/learn` → `/learn/`
  - header `X-Riankeng-Shell: 1` on `/learn/(.*)`
  - drop the SPA catch-all rewrite
- PWA in `vite.config.ts`:
  - manifest `id: '/'` (keeps existing installs), `start_url: '/learn/'`, `scope: '/'`
  - workbox `globIgnores: ['index.html', 'scenes/**', 'assets/landing-*']`
  - `navigateFallback: '/learn/index.html'` with `navigateFallbackAllowlist: [/^\/learn\//]`
  - the NetworkFirst navigation route only for `/learn` (keep the existing `cacheWillUpdate` guard)
  - add a CacheFirst route for `/scenes/`
- Landing script, legacy handling:
  - an old `/#/…` URL does `location.replace('/learn/' + location.hash)`
  - `matchMedia('(display-mode: standalone)')` → `/learn/` (old installs had start_url `/`)
  - `?signin` focuses the password field; `?signin=unset` shows "Password is not set."
- `src/ui/Account.tsx`: Log out goes to `/` (it currently assigns `/gate.html`).
- Delete `public/gate.html` and fix every reference: `vite.config.ts` globIgnores and denylist, `middleware.ts`, `vercel.json`, DESIGN.md, README.

## Fonts (verified facts; the audit covered about 190 fonts)

Content code-point counts: ɔ ×937, ε (Greek U+03B5) ×315, ʉ ×290, ǎ ×221, ə ×175, έ (U+03AD) ×55, ὲ (U+1F72) ×37, and combining U+0300/0301/0302/030C after ɔ, ə and ε. **The data stays Greek ε. Never remap it.**

- **Didact Gothic** (ofl/didactgothic/DidactGothic-Regular.ttf): 400 only, x-height 468. It has ε, ɛ, ɔ, ə, ʉ with all 4 tone anchors, plus polytonic έ and ὲ. It draws the stored έ and ὲ **identically** to ɛ + combining acute/grave (checked visually). Features: onum, lnum, ss01; no tnum.
- **Brygada 1918** (ofl/brygada1918/Brygada1918[wght].ttf plus the Italic): 400–700, x-height 460. Greek ε has anchors; **ɛ (U+025B) has none**, which is fine because the data is Greek. No U+1F72; HarfBuzz decomposes it to ε + U+0300. Features: tnum, lnum, onum, smcp, c2sc.
- **Onest** (ofl/onest/Onest[wght].ttf): 100–900, x-height 527. It has ɛ but **no Greek ε**. So never set romanization in Onest, and make the stack `"Onest", "Didact Gothic", system-ui`. Features: tnum, ss01, ss02.
- **Bug to fix:** Google Fonts CSS subsets omit U+0302 and U+030C, so today's Charis faces fall back on ɔ̂ and ɔ̌. Rewrite `scripts/fetch-fonts.py` to download full TTFs from `https://raw.githubusercontent.com/google/fonts/main/ofl/<dir>/<file>` and subset with `fontTools.subset` (all layout features, flavor woff2) into ONE file per style. Cover: Basic Latin, Latin-1, Latin Ext-A, U+01CD–01DC, IPA 0250–02AF, 02B0–02FF, **0300–036F**, Greek 0370–03FF and 1F00–1FFF (Brygada and Didact), Vietnamese 1EA0–1EF9, 2000–206F, 20AC, 2190–2193. Output to `public/fonts/{brygada-1918,onest,didact-gothic}/` with OFL.txt.
- Keep `public/fonts/{noto-serif-thai,fahkwang,mali}`. Delete `public/fonts/{fraunces,charis-sil,absans,comic-neue,happy-times,kodchasan}`.
- `public/fonts/faces.css` becomes hand-written @font-face rules for the above. Both HTML heads preload the Onest and Brygada roman woff2 files.

## Type roles in the app (`src/styles.css`, with the shared `src/tokens.css`)

- Tokens:
  - `--display: "Brygada 1918", Georgia, serif`
  - `--ui: "Onest", "Didact Gothic", system-ui, sans-serif`
  - `--phonetic: "Didact Gothic", "Onest", sans-serif`
  - `--thai`: unchanged
- Match x-heights with `font-size-adjust: ex-height <value>`, or tune sizes by hand if that looks off. Put `font-synthesis: none` on `.rom`.
- The body goes to `--ui`. h1, h2, `.contents-n` and other big numbers go to `--display`: Fraunces 300 becomes Brygada 400/500, and `font-optical-sizing` rules are dropped. Everything on `--phonetic` goes to Didact: `.rom`, `.prompt-rom`, `.roman-field`, `.reveal`, `.strip-k`, `.pair-line.rom`, `.glyphs-tbl td` and the tone-chart rom. `.roman-field.en` goes to Onest. `.wordmark-rom` becomes Didact, not italic (no faux italic).
- Move the card CSS (`.answer-form`, `.roman`, `.roman-line`, `.roman-field*`, `.popover`, `.pop-opt`, `.pop-k`, `.strip`, `.strip-k`, `.btn.commit`, `.feedback`, `.session-feedback*`, `.text-btn`) into `src/card.css`, imported by both the app and the landing.

## Comic art (fixes stretched and cropped)

Sources are 1024² PNGs in `/Users/luisfer/Downloads/cursor-generated-assets/`. Copy them into `art/scenes/<stem>.png` (committed) and write `scripts/gen-scenes.py` (Pillow is installed; `cwebp` is available too):

- Crop a 22px inset → 980². In the "extra" style that removes the cream margin and the drawn border (the border sits at 9–16px). The "b" style has no border, but crop it the same way for consistency. Assert that the crop edges are not border-dark.
- Write `public/scenes/<stem>-980.webp` and `<stem>-490.webp`.
- Measure each empty balloon by flood fill from a hand-picked seed point (near-white interior), and write `src/landing/scenes.css` with `--x/--y/--w/--h` in % per `[data-scene]`.
- Add `"scenes": "python3 scripts/gen-scenes.py"` to package.json.
- Tiles are always square (`aspect-ratio: 1`, width and height attributes, `srcset` 490w/980w) with one 2px ink frame in CSS. Never stretch.
- Delete the old `public/scenes/*.png` (mixed 424px and 1005px), `public/strip-places.png` (its AI-baked Thai text is unsafe for a Thai course) and `public/strip-raw.png`.
- `src/ui/Journey.tsx` `.splash`: replace the `strip-places.png` background-position sprite with six `<img>` tiles of the new art.

**The first twelve panels.** Every phrase is a real entry (`getEntry(id)`) with a shipped clip in `src/audio/clip-manifest.json`:

| stem | source file | entry id | thai | rom | English (`cleanGloss(en[0])`) |
|---|---|---|---|---|---|
| coffee | riankeng-extra-coffee.png | `p:kɔ̌ɔ gaa-fεε yen nʉ̀ng gε̂εo` | ขอกาแฟเย็นหนึ่งแก้ว | kɔ̌ɔ gaa-fεε yen nʉ̀ng gε̂εo | one iced coffee please |
| jasmine | riankeng-extra-jasmine.png | `p:ao an níi` | เอาอันนี้ | ao an níi | I will take this one |
| mango | riankeng-extra-mango.png | `w:má-mûang` | มะม่วง | má-mûang | mango |
| passenger | riankeng-extra-passenger.png | `p:dtrong bpai` | ตรงไป | dtrong bpai | go straight |
| stairs | riankeng-extra-stairs.png | `p:dèk kon níi nâa rák` | เด็กคนนี้น่ารัก | dèk kon níi nâa rák | this child is cute |
| tea | riankeng-extra-tea.png | `w:chaa yen` | ชาเย็น | chaa yen | Thai iced tea |
| umbrella | riankeng-extra-umbrella.png | `p:wan níi fǒn dtòk` | วันนี้ฝนตก | wan níi fǒn dtòk | it is raining today |
| laugh | riankeng-panel-laugh.png | `p:mâi bpen rai` | ไม่เป็นไร | mâi bpen rai | never mind |
| door | riankeng-b1-door.png (flat style) | `w:sà-wàt-dii` | สวัสดี | sà-wàt-dii | hello |
| bike | riankeng-b2-bike.png (flat style) | `w:mɔɔ-dtəə-sai` | มอเตอร์ไซค์ | mɔɔ-dtəə-sai | motorbike |
| stall | riankeng-b3-stall.png (flat style) | `w:gǔai-dtǐao` | ก๋วยเตี๋ยว | gǔai-dtǐao | noodles |
| night | riankeng-b6-night.png (flat style) | none (closing image, no balloon) | | | |

Check the exact stored strings with `npx tsx -e "import {getEntry} from './content/index.ts'; ..."`. The ids contain NFC characters and the ε is Greek.

**Nineteen more, 23 Sep (the d series).** Drawn and graded by the recipe in `art/STYLE.md`, approved by Luis, each a real entry with a shipped clip. `DEMO` holds thirty rows; the landing shuffles eight. Every `DEMO` id is a public clip (`src/gate-token.ts`). Order of a day: door, well, stairs, coffee, jasmine, mango, thanks, help, pricey, howmuch, bike, passenger, left, stop, hotel, heat, water, umbrella, pharmacy, tooth, tea, stall, nospicy, table, bill, toilet, sorry, laugh, tired, hungry, night.

**Eight quiet panels, 23 Sep (the q series).** No balloon, painted to every edge: train, pier, temple, canal, park, shrine, soi, ferry. With night they make `QUIET` in `src/landing/demo.ts`, and the course home opens on one at random. Luis sent back the first set for bare cream paper, so the gate now measures paper on quiet panels. See "Quiet panels" in `art/STYLE.md`.

**Eleven more, 23 Sep morning (the e series and three quiet).** Luis liked the full-bleed quiet panels and asked for balloon situations drawn the same way. Eight lettered panels, every wall painted: from (a fruit vendor asks where she is from), slowly, scan and cash (paying at a convenience store), praise, name, tasty, eaten (the lobby guard asks). Each is a real entry with a shipped clip, so each is also a public clip. `DEMO` holds thirty-eight rows. Three quiet panels join `QUIET`, now twelve: alms, krathong, rain. "I come from Japan" is not in the course, so from uses "where are you from". Order of a day: door, well, stairs, coffee, jasmine, mango, thanks, help, from, slowly, pricey, howmuch, bike, passenger, left, stop, hotel, heat, water, scan, cash, praise, name, umbrella, pharmacy, tooth, tea, stall, nospicy, tasty, table, bill, toilet, sorry, laugh, tired, eaten, hungry, night.

## The landing page: Impeccable process (the skill lives at `~/.claude/skills/impeccable`)

Done:
- `PRODUCT.md` is written.
- The concept round ran: seed `0c1ea713`, C chosen, telemetry sent.
- The surface brief with the direction contract is written at `.impeccable/surfaces/index-html.md`. Re-read it with `~/.claude/skills/impeccable/scripts/impeccable surface-brief read index.html`.
- `craft-floor.md` has been read. Its rules: no kickers or eyebrows ever, no gradient text, no glass, no identical card grids, theme text selection, caret, focus rings and underline offsets from the palette, one authored motion moment.

The build is code-led (there is no image generation here).

**Trimmed since, 23 Sep.** The brief below is the first build. The headline is now "Learn Thai as Thais speak it.", and the password form waits behind Sign in. The two tracks and This device sections are gone, and the close is "Speak with Thainess." with a waitlist mailto. The course names the two tracks once someone is inside.

**First viewport (desktop):**
- A 64px nav: wordmark เรียนเก่ง (Fahkwang) plus "rian gèng" (Didact, "gèng" in lacquer) on the left. On the right: Try a card, The two tracks, and a Sign in ghost button, which becomes "Open the course" when `/api/session` returns `in: true`.
- Then a **5-column grid of square cells** with 12px gutters, each cell framed with a 2px ink border:
  - **title panel** at cols 1–2 × rows 1–2: the Brygada headline "Thai in romanization, then the letters." at about 4.4rem, a two-line Onest lede about Voice and Script, and the **password form** with the lacquer "Open the course" commit
  - **coffee** at cols 3–4 × rows 1–2
  - **jasmine** at col 5 row 1, **door** at col 5 row 2
  - row 3: **mango, tea, stairs, umbrella, passenger**
- Use container query units so the title text fits. Below about 1040px, the title panel spans the full width and the panels go into a 4-column grid, then 2 columns on phones.
- Balloons are lettered with the Thai in **Mali** (`lang="th"`). Hover or focus reveals a caption: romanization in Didact (`lang="th-Latn"`) plus English in Onest. **Clicking a panel loads its phrase into the live card** and scrolls to it.
- Motion: panels ink in once, in reading order (opacity plus a slight scale, about 480ms exponential ease-out, 70ms stagger). Balloons letter in after. `prefers-reduced-motion` means no animation.

**Sections below:**
1. **Try one card.** A React island `src/landing/TryCard.tsx`, reusing `RomanInput` (`src/input/RomanInput.tsx`), `gradeThai(targetRom, answer)` (`src/engine/grader-thai.ts`, which returns `{verdict, correct, message, matchedTarget}`), `Commit`/`TextBtn` (`src/ui/bits.tsx`) and `chrome.writeRom` ("Write the romanization.") from `src/ui/copy.ts`.
   - Hear and Slower use `new Audio(clipUrl(id))`, with Slower at `playbackRate = 0.75`.
   - Correct → "Right." plus the pair line in lacquer, then Next card. Miss → the grader's message.
   - Default order: jasmine, then passenger, then coffee. The panel image sits beside the card.
2. **The two tracks.** Voice (27 levels, 0–26) and Script (28 levels, 0–27) as `contents-row`-style lists: number in Brygada, title in Onest, romanization in Didact. Take the titles and romanization from `content/levels.ts` and `content/script/levels.ts`.
3. **This device.** `.status`-style rows: no account; progress lives on this device; opens without network; backup is a file you keep. True facts, from the README.
4. **Close.** A full-bleed ink (#1c1710) field with the night (b) panel, a Brygada line and the password form again. Then the footer.

**Copy rules** (DESIGN.md and `tests/copy-slop.test.ts`): commas and periods only, no middots, no em dashes, no uppercase kickers, no "you will", no coaching or selling. It is true that every Voice card has a recorded clip (1,512 of 1,512).

**Files:** `index.html` (static markup for first paint), `src/landing/main.tsx` (session state, sign-in submit, redirects, panel clicks, mounting TryCard), `src/landing/landing.css` (imports tokens.css, card.css, scenes.css), `src/landing/demo.ts` (data only: stem, id, thai, rom, en).

## Tests to add

- `tests/gate.test.ts`, for `decideGate`: `/` is public, `/learn/` without a cookie → signin, with a cookie → shell, a demo clip is public, other audio is gated, no secret on Vercel → unset.
- `tests/landing.test.ts`, which reads `index.html` and parses it with happy-dom:
  - each `[data-entry]` thai, rom and English equals `getEntry(id)` and `cleanGloss(en[0])`
  - each demo id `hasShippedClip`
  - each scene webp exists, and each `img` has width and height
  - the track titles and counts match `LEVELS` and `SCRIPT_LEVELS`
  - the landing text passes the BANNED list from `tests/copy-slop.test.ts`
- A TryCard test: "ao an nii" gives the tone-slip message, "ao an níi" gives "Right.".
- Also add the landing copy to `scripts/dump-learner-copy.ts`.

## Verify and finish

- Run `npm run typecheck`, `npm test` and `npm run build`, then `npm run preview`. In the preview, check that `learn/index.html` is precached, scenes are not, and `/learn/` works offline.
- In Chrome against `npm run dev` (http://127.0.0.1:5173/):
  - the landing loads
  - sign in → `/learn/#/`
  - Account → Log out → `/`
  - the live card: popover keys 1–4, Check, Hear
  - clicking a panel loads its phrase
- Screenshots at 1440 and 390 in ONE batch, one fix pass, then one confirming round. Save them to `.impeccable/review/desktop.png` and `mobile.png`.
- Run `~/.claude/skills/impeccable/scripts/impeccable detect --json index.html src/landing src/styles.css` once and fix the mechanical findings.
- Spawn the `impeccable-finish-reviewer` subagent, fresh with no forked history. Pass it the request, the decisions, the artifact path, the screenshots, the contract (`.impeccable/surfaces/index-html.md`), the detector output and `~/.claude/skills/impeccable/reference/craft-floor.md`. Act on its disposition.
- Spawn `impeccable-documenter` to rewrite DESIGN.md and `.impeccable/design.json` for the new type roles, the landing and the motion.
- Run `~/.claude/skills/impeccable/scripts/impeccable embed-prompt --scan public/scenes`, and embed origin metadata: the art was generated earlier for Luis and stored in `~/Downloads/cursor-generated-assets`.
- Update README: landing at `/`, course at `/learn/`, the Voice and Script counts, `npm run scenes`.

## Gotchas

- The romanization system (`content/system.ts`) is fixed. Never "simplify" it.
- Never print the `SITE_PASSWORD` value from `.env.local`. Never publish Luis's email.
- `npx tsx` prints harmless npm warnings about user config.
- `clips.ts` imports the 33 KB manifest. The landing must import `clip-url.ts`, not `clips.ts`.
- Do not import `@content/index` into the landing bundle, because it pulls in every entry. `demo.ts` holds the literal strings, and the test cross-checks them.
- Old installs may have precached the old root app shell. They reload once into the new service worker; that is expected.

## Progress (update as you go)

- [x] Plan approved, decisions captured, memory updated
- [x] PRODUCT.md, concept round (C), surface brief
- [ ] Fonts: fetch and subset script, faces.css, delete old fonts
- [ ] Art: art/scenes sources, gen-scenes.py, webp outputs, scenes.css
- [ ] Routing: learn/index.html, vite.config (mpa, pwa, gate-dev), middleware + decideGate, api/session, vercel.json, Account logout
- [ ] Tokens, card.css, app-wide type swap in styles.css
- [ ] Landing: index.html, landing.css, main.tsx, TryCard.tsx, demo.ts
- [ ] Journey splash on new art
- [ ] Tests (gate, landing, TryCard), copy dump
- [ ] Cleanup deletions, README
- [ ] Verify: typecheck, test, build, preview, Chrome at 1440 and 390
- [ ] Finish: detector, finish reviewer, documenter (DESIGN.md), provenance scan
