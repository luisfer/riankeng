# rian gèng · design system

Visual world: **river primer**. A language book on paper, iron-gall ink, one lacquer mark. Not a night-market app, not a dark SaaS shell. One look. No Day/Night switch. Direction taken from the shipped CSS in `src/styles.css`.

## Ground
- Page: `#f2ead8` paper. The course field (`.app`, including `.app.home`) is a static wash: peach `#f8e0c6` through paper to river-green `#e4ecd0`, a faint lacquer bloom at the top-right, a pale olive pool at the foot. No photograph, no blur, no glass, no gradient text.
- An 8px lacquer bar (`#9a2b1f`) is pinned to the top of the viewport.
- Content column 640px (session 560px), left-aligned, 32px page padding. The journey widens so the drawn strip can sit three panels across.

## Colour
| Token | Value | Use |
|---|---|---|
| `--paper` | `#f2ead8` | ground, text on lacquer |
| `--lacquer` | `#9a2b1f` | the one commit key, heat high, top bar. |
| `--ink` | `#1c1710` | body, titles, input rule |
| `--ink-2` | `#5a5146` | lede, quiet actions |
| `--ink-3` | `#8a8074` | romanization, meta |
| `--hair` | `rgba(28, 23, 16, 0.14)` | rules |

Never gray. Never gold-on-navy.

## Mark
- **The mark.** ก carrying the mai ek of เก่ง, paper on a lacquer square: a consonant is a seat, and the tone sits on it. Fahkwang Bold, kept in `art/fonts`. Square corners; a launcher rounds its own.
- **Three optical sizes**, all drawn by `npm run brand` (`scripts/gen-brand.py`). Tab: `favicon.svg` and `favicon.ico`, ก่ at 80% of the square. Icon: `apple-touch-icon`, 192, 512 and `brand/mark.svg`, at 62%. Safe: the maskable 512, at 50%, inside the circle a launcher's mask always keeps.
- **The lockup.** เรียนเก่ง in Fahkwang over rian gèng in Didact Gothic, flush left. The romanization is spaced 60/1000 and scaled until the grave over è stands under the mai ek over ก, one vertical line through both tone marks. Those two marks are the only lacquer. The rest is ink, or paper on the ink ground, where the lacquer lifts to `#c68b7b`. Masters: `public/brand/lockup.svg`, and `wordmark.svg` on one line. Inline paths: `src/brand/paths.ts`.
- Clear space is the height of the mai ek on every side. Smallest: the mark at 16px, the lockup at 18px Thai.
- Never outlined, shadowed, graded or recoloured. No second colour in the square.

## Type
- English UI: **Fraunces** 300–600. Optical size on headings and the big prompt. Body 18px, optical off, a hair of tracking. Headings, wordmark (italic), prompts, buttons.
- Phonetic: **Charis SIL**. Answers, romanization, tone samples, glyph table.
- Thai (when toggled): **Noto Serif Thai**.
- Scale: h1 32–44 / 300 · contents number 28 / 300 · prompt 20 · body 18 · meta 15. Numbers tabular.

## Components
- `.trail`: three columns, one row. Wordmark home, then place plus a 48px lacquer meter for the level, then Pause or Account. A sitting adds quiet “11 left” on the same line, not a second row. Hairline under.
- `.meter`: progress is ink on a rule, never a disc. A hairline in `--hair`, laid in lacquer as far as the work is done. `.row-meter` lies over a contents row’s own divider, so the list keeps one rule per row; the trail and the lesson intro carry a standalone 2px one. Done means mastered on Voice and right-once on Script, which is what each track unlocks on.
- `.contents-row`: contents of a primer. Number (right-aligned, tabular), title + rom, count of done over total, or `soon`. Locked rows have a blank meta. The open level’s number is lacquer and it carries a 2px lacquer mark in the margin.
- `.status`: label and value on a hairline row, for what is true about this device’s copy: where it lives, cards with progress, last saved, opens without network, network now, last backup file. A value that needs attention is lacquer, not red-and-loud.
- `.btn.commit`: 36×, radius 2px, lacquer on paper. One per screen. Continue is that key. Sit again when the level is started. Begin again is a text button.
- `.text-btn`: ink-2 word; the underline arrives in lacquer on hover or when current. Hear, Slower, Pause, export. Hear and Slower are also Alt+H and Alt+S.
- **The sitting is a primer page.** The card pins under the trail in the upper third, never mid-screen. The instruction is Brygada italic in ink-2, an exercise heading. The card's number in the sitting hangs in the margin in lacquer Brygada on the word's baseline; under 760px it opens the instruction's line. The word, then Hear and Slower as type; on a listening card they take the word's place, larger.
- `.answer-form`: one ruled line to write on. A 2px ink rule runs under the field and under Check, which stands on it; while the line holds the caret it turns lacquer, and that is its focus mark, so the field carries no outline. The answer starts flush with the word above. Once checked, what was written stays on the line in ink-2 and Next stands where Check stood. The tone popover and the key strip are type under the line: tones keyed 1 to 4, then ε ɔ ə ʉ and the four marks, underlined in lacquer on hover. No boxes.
- A right answer lays one lacquer stroke under the word, drawn in once (under reduced motion it is simply there), and its meaning beneath in lacquer. A tone or length miss writes the target under the word with only the slipped syllable in lacquer, and the grader's sentence goes to ink beside it.
- `.tone-word`: five words, underline on hover. Not chips.
- `.heat-c`: 12×7 lacquer dots.
- `.splash`: the journey opens on one quiet drawing, picked at random from the nine in `QUIET` each time the home mounts. No balloon, no lettering, painted to every edge. Photographs stay refused.
- The public page (`gate.html`) is the front door: the name, the password, and one comic scene at a time. The scenes crossfade through a day of speaking. Latin there is Absans. The Thai name is Fahkwang. The lines in the balloons are Mali, one face for English and Thai.

## Copy
Commas and periods. No middots, no em dashes, no uppercase kickers.
Name the words. Do not coach. No “you will”, no “ears first”, no Hear-say-and-name triads.
`slopless` lints the dump from `npm run copy`.

## Motion
None required. Reduced-motion is the default. Selection is lacquer on paper.

## Refused
Pills, chips, kickers, middots, em dashes, gradient text, glass, photo heroes, featured “start here” cards, faded locked walls, progress rings and pies, Bricolage, Gentium, Pridi, navy-and-gold.
