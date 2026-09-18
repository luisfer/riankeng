# riian gèng · design system

Visual world: **river primer**. A language book on paper, iron-gall ink, one lacquer mark. Not a night-market app, not a dark SaaS shell. Direction taken from the shipped CSS in `src/styles.css`.

## Ground
- Page: `#f2ead8` paper. No photograph, no blur, no glass.
- An 8px lacquer bar (`#9a2b1f`) is pinned to the top of the viewport.
- Content column 640px (session 560px), left-aligned, 32px page padding.

## Colour
| Token | Value | Use |
|---|---|---|
| `--paper` | `#f2ead8` | ground, text on lacquer |
| `--lacquer` | `#9a2b1f` | the one commit key, heat high, top bar |
| `--ink` | `#1c1710` | body, titles, input rule |
| `--ink-2` | `#5a5146` | lede, quiet actions |
| `--ink-3` | `#8a8074` | romanization, meta |
| `--hair` | `rgba(28, 23, 16, 0.14)` | rules |

Never gray. Never gold-on-navy.

## Type
- English UI: **Fraunces** 300–600, optical size on. Headings, wordmark (italic), prompts, buttons.
- Phonetic: **Charis SIL**. Answers, romanization, tone samples, glyph table.
- Thai (when toggled): **Noto Serif Thai**.
- Scale: h1 32–44 / 300 · contents number 28 / 300 · prompt 20 · body 18 · meta 15. Numbers tabular.

## Components
- `.trail`: three columns. Wordmark home, remaining count, Pause or Account. Hairline under.
- `.contents-row`: contents of a primer. Number, title + rom, count or `soon`.
- `.btn.commit`: 36×, radius 2px, lacquer on paper. One per screen.
- `.text-btn`: ink-2 word, underline on hover. Hear, Slower, Pause, export.
- `.answer-form`: field and Check share row 1. Popover and key strip span below.
- `.tone-word`: five words, underline on hover. Not chips.
- `.heat-c`: 12×7 lacquer dots.

## Copy
Commas and periods. No middots, no em dashes, no uppercase kickers.

## Motion
None required. Reduced-motion is the default. Selection is lacquer on paper.

## Refused
Pills, chips, kickers, middots, em dashes, gradient text, glass, photo heroes, featured “start here” cards, faded locked walls, Bricolage, Gentium, Pridi, navy-and-gold.
