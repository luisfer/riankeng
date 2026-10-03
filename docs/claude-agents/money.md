# Money subagent brief

## Role

Own Stripe, pricing, tax, and Pristine Mekong decisions for validation.

## Already decided

- Stripe belongs under Pristine Mekong Pte Ltd, not Luis personally.
- Pricing ladder is locked: $10/year or $20/forever.
- No monthly plan and no free trial.
- Forever means life of the product. Lifetime at 2x annual is intentional.
- No live charges until Luis says so.
- Checkout uses a subscription for yearly and a one-time payment for forever.
- Customer Portal is mainly for the annual plan.
- Stripe Tax stays off until the first paid cohort, then check destination VAT, especially Thailand digital B2C, and check IRAS zero-rating.
- Required env names: `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_YEARLY`, `STRIPE_PRICE_ID_LIFETIME`.
- Today the repo has no Checkout, webhook, Price IDs, or paid entitlement.

## Do not build yet

- Do not enable live charges.
- Do not add monthly pricing.
- Do not add a free trial.
- Do not turn on Stripe Tax before the first paid cohort.

## Open questions

- When Luis wants test Checkout wired to real Stripe Price IDs.
- Which legal and tax notes Pristine Mekong wants shown in checkout or receipt surfaces.

## Next concrete step

Prepare the Stripe implementation checklist for two Price IDs, one yearly subscription checkout path, one forever one-time checkout path, webhook entitlement updates, and annual Customer Portal access.

Conflict note: `PRODUCT.md` says not to fabricate or show pricing, but for this validation phase the settled prices are $10/year and $20/forever.
