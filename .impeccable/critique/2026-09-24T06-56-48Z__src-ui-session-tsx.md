---
target: "the sitting (#/session)"
total_score: 27
max_score: 40
na_heuristics: 
p0_count: 0
p1_count: 2
target_identity: "file:/Users/luisfer/Downloads/code/my-projects/riankeng/src/ui/Session.tsx"
target_fingerprint: "sha256:a0e864ac2edabe25dcd6b8c3280ae419b83a89a6c9b05dc36f9e25962067ef03"
target_path: /Users/luisfer/Downloads/code/my-projects/riankeng/src/ui/Session.tsx
timestamp: 2026-09-24T06-56-48Z
slug: src-ui-session-tsx
---
⚠️ DEGRADED: single-context (sub-agents only run when the user asks; the design review was recorded before the detector ran)

Target: src/ui/Session.tsx, live at http://127.0.0.1:5173/learn/#/session (Voice 0, "maa", 16 left). Mode: Operate.

Direction: make the sitting a page of the primer. The word large near the top, the answer written on a ruled line with Check stamped at its end, nothing else on the page boxed.

## Design health: 27/40 (Acceptable)
| # | Heuristic | Score | Key issue |
|---|---|---|---|
| 1 | Visibility of system status | 3 | "16 left" is clear; the meter tracks the level, not this sitting, so it reads empty through the start of Voice 0 |
| 2 | Match with the real world | 3 | Plain prompts; tone vocabulary comes from Voice 0 |
| 3 | User control and freedom | 3 | Pause is always there; no skip, on purpose |
| 4 | Consistency and standards | 2 | Three button languages on one card: boxed Hear, Slower and Pause, a filled Check, plain-text tone words. DESIGN.md defines Hear, Slower and Pause as text buttons |
| 5 | Error prevention | 3 | Paste blocked, hear-first lock, the tone popover and vowel strip keep answers inside the system |
| 6 | Recognition over recall | 3 | ε ɔ ə ʉ on a visible strip, tones on number keys |
| 7 | Flexibility and efficiency | 3 | Enter checks and continues; no key for Hear or Slower |
| 8 | Aesthetic and minimalist | 2 | The answer desk is double-framed and off its line; a dead band sits above the card |
| 9 | Error recovery | 3 | The grader names the syllable that slipped and asks for a retype of the target |
| 10 | Help | 2 | Nothing in the sitting explains the keys or the marks; it all lives in Voice 0 |

## Specificity
Only in its type. Small question, big word, field, button, centred: any flashcard app. Specific: 56px Didact romanization with tone marks, lacquer as the only colour, the grader's wording. Missing: the primer and the comic.

Detector: source scan (Session.tsx, RomanInput.tsx, bits.tsx) 0 findings. In page, 3: gradient-text on .wordmark-th and .wordmark-rom (card.css:291-312, the trail's hover wipe; agrees with the review); cream-palette on body (false positive, #f2ead8 is the committed paper). Overlays left in the [Human] tab.

## What's working
- One stimulus, one field, one lacquer key.
- The word as hero: "maa" at 56px in Didact, tone marks intact.
- The feedback model: lacquer underline and pair line on a right answer; a miss keeps the reason and asks for the target.

## Priority issues
- [P1] The answer desk is double-framed and off its line. Focus draws a 2px lacquer box around the field's own lacquer rule; the field is 80px tall; Check sits 10px above the rule (card.css:137) outside the box; typed English is 42px against a 56px stimulus. Fix: one writing line, a 2px rule that turns lacquer as the focus indicator, field height from the type (about 32px rom, 24px English), Check on the rule. /impeccable polish
- [P1] The card floats. Stage centred vertically: about 150px empty above on a laptop, about 210px on a phone; five blocks share one 20px gap. Fix: pin to the top third; instruction 8px from the word; audio on the word's line; 48px before the desk; feedback under the rule. /impeccable layout
- [P2] Four boxes (Pause, Hear, Slower, Check) compete with the one key. Hear and Slower are bordered quiet keys (card.css:75-97). Fix: Hear and Slower as ink-2 text on the word's line, Pause as text; Check the only box. /impeccable quieter
- [P2] The core loop has none of the product's world. Fix: a primer page, the card number in the margin in lacquer, the instruction as an exercise heading, the answer on a ruled line; the ~30 phrases with a drawn panel show it beside the word on wide screens. /impeccable shape
- [P3] Phone: card starts 210px down; the level meta wraps to a centred second row; Check is a 36px target at the edge; the keyboard can cover the feedback line. Fix: top-anchor on phones, meter and count on the wordmark's row, answer rule full width with Check on it. /impeccable adapt

## Persona red flags
- Alex: no key for Hear or Slower; every replay is a trip to the mouse.
- Casey: 210px dead space before the card; two-row trail; Check at the far edge at 36px.
- Sam: ink-3 meta 3.2:1 on paper, 3.0:1 on the peach wash, under 4.5:1 for 15px text; focus drawn twice on the field.

## Minor observations
- The trail wordmark's hover (seal tips -8deg, name wipes via background-clip: text) breaks the gradient-text refusal and distracts in a sitting.
- The level meter at the start of Level 0 is a grey hairline; a sitting meter would say more.
- "What does this mean?" repeats at 15px on every such card.
- The Right moment is a 10px square and one line; the end of a sitting is where a moment would earn its place.

## Questions to consider
- What if the answer line were the page's only rule, and Check the only filled shape?
- What would the card look like as a printed primer exercise, numbered in the margin?
- Should the drawn panels appear in the course at all, or stay a landing-page pleasure?
