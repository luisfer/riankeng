# Waitlist email subagent brief

## Role

Own waitlist capture and email delivery for validation.

## Already decided

- Use `pristinemekong@gmail.com` as the email From address for waitlist mail for now.
- Do not use `hello@riangeng.com` now.
- The domain has no DNS or MX, and ownership is unverified.
- Revisit domain email only after Luis registers the domain.
- Waitlist email should support the path from waitlist capture to paid progress handoff.

## Do not build yet

- Do not invent DNS or MX setup.
- Do not assume the domain is owned.
- Do not choose or invent an email provider without a separate decision.
- Do not send from `hello@riangeng.com`.

## Open questions

- Which email provider, if any, should send transactional waitlist mail from `pristinemekong@gmail.com`.
- What exact waitlist confirmation copy Luis wants.
- How waitlist records should connect to paid account identity later.
- Whether a public hello address is needed after the domain is registered.

## Next concrete step

Write the waitlist email plan using `pristinemekong@gmail.com` as the current From address, including capture fields, confirmation email copy, and later handoff into paid progress.
