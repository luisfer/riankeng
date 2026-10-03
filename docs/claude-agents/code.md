# Code subagent brief

## Role

Own engineering sequence from waitlist to paid access, plus post-PMF points architecture holes.

## Already decided

- Waitlist-to-paid order:
  1. Checkout, webhook, and the two Price IDs.
  2. Gate `/learn` on paid entitlement, not only `SITE_PASSWORD`.
  3. Waitlist email-to-paid progress handoff.
  4. Customer Portal.
- Exams, points ledger, and social features are not waitlist blockers.
- Post-PMF holes:
  - Append-only server points ledger.
  - Port `gradeThai` server-side for money events only.
  - Scored item bank must not be in the Vite bundle.
  - Add rate limits.
  - Do not grant Stripe credit from `progress.doc` upsert.
- Today the repo has no Checkout, webhook, Price IDs, or paid entitlement.

## Do not build yet

- Exams.
- Points ledger.
- Social.
- Stripe credit from client or progress upserts.
- Client-side scored exam answer keys.

## Open questions

- Where paid entitlement should be stored for the first cohort.
- How waitlist identity maps to paid account identity.
- Whether `SITE_PASSWORD` remains as an admin preview bypass after paid entitlement exists.

## Next concrete step

Implement the paid foundation in order: Stripe Checkout and webhook, two Price IDs, then paid entitlement gating for `/learn`.

Conflict note: `README.md` and `PRODUCT.md` describe local-first or password-only access, but validation now requires a paid-entitlement gate after Checkout exists.
