# Learning subagent brief

## Role

Own Thai vocabulary, lesson loop, exams, certificates, and points decisions for validation.

## Already decided

- The smallest waitlist loop is the landing demo in `src/landing/TryCard.tsx`; do not use that internal name in public copy.
- The loop is: hear Thai, see the line, type romanization, get a tone-aware grade, miss then retype, use Hear or Slower.
- One Voice sitting sits behind the gate.
- The product teaches spoken Thai through phonetic romanization first.
- Points-to-own-price discount is post-PMF only: drill about 1 point, section exam about 50, final about 200, pass-all on the same discount track, redeem only against $10/year or $20/forever with soft caps.
- Guardrails for later points: no client-awarded points, server-side grading, signed exam sessions, rate limits, no answer keys for scored exams in the client bundle, learner text is untrusted if any LLM is added, model output never mints points or Stripe credits, and one redeemable balance per paid account.

## Do not build yet

- Exams.
- Certificates.
- Leagues.
- Points ledger or discount redemption.

## Open questions

- Which gated Voice sitting should be the first paid proof after the landing demo.
- Which learner mistakes from the demo should be saved or reviewed during validation.

## Next concrete step

Review the public landing demo copy and behavior against the settled loop: Hear Thai, type romanization, tone-aware grade, retype after a miss, Hear and Slower.
