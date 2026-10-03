# 02 Money: Stripe, Pristine Mekong, tax, and the paid gate

Pre-flight agent 2 of 7. Written Saturday 3 Oct 2026 for the validation launch in the week of Mon 5 Oct 2026.

- **Locked:** $10/year and $20/forever (`docs/claude-agents/money.md`).
- **Not advice:** this is research, not legal or tax advice. Lines marked **(confirm)** need an accountant or a lawyer before they go live.
- **Sources:** every fee and rule below links to the page it came from, checked on 3 Oct 2026.
- **Exchange rates:** US$1 = S$1.278 = 33.6 baht (2 Oct 2026).

## Verdict

1. **Yes, it works through Pristine Mekong.** The company opens its own Stripe account, sells worldwide, and is paid into its Singapore bank. A self-study course with no qualification seems to need no education licence (confirm, §6.8).
2. **Gateway: Stripe, on the company's account, with Managed Payments on.** Link, a Stripe company, becomes the legal seller ("merchant of record") and files VAT/GST in 80+ countries from the first sale, so the company registers nowhere. It costs 3.5 points more than plain Stripe ($0.35 on a year, $0.70 on forever) and keeps every money.md lock: Stripe, Checkout, Billing, Customer Portal, the four env names.
3. **Tax: prices include tax, Stripe Tax stays off, no registrations.** Buyers pay exactly $10 or $20. The company stays far below Singapore's S$1M GST threshold. The one change to money.md: tax is collected from the first sale, not after the first paid cohort.
4. **Money path:** buyer, then Stripe (fees and tax withheld), then SGD payouts to the company's bank, then Luis. Repay his own outlays first; salary, director's fees or dividends come later.
5. **Identity: pay first.** The checkout email becomes the account. A success page verifies the payment on the server and sets the password at once, with no email needed.
6. **Gate: a signed cookie per user,** issued only when an `entitlements` row allows it. Invited learners get a `comp` row in the same migration.

### Launch blockers

| Priority | Must be done before | Items | Owner |
|---|---|---|---|
| P0 | prices appear on the page | Vercel Pro. Terms list the two plans and define "forever". Contact email on the terms and in the footer. No buy button until Checkout works. | Luis (Vercel), Claude (pages) |
| P1 | the first live charge | Stripe activated and Managed Payments approved. Checkout, webhook, entitlements, gate and success page built and tested in test mode. Refund, renewal and closing terms live. Privacy names Stripe and Link. Supabase SMTP for password resets. Luis says go. | Both |

### Decisions for Luis

1. Managed Payments on (recommended). The alternative is plain Stripe, with the company handling VAT.
2. Refund rule: any payment refunded in full on request within 30 days.
3. "Forever" means as long as rian gèng runs. Closing the course needs 90 days' notice, and forever is refunded as two years of yearly.
4. Pay first. The checkout email becomes the account.
5. `SITE_PASSWORD` stops being a way in. Admin and reviewer access become `comp` rows.
6. Pick an SMTP provider for password resets. waitlist-email.md wants this as a separate decision.
7. Switching from yearly to forever costs $10 during a paid year.
8. Payouts in SGD only for now.

## 1. Terms used here

| Term | Meaning |
|---|---|
| Merchant of record (MoR) | The legal seller named on the receipt. It owes the sales tax and handles refunds and chargebacks. |
| VAT, GST | Consumption tax. Many countries tax digital services where the buyer lives and expect foreign sellers to register there. |
| Threshold | The yearly sales in a country above which a foreign seller must register. Some countries have none. |
| OSS | The EU's One Stop Shop: one registration and one quarterly return covering every EU country. |
| Settlement currency | The currency Stripe pays out in. |
| Dispute, chargeback | A buyer asks their bank to reverse a charge. |
| Entitlement | A database row saying an account may open the course, and until when. |
| Webhook | A message Stripe sends to the server when something happens, such as a payment or a refund. |
| Deferred revenue | Cash received for service not yet given. A yearly plan is earned month by month. |

## 2. Gateway choice

### The options

- **Stripe direct.** Pristine Mekong is the seller. It owes VAT/GST wherever the buyer's country says so, from the first sale in some countries.
- **Stripe with Managed Payments.** This is the same Stripe account, Checkout and Billing. One Checkout parameter, `managed_payments[enabled]=true`, makes Link, LLC the seller of record.
  - It has been generally available since Stripe Sessions on 29 Apr 2026 ([Stripe](https://stripe.com/blog/everything-we-announced-at-sessions-2026)).
  - It is open to businesses in Singapore and lists "Online courses and training" as eligible ([eligibility](https://docs.stripe.com/payments/managed-payments/eligibility)).
- **Paddle, Lemon Squeezy, Polar.** Separate merchants of record. Lemon Squeezy now points new sellers to Stripe Managed Payments ([Lemon Squeezy, Jan 2026](https://www.lemonsqueezy.com/blog/2026-update)). Polar's starter tier is 5% + 50¢ plus surcharges, close to Lemon Squeezy ([pricing](https://polar.sh/resources/pricing)).

### Fees per sale

The table assumes a card from outside Singapore, a USD price, and payouts in SGD. Stripe Singapore charges 3.4% + S$0.50 (about US$0.39), +0.5% for an international card, and +2% to convert USD to SGD. Billing adds 0.7% on recurring charges, and Managed Payments adds 3.5% ([Stripe SG pricing](https://stripe.com/en-sg/pricing), [Billing pricing](https://stripe.com/en-sg/billing/pricing)).

| Option | $10 yearly | $20 forever | Notes |
|---|---|---|---|
| Stripe direct | $1.05 (10.5%) | $1.57 (7.9%) | Plus the cost of your own tax registrations and returns |
| Stripe with Managed Payments | $1.40 (14.0%) | $2.27 (11.4%) | Includes tax filing, fraud screening, disputes and buyer support |
| Paddle | $1.00 (10.0%) | $1.50 (7.5%) | 5% + 50¢, all in. Custom pricing on request for products under $10 ([pricing](https://www.paddle.com/pricing)). |
| Lemon Squeezy | $1.20 (12.0%) | $1.80 (9.0%) | 5% + 50¢, +1.5% outside the US, +0.5% on subscriptions ([fees](https://docs.lemonsqueezy.com/help/getting-started/fees)) |

**Refunds and disputes:**

- A refund returns none of Stripe's fees ([Stripe](https://support.stripe.com/questions/understanding-fees-for-refunded-payments)).
- A dispute costs S$15, plus S$15 more to contest it yourself ([pricing](https://stripe.com/en-sg/pricing)).
- Under Managed Payments, Stripe contests disputes itself and pays the evidence fee ([how it works](https://docs.stripe.com/payments/managed-payments/how-it-works)).

### Side by side

| | Stripe direct | Stripe with Managed Payments | Paddle |
|---|---|---|---|
| Seller on the receipt | Pristine Mekong | Link, LLC ("Sold through Link") | Paddle |
| Who files VAT/GST | Pristine Mekong | Stripe, in 80+ countries including the EU, UK, Thailand, Singapore, Australia, NZ, Norway, Switzerland, Japan, Korea, India and the US ([coverage](https://docs.stripe.com/payments/managed-payments/tax-compliance)) | Paddle |
| Card statement | `RIANGENG.COM` | `LINK.COM* RIANGENG` | Paddle's prefix |
| Payouts | To the company's SGD account. First payout 7 days after the first charge ([payouts](https://docs.stripe.com/payouts)) | Same | Monthly by the 15th, $100 minimum, a $15 SWIFT fee in some countries ([Paddle](https://www.paddle.com/help/manage/get-paid/when-and-how-do-i-get-paid)) |
| Buyer self-service | Customer Portal | Customer Portal, plus link.com | Paddle customer portal ([docs](https://developer.paddle.com/concepts/sell/customer-portal/)) |
| Refunds | The company decides | The company decides. Stripe may refund within 60 days, or when the company misses a support escalation for 48 hours. | Paddle may refund within 14 days ([policy](https://www.paddle.com/legal/refund-policy)) |
| Approval | Stripe identity checks (KYC) | KYC plus an eligibility review | Domain review, business and ID checks ([Paddle](https://www.paddle.com/help/start/account-verification)) |
| Fits money.md | Yes | Yes | No, it leaves Stripe |

### Recommendation: Stripe with Managed Payments

Use it for the validation launch and at least the first year.

**Why not plain Stripe.** As the seller, Pristine Mekong would owe tax from the first sale in the EU (the €10,000 threshold is for EU-based sellers only, [EU OSS](https://vat-one-stop-shop.ec.europa.eu/one-stop-shop_en)), the UK ([VAT Notice 700/1](https://www.gov.uk/government/publications/vat-notice-7001-should-i-be-registered-for-vat/vat-notice-7001-should-i-be-registered-for-vat)), Korea and India (§4.2). Doing that through Stripe Tax Complete costs $90 a month, plus $150 for each registration outside the US and up to $445 for each quarterly filing by a non-EU business ([Stripe](https://support.stripe.com/questions/understanding-stripe-tax-pricing)). That is over $1,000 a year to stay compliant on a few hundred dollars of sales. Managed Payments' 3.5% only costs more above roughly US$30,000 of yearly revenue.

**Why not Paddle.** It is about 4 points cheaper per sale, but that saves tens of dollars at validation scale. It breaks the Stripe lock, pays monthly with a $100 minimum, may add a $15 wire fee, and needs a second integration. Paddle is the fallback if Stripe refuses Managed Payments.

**The hidden cost of Managed Payments.** Link may charge tax where Pristine Mekong would not yet owe any. A Thai buyer's $10 will likely carry 7% Thai VAT under Link, while the company itself owes nothing in Thailand until 1.8M baht a year. Check in test mode with a Thai billing address; Stripe shows the tax for each address ([set-up](https://docs.stripe.com/payments/managed-payments/set-up)).

**Limits to know.** Sources: [update guide](https://docs.stripe.com/payments/managed-payments/update-checkout), [eligibility](https://docs.stripe.com/payments/managed-payments/eligibility), [coverage](https://docs.stripe.com/payments/managed-payments/tax-compliance).

- Only hosted Checkout and Payment Links work, and subscriptions must start in Checkout.
- Checkout rejects `automatic_tax`, `payment_method_types`, `invoice_creation` and statement-descriptor overrides.
- Buyers in China, Cuba, Iran, Kosovo, North Korea, Russia, Syria, Ascension and Tristan da Cunha cannot buy.
- An existing subscription cannot move into Managed Payments later, so turn it on before the first yearly sale.
- For a Singapore seller, Link covers sales to Singapore consumers but not to Singapore businesses. A buyer who says they are a business is the company's to handle. Unregistered, the company has no GST to charge.

**Fallback if Managed Payments is refused (exact VAT cover):**

1. Keep $10 and $20 tax-inclusive. Keep Stripe Tax off, but switch on its free threshold monitoring ([Stripe Tax pricing](https://stripe.com/en-sg/tax/pricing)).
2. Put 25% of every EU and UK sale aside in the bank.
3. Within 30 days of the first UK sale, register with HMRC as a non-established taxable person.
4. Before the end of the first quarter with EU sales, register for the non-Union OSS in one EU country. File every quarter, including nil returns, by the end of the following month ([EU](https://vat-one-stop-shop.ec.europa.eu/one-stop-shop/declare-and-pay-oss_en)).
5. Take the small Korean and Indian exposure knowingly, and review everything with the accountant after 3 months (confirm).

### Opening the Stripe account for a Singapore Pte. Ltd.

- **Company:** Stripe looks the company up by its UEN in ACRA's records and pre-fills the directors ([Stripe, 2025 rules](https://support.stripe.com/questions/2025-updates-to-singapore-verification-requirements)).
- **Representative:** an officer listed on ACRA BizFile, who gives ID, proof of address and a liveness check. Owners of 25% or more are declared.
- **New for accounts opened from Sept 2026:** the date of incorporation, the constitution as filed with ACRA, the principal place of business, and each owner's nationality, birth date and home address ([Stripe, 2026 rules](https://support.stripe.com/questions/2026-updates-to-singapore-verification-requirements)).
- **Bank:** an SGD account in the company's name. A USD account is optional (§3).
- **Website:** it must show the business name, what is sold, a customer-service contact, the refund and dispute policy, the cancellation policy and any promotion terms, and it must open without a password ([Stripe](https://support.stripe.com/questions/business-website-for-account-activation-faq)). The landing qualifies once §8 is live. The course behind the login need not be visible.
- **Timing:** test mode works at once. Live charges need verification, and the first payout arrives 7 days after the first charge ([payouts](https://docs.stripe.com/payouts)). Allow about a week for KYC and the Managed Payments review; that is an estimate, as Stripe publishes no turnaround.
- **Statement descriptor:** `RIANGENG.COM`, shortened to `RIANGENG`. It must be 5 to 22 Latin characters and reflect the trading name ([rules](https://docs.stripe.com/get-started/account/statement-descriptors)). Under Managed Payments the buyer sees `LINK.COM* RIANGENG`.

## 3. How revenue reaches the company, then Luis

1. **Buyer:** pays $10 or $20 in Checkout.
2. **Stripe:** keeps its fees, and Link keeps the tax it must remit. The rest lands in the company's Stripe balance.
3. **Payout:** Stripe pays out automatically to the company's SGD account. The first payout comes 7 days after the first charge, then daily, weekly or monthly, with a S$1 minimum ([payouts](https://docs.stripe.com/payouts)). USD sales convert to SGD at the 2% fee. A USD settlement account avoids that fee but costs 1% of each USD payout, at least US$5 ([SG pricing](https://stripe.com/en-sg/pricing)). At this volume, settle in SGD only.
4. **Company costs:** the company pays its own bills, such as Vercel Pro, Supabase, the domain and fees.
5. **Luis:** takes money out in one of these ways (confirm all with the accountant).

| Route | How | Tax |
|---|---|---|
| Repay his outlays | Expense claims with receipts, or repaying a director's loan if he funded the company | Not income to him. It is money coming back. |
| Salary | The company employs him | Deductible for the company. Taxed where Luis is tax resident. A foreigner working in Singapore may need a work pass. |
| Director's fee | Approved by the shareholders | Deductible. A non-resident director has 24% Singapore tax withheld ([IRAS](https://www.iras.gov.sg/taxes/withholding-tax/payments-to-non-resident-director/tax-obligations-for-non-resident-director)). |
| Dividend | Paid only from profits after tax | Singapore's one-tier system makes it tax-free in Singapore ([IRAS](https://www.iras.gov.sg/taxes/individual-income-tax/basics-of-individual-income-tax/what-is-taxable-what-is-not/dividends)). His country of residence may still tax it. Thailand, for example, has taxed residents on foreign income brought in since 2024 ([summary](https://www.expattaxthailand.com/thailand-revenue-department-foreign-sourced-income/)). |

At validation scale, leave the money in the company and only repay outlays.

**Bookkeeping (confirm):**

- **Yearly:** $10 received up front is deferred revenue, earned at about $0.83 a month for 12 months.
- **Forever:** a promise to serve for the product's life, earned over an estimated period. Suggest 24 months, which matches the closing refund in §6.7. IRAS mostly accepts FRS 115 accounting revenue for tax ([e-Tax guide](https://www.iras.gov.sg/media/docs/default-source/e-tax/etaxguide_tax-treatment-arising-from-adoption-of-frs-115-(third-edition).pdf?sfvrsn=8ad2455b_14)).
- **Under Managed Payments:** ask whether revenue is the full price or Link's net, and how to book withheld tax. Stripe's payout reconciliation report has `withheld_tax` and `fee_net_of_withheld_tax` columns for this ([how it works](https://docs.stripe.com/payments/managed-payments/how-it-works)).

**Singapore corporate tax and filings.** Profit is taxed at 17%. For the first three years, the start-up exemption removes 75% of the first S$100,000 and 50% of the next S$100,000, and YA 2026 adds a 40% rebate ([IRAS](https://www.iras.gov.sg/taxes/corporate-income-tax/basics-of-corporate-income-tax/corporate-income-tax-rate-rebates-and-tax-exemption-schemes)). No estimate of chargeable income (ECI) is due while revenue is S$5M or less and the estimate is nil. Form C-S (Lite) covers revenue up to S$200,000 and is due 30 Nov ([IRAS](https://www.iras.gov.sg/taxes/corporate-income-tax/form-c-s-form-c-s-(lite)-form-c-filing/overview-of-form-c-s-form-c-s-(lite)-form-c)). The ACRA annual return is due within seven months of the financial year end ([ACRA](https://www.acra.gov.sg/manage/companies/legal-requirements-common-offences/filing-annual-returns-companies/deadline-requirements/)). A small private company needs no audit; small means two of revenue up to S$10M, assets up to S$10M, and 50 staff or fewer ([ACRA](https://www.acra.gov.sg/manage/companies/legal-requirements-common-offences/preparing-financial-statements/audit-exemptions/)). Keep records for five years ([IRAS](https://www.iras.gov.sg/taxes/corporate-income-tax/basics-of-corporate-income-tax/record-keeping-requirements)).

## 4. Tax

### 4.1 Singapore GST

- **Threshold:** registration is compulsory only above S$1M of taxable turnover a year, either last calendar year or expected in the next 12 months ([IRAS](https://www.iras.gov.sg/taxes/goods-services-tax-(gst)/gst-registration-deregistration/do-i-need-to-register-for-gst)). Zero-rated sales to overseas buyers count toward it. A business whose sales are mainly zero-rated can apply for exemption.
- **Rate:** 9% ([IRAS](https://www.iras.gov.sg/taxes/goods-services-tax-(gst)/basics-of-gst/current-gst-rates)). Unregistered, the company charges no GST and must never show GST on a receipt.
- **Zero-rating:** services to people overseas can be zero-rated under s21(3) ([IRAS](https://www.iras.gov.sg/taxes/goods-services-tax-(gst)/charging-gst-(output-tax)/when-to-charge-0-gst-(zero-rate)/providing-international-services)). That only matters once registered. Under Managed Payments, the company's customer may be Link, a US company (confirm).

### 4.2 Taxes in the buyer's country (digital services to consumers)

| Place | A foreign seller must register | Rate | Managed Payments covers it |
|---|---|---|---|
| EU | From the first sale, through the non-Union OSS ([EU](https://vat-one-stop-shop.ec.europa.eu/one-stop-shop_en)). Automated distance teaching counts as an electronic service ([Reg. 282/2011, Annex I](https://www.legislation.gov.uk/eur/2011/282/annexes)). | 17 to 27% | Yes |
| UK | From the first sale, telling HMRC within 30 days ([VAT Notice 700/1](https://www.gov.uk/government/publications/vat-notice-7001-should-i-be-registered-for-vat/vat-notice-7001-should-i-be-registered-for-vat)). Automated learning is a digital service ([HMRC](https://www.gov.uk/guidance/the-vat-rules-if-you-supply-digital-services-to-private-consumers)). | 20% | Yes |
| Thailand | Above 1.8M baht a year (about US$53,600) from Thai consumers. Register within 30 days of crossing it ([Revenue Department](https://www.rd.go.th/fileadmin/download/eService.pdf)). | 7%, extended to 30 Sep 2027 by Royal Decree 807 ([HLB](https://www.hlbthai.com/cabinet-approves-1-year-extension-of-7-vat-rate-until-30-september-2027/)) | Yes |
| Australia | A$75,000 a year ([ATO](https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/gst/in-detail/rules-for-specific-transactions/international-transactions/australian-consumers-importing-goods-and-services)) | 10% | Yes |
| New Zealand | NZ$60,000 in 12 months ([IRD](https://www.taxpolicy.ird.govt.nz/-/media/project/ir/tp/publications/2016/2016-sr-gst-cross-border-supplies/2016-sr-gst-cross-border-supplies-pdf.pdf)) | 15% | Yes |
| Norway | NOK 50,000 in 12 months, through VOEC ([SimplyVAT](https://simplyvat.com/norway/), [Skatteetaten](https://www.skatteetaten.no/en/business-and-organisation/vat-and-duties/vat/foreign/e-commerce-voec/)) | 25% | Yes |
| Switzerland | CHF 100,000 of worldwide turnover ([ESTV](https://www.estv.admin.ch/de/mwst-steuerpflicht-auslaendische-unternehmen)) | 8.1% | Yes |
| Japan | Above ¥10M of taxable sales in the base period ([NTA](https://www.nta.go.jp/english/taxes/consumption_tax/cross-kokugai-en.pdf)) | 10% | Yes |
| South Korea | From the first sale ([vatcalc](https://www.vatcalc.com/south-korea/south-korea-vat-on-non-resident-digital-services/)) | 10% | Yes |
| India | From the first sale, as an online information service (OIDAR) ([India Briefing](https://www.india-briefing.com/news/oidar-compliance-india-gst-registration-ntor-gstr5a-digital-tax-43951.html/)) | 18% | Yes |
| US | Each state's "economic nexus": mostly $100,000 a year, and $500,000 in California, New York and Texas. Online courses are taxable in some states only ([summary](https://sails.tax/blog/economic-nexus-thresholds-by-state-2026)). | 0 to about 10% | Yes |
| Singapore | Above S$1M (§4.1) | 9% | Consumer sales yes, business sales no |

### 4.3 Stripe Tax

- **What it does:** calculates and collects tax where you have added a registration. Threshold monitoring costs nothing ([pricing](https://stripe.com/en-sg/tax/pricing)).
- **Cost:** 0.5% per transaction where registered, or $0.70 per API transaction. Tax Complete starts at $90 a month and adds registrations and filings ([Stripe](https://support.stripe.com/questions/understanding-stripe-tax-pricing)).
- **Does it register for you?** Only with Tax Complete: Stripe itself in US states ("Register for me"), and its partner Taxually elsewhere at $150 a country. The basic plan never registers or files ([docs](https://docs.stripe.com/tax/use-stripe-to-register)).
- **With Managed Payments:** not needed. Leave it off, as money.md says.

### 4.4 Tax-inclusive prices

Set "Include tax in prices" in Stripe's tax settings, or `tax_behavior=inclusive` on both Prices. Otherwise Managed Payments adds tax on top of the price ([set-up](https://docs.stripe.com/payments/managed-payments/set-up)).

The buyer then pays exactly $10 or $20. The company's share shrinks where tax is high. The table assumes Managed Payments, an international card and an SGD payout.

| Buyer in | Tax inside the price | Company keeps from $10 yearly | Company keeps from $20 forever |
|---|---|---|---|
| No tax applies | 0 | $8.60 | $17.73 |
| Thailand | 7% | $7.94 | $16.42 |
| Singapore | 9% | $7.77 | $16.08 |
| Australia, Japan, Korea | 10% | $7.69 | $15.91 |
| Germany | 19% | $7.00 | $14.54 |
| UK | 20% | $6.93 | $14.40 |
| Hungary | 27% | $6.47 | $13.48 |

Plain Stripe keeps $0.35 or $0.70 more per sale, and keeps the whole tax line wherever the company is below the threshold.

### 4.5 Tax stance for the first 3 months

- **Setup:** Managed Payments on for both Prices before the first sale. Prices tax-inclusive. Stripe Tax off.
- **Registrations:** none. No GST, OSS, UK, Thai or other registration for Pristine Mekong.
- **Records:** download Stripe's monthly payout reconciliation report for the accountant.
- **Review point:** after 3 months or US$5,000 of sales, whichever comes first. Review the buyer countries, the cost of Managed Payments, and whether some sales would be cheaper and still compliant sold direct (confirm).
- **Risk: low.** What remains:
  1. Buyers in countries Link does not cover, such as most of Latin America, leave a tiny tax liability with the company.
  2. Singapore business buyers raise no GST while the company is unregistered.
  3. If Managed Payments is refused, the fallback in §2 applies, and the EU and UK exposure starts with the first sale.

## 5. Currencies and payment methods

- **Currency:** USD only. That is the locked "$10, $20".
- **Local-currency display:** Adaptive Pricing shows a converted price in more than 150 countries ([docs](https://docs.stripe.com/payments/currencies/localize-prices/adaptive-pricing)).
  - The buyer pays a 2 to 4% conversion fee, and the company pays nothing.
  - It is always on under Managed Payments.
  - It requires the price currency to be a settlement currency. With USD prices and SGD payouts, Checkout will likely show USD, which is fine for now (confirm in test mode).
- **Later:** an SGD price option would let PayNow appear for Singapore buyers.

| Method | A Singapore account can offer it | Yearly (subscription) | Forever (one payment) |
|---|---|---|---|
| Cards, Apple Pay, Google Pay, Link | Yes | Yes | Yes |
| PayNow (1.3%) | Yes, SGD only | No ([docs](https://docs.stripe.com/payments/paynow)) | Yes, with an SGD price |
| PromptPay | No, Thai Stripe accounts only ([docs](https://docs.stripe.com/payments/promptpay)) | No | No |
| GrabPay (3.3%) | Yes, SGD and MYR | No ([docs](https://docs.stripe.com/payments/grabpay)) | Yes |
| Alipay (2.2% + S$0.35) | Yes | Recurring is a private preview only ([docs](https://docs.stripe.com/payments/alipay)) | Yes |
| WeChat Pay (2.2% + S$0.35) | Yes | No ([support table](https://docs.stripe.com/payments/payment-methods/payment-method-support)) | Yes |

Under Managed Payments, Stripe picks the methods itself: cards, Apple Pay, Google Pay, Link, and local methods such as Korean wallets and UPI. PayNow and GrabPay are not on its list today ([how it works](https://docs.stripe.com/payments/managed-payments/how-it-works)). Thai buyers will pay by card.

## 6. Consumer law and edge cases

### 6.1 EU and UK: 14 days to withdraw

- **The right:** consumers may withdraw from an online purchase within 14 days. For digital content, the right ends early only if the buyer expressly asked for immediate access and acknowledged losing the right ([UK regulation 37](https://www.legislation.gov.uk/uksi/2013/3134/regulation/37); EU Directive 2011/83, Art. 16(m)).
- **Recommendation:** do not ask buyers to give it up. Offer a 30-day full refund instead (§6.5), and Checkout needs no waiver box.
- **If the refund window ever drops below 14 days,** EU and UK buyers need an unticked box before paying: "I want access now. I understand that once access starts, I lose my right to withdraw within 14 days." The receipt or an email must then repeat that consent.
- **New since 19 June 2026:** a site selling to EU consumers needs a "withdraw from contract here" function. It needs a confirm step and an emailed acknowledgement, and it applies to non-EU sellers too ([William Fry](https://www.williamfry.com/knowledge/world-consumer-rights-day-part-3-mandatory-withdrawal-button-coming-june-2026/)). Under Managed Payments, Link is the seller and applies cooling-off rules itself ([eligibility](https://docs.stripe.com/payments/managed-payments/eligibility)). Add the button anyway (confirm who must provide it).
- **UK subscriptions:** the DMCC Act rules (renewal reminders, a second 14-day cooling-off at each renewal) are not in force. They are expected from spring 2027 at the earliest ([Osborne Clarke](https://www.osborneclarke.com/insights/uk-digital-markets-competition-and-consumers-act-subscription-contracts-regime-take-shape)).
- **Germany:** since March 2022, a consumer contract that renews by itself must, after the first term, be cancellable at any time on one month's notice ([Osborne Clarke](https://www.osborneclarke.com/insights/new-consumer-contracts-rules-germany-tighten-regulatory-regime)). A yearly plan renewing for a full year conflicts with that. The terms' "except where the law requires a refund" covers it: refund unused months to a German buyer who asks (confirm).

### 6.2 US auto-renewal laws

- **California:** amended and in force since 1 July 2025 ([Cooley](https://www.cooley.com/news/insight/2025/2025-06-04-california-automatic-renewal-law-amendments-take-effect-on-july-1-2025)). It requires separate express consent to the renewal terms, proof of that consent kept for three years, a notice 15 to 45 days before a yearly renewal, a yearly reminder, and cancellation online without obstacles.
- **FTC "click to cancel":** the Eighth Circuit vacated the rule on 8 July 2025. The FTC restarted with an advance notice on 11 Mar 2026, with comments due 13 Apr 2026 ([Cooley](https://www.cooley.com/news/insight/2026/2026-03-19-ftc-issues-new-advance-notice-of-proposed-rulemaking-on-negative-option-marketing)). No proposed rule had appeared as of 3 Oct 2026. The federal ROSCA law and state laws still apply.
- **Other states:** New York, Minnesota, Virginia and others have similar laws. Meeting California's rules covers most of them.

### 6.3 Singapore

- **CPFTA:** the Consumer Protection (Fair Trading) Act treats hiding or misstating a material fact as an unfair practice. CCCS has gone to court over "subscription traps" ([CCCS](https://www.ccs.gov.sg/media-and-events/newsroom/announcements-and-media-releases/cccs-seeks-court-order-to-stop-e-commerce-retailer-fashion-interactive-from-using--subscription-traps-/)).
- **What to show:** the renewal, the price and how to cancel, next to the buy button.
- **Prices:** CCCS's price transparency guidelines target drip pricing ([guidelines](https://www.ccs.gov.sg/consumer-protection/legislation-and-guidelines/consumer-protection--fair-trading--act-guidelines/)). Tax-inclusive prices help.

### 6.4 Renewal reminders

- **Setting:** turn on "Send emails about upcoming renewals" and set the lead time to 30 days ([Stripe](https://docs.stripe.com/billing/revenue-recovery/customer-emails)).
- **Under Managed Payments:** Stripe sends a 12-month reminder anyway, 15 days ahead by default. The lead time can be changed, with a minimum of 7 days ([how it works](https://docs.stripe.com/payments/managed-payments/how-it-works)).
- **Why 30 days:** it sits inside California's 15 to 45 day window.
- **Email:** Stripe sends the reminder, so it needs no SMTP.

### 6.5 Refund policy, chargebacks, disputes

- **Recommended policy:** any payment is refunded in full on request within 30 days, with no reason needed. After 30 days there is no refund, except where the law requires one (EU and UK withdrawal, German renewals). Cancelling stops the next renewal, and access runs to the end of the paid year.
- **Why 30 days:** it covers the EU and UK 14 days, the coming UK renewal cooling-off, and "forgot to cancel" renewals. It costs little at $10 and $20.
- **Disputes:** a clear descriptor, receipts, reminders and quick refunds keep them rare. Refund rather than fight anything under $20. A dispute ends access (§7).

### 6.6 Minors, sanctions, unsupported countries

- **Minors:** buyers must be 18 or older, or have a parent's permission. The company refunds when a parent asks. Privacy already says the course is for adults (privacy.html:64).
- **Sanctions:** Stripe serves no one in Cuba, Iran, North Korea, Syria, Crimea, Donetsk or Luhansk, and does not support Russia or Belarus ([Stripe](https://support.stripe.com/questions/sanctions-on-russia-and-belarus)). Managed Payments also excludes China and Kosovo. Checkout refuses these buyers itself, so no code is needed.

### 6.7 "Forever" and closing the course

terms.html:53 says the company "may change, suspend, or stop the course". Next to a $20 "forever" price, that reads as a trap. The fix, worded in §8:

- **Definition:** forever means for as long as the company offers rian gèng, not the buyer's life or the company's.
- **Notice:** at least 90 days by email before the course closes.
- **Refund at closing:** forever counts as two years of yearly. Closing within 24 months of a purchase returns 1/24 of $20 for each whole month short of 24. Yearly gets its unused whole months back.

### 6.8 Private Education Act

Only degree, diploma and full-time courses must register with SkillsFuture Singapore. Short courses need not ([SSG FAQ](https://www.tpgateway.gov.sg/faq/private-education-institutions)). A self-study course that awards no qualification (terms.html:37) looks outside the Act (confirm).

## 7. Implementation plan, in code.md order

**Stack notes:**

- `api/*.ts` files are Vercel Node functions. Every relative import must end in `.js` (tests/api-imports.test.ts).
- The repo calls Supabase with plain `fetch`. Add the official `stripe` package for Checkout and webhook verification; Luis approves the install.
- Pin an API version of `2025-03-31.basil` or later, which Managed Payments requires.

### Step 1. Products and Prices in test mode (Luis, 30 min)

- **Yearly:** Product "rian gèng, yearly", Price $10 USD, recurring every year.
- **Forever:** Product "rian gèng, forever", Price $20 USD, one-time.
- **Both:** tax code `txcd_20060058` (self-study web-based training), which is eligible for Managed Payments ([codes](https://docs.stripe.com/payments/managed-payments/eligibility)). Tax behavior inclusive.
- **Vercel Preview env:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_YEARLY`, `STRIPE_PRICE_ID_LIFETIME`. The key can be a restricted key: Checkout write, subscriptions write, refunds write, customers and charges read.

### Step 2. `POST /api/checkout`

New files: `api/checkout.ts`, and `src/pay/checkout.ts` for the pure parameter builder.

**Input:** `{ plan: 'yearly' | 'forever', ref?, w? }`, plus an optional `Authorization: Bearer` header from a signed-in learner.

**Output:** `{ url }`, which the browser follows.

| Session field | Yearly | Forever |
|---|---|---|
| `mode` | `subscription` | `payment` |
| `line_items` | `STRIPE_PRICE_ID_YEARLY` × 1 | `STRIPE_PRICE_ID_LIFETIME` × 1 |
| `managed_payments[enabled]` | `true` | `true` |
| `customer_email` | The signed-in or waitlist email. Checkout then shows it locked (verify in test mode). | Same |
| `client_reference_id` | Supabase user id, when signed in | Same |
| `metadata` | `{ plan, ref, renewal_consent }`. `ref` is checked by `normalizeSource` (src/waitlist-join.ts:22-26). | `{ plan, ref }`, also on `payment_intent_data.metadata` |
| `subscription_data.metadata` | `{ plan, ref, user_id }` | n/a |
| `customer_creation` | n/a, always created | `always`, so refunds and the portal find a Customer |
| `success_url` | `<origin>/?paid={CHECKOUT_SESSION_ID}` | Same |
| `cancel_url` | `<origin>/#plans` | Same |
| `consent_collection.terms_of_service` | `required`; needs the terms URL in Stripe's settings | Same |
| `custom_text.submit.message` | The renewal line (§8) | The one-payment line (§8) |

**Rules:**

- Refuse a second forever, and a second yearly.
- A signed-in yearly holder who asks for forever gets a $10 coupon on the session.
- The price buttons send `currentRef()` (src/landing/ref.ts:41-51).

### Step 3. `POST /api/stripe-webhook`

New files: `api/stripe-webhook.ts`, and `src/pay/webhook.ts` for the pure event-to-entitlement rules.

**Handling every event:**

- Read the raw body with `await request.text()`.
- Verify `Stripe-Signature` with `STRIPE_WEBHOOK_SECRET` before parsing. A failed check returns 400.
- Make it idempotent: insert `event.id` into `stripe_events`. A duplicate returns 200 and does nothing.
- Re-fetch the object from Stripe rather than trusting the order events arrive in.
- Answer `checkout.session.completed` fast, because Checkout waits up to 10 seconds for it before redirecting the buyer ([fulfillment](https://docs.stripe.com/checkout/fulfillment)).

| Event | Action |
|---|---|
| `checkout.session.completed`, `checkout.session.async_payment_succeeded` | `fulfillCheckout(session.id)`: find or create the user, write the purchase and the entitlement |
| `invoice.paid` | A renewal: `valid_until` becomes the period end plus 14 days |
| `invoice.payment_failed` | `status = past_due`. Access holds until `valid_until`, and Stripe emails the buyer. |
| `customer.subscription.updated` | Sync status, period end and `cancel_at_period_end`, so Account can show "ends on" |
| `customer.subscription.deleted` | `status = canceled`. Access ends at the end of the paid period. |
| `charge.refunded` | Full refund: `status = refunded`, access ends now, and cancel the subscription. Partial refund: no change. |
| `charge.dispute.created` | `status = disputed`, access ends, and cancel the subscription |
| `charge.dispute.closed` (added) | If won, restore access |

Since API version `2025-03-31.basil`, a Charge no longer names its invoice. Match refunds and disputes by Customer id, which every purchase now has ([Stripe](https://docs.stripe.com/billing/subscriptions/webhooks)).

### Step 4. Migration `supabase/migrations/20261005120000_entitlements.sql`

Unlike `progress`, where learners write their own row (supabase/migrations/20260923140000_progress.sql:13), learners can only read here. Only the service role writes.

```sql
create table public.entitlements (
  user_id uuid primary key references auth.users (id) on delete cascade,
  plan text not null check (plan in ('yearly', 'forever', 'comp')),
  status text not null check (status in ('active', 'past_due', 'canceled', 'refunded', 'disputed')),
  valid_until timestamptz, -- null means no end date (forever, comp)
  stripe_customer_id text,
  stripe_subscription_id text,
  source text check (char_length(source) <= 32),
  updated_at timestamptz not null default now()
);
alter table public.entitlements enable row level security;
revoke all on table public.entitlements from public, anon, authenticated;
grant select on table public.entitlements to authenticated;
grant all on table public.entitlements to service_role;
create policy entitlements_select_own on public.entitlements
  for select to authenticated using (auth.uid() = user_id);

-- One row per Checkout Session: the sales ledger and the one-time claim.
create table public.purchases (
  checkout_session_id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  plan text not null,
  amount_total integer not null,
  currency text not null,
  renewal_consent text,
  created_at timestamptz not null default now(),
  claimed_at timestamptz,
  refunded_at timestamptz
);
create table public.stripe_events (
  id text primary key,
  type text not null,
  received_at timestamptz not null default now()
);
alter table public.purchases enable row level security;
alter table public.stripe_events enable row level security;
revoke all on table public.purchases, public.stripe_events from public, anon, authenticated;
grant all on table public.purchases, public.stripe_events to service_role;

-- Find an account by email, for the server only.
create function public.user_id_by_email(address text) returns uuid
  language sql security definer set search_path = ''
  as $$ select id from auth.users where email = lower(address) limit 1 $$;
revoke execute on function public.user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.user_id_by_email(text) to service_role;

-- Invited learners keep the course.
insert into public.entitlements (user_id, plan, status, source)
select id, 'comp', 'active', 'invite' from auth.users
on conflict (user_id) do nothing;
```

### Step 5. Identity: pay first (the open question in code.md)

**Recommendation: pay first. The checkout email becomes the account.**

1. **Choose a plan.** A visitor clicks a price.
   - Not signed in: Checkout asks for an email.
   - Signed in, or arriving from a waitlist link: Checkout shows the email, locked.
2. **Fulfil.** `fulfillCheckout` runs from both the webhook and the success page.
   - It finds the user by `client_reference_id`, else by email.
   - Otherwise it creates the user with the admin API, `email_confirm: true` and no password ([createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser)).
   - Then it writes the entitlement.
3. **Return.** Stripe sends the buyer to `/?paid=cs_...`, and the landing posts that id to a new `api/claim.ts`.
4. **Claim.** `/api/claim` retrieves the session with the secret key. It checks `status = complete`, `payment_status = paid`, a session less than 24 hours old, and an empty `purchases.claimed_at`. If the account has never signed in (`last_sign_in_at` is empty), it calls `generateLink({ type: 'recovery', email, redirectTo: origin })`. That returns a link and sends no email ([generateLink](https://supabase.com/docs/reference/javascript/auth-admin-generatelink)). The claim sets `claimed_at` and returns the link.
5. **Set a password.** The browser follows the link. Supabase returns to `/#access_token=...&type=recovery`, which the landing already handles:
   - `parseAuthLink` reads it (src/storage/auth.ts:205-215);
   - the "New password" form opens (src/landing/main.tsx:148-170);
   - `updatePassword` and `/api/gate` finish the job (main.tsx:99-129).
6. **Existing accounts** get no link, only the line "Paid. Log in with your password."

**This works without SMTP for first access.** SMTP is still needed for forgotten passwords: Supabase's built-in mailer reaches only team addresses, 2 emails an hour ([Supabase](https://supabase.com/docs/guides/auth/auth-smtp)). Until SMTP exists, Luis can make a recovery link with the same admin call and send it from Gmail.

**Rejected: sign in first.** There is no sign-up today. Opening sign-up needs email confirmation, which needs SMTP.

**Safety:**

- The session id in the address bar is single-use and expires after 24 hours.
- Remove `?paid` with `history.replaceState` before Vercel Analytics records the page.
- Let `?paid` through in src/landing/redirect.ts:11, as `?signin` is.

### Step 6. Gate `/learn` on the entitlement

**Today:** any valid session gets the same cookie, sha256(SITE_PASSWORD), for 30 days (api/gate.ts:8-23, src/gate-token.ts:7-10 and 49-61).

**Changes:**

- `src/gate-account.ts`: `accountMayPass` becomes `accountUser`, which returns the user id from `/auth/v1/user`.
- `api/gate.ts`: reads the entitlement with the service role. Entitled means `forever` or `comp` with `status = active`, or `yearly` with `valid_until` in the future and no refund or dispute. Otherwise it answers 402 `{ ok: false, reason: 'no-plan' }`, and the landing shows the prices (the status is handled at main.tsx:125-129).
- `src/gate-token.ts`: the cookie becomes `rk_gate = v1.<userId>.<exp>.<hmac>`, an HMAC-SHA256 with a server secret. `decideGate` verifies it with Web Crypto, which works at the edge with no database call in middleware. `exp` is 30 days for forever and comp; for yearly, 7 days or `valid_until`, whichever comes first.
- `api/session.ts`: verifies the cookie, re-reads the entitlement, and clears the cookie when access has lapsed. The course already asks on every online open (src/gate-check.ts:7-23), so a refund locks the course the next time it opens online.
- **Secret (code.md open question):** use `SITE_PASSWORD` as the signing key now, and rename it `GATE_SECRET` later. It stops being a way in. Luis and any reviewer get in through their own `comp` rows.
- **Known gap:** the service worker opens a cached course offline without asking (src/gate-check.ts:1-6). A lapsed buyer keeps offline access until the next online open. That is acceptable.
- **Tests to update:** tests/gate.test.ts, tests/gate-token.test.ts, tests/gate-account.test.ts.

### Step 7. The 13 on the waitlist

- **Link:** Luis's personal email to each person (doc 03) carries `https://riangeng.com/?buy=forever&w=<id>.<hmac>`, plus a yearly twin.
- **Checkout:** `/api/checkout` reads the `waitlist` row (email, source) with the service role. It prefills the email, locked, and sets `ref` to the row's `source`, or `waitlist` when there is none.
- **Making the links:** a small local script prints the 13 links. Never commit them.
- **Simpler fallback:** put the email in the link. That leaves the address in request logs.

### Step 8. Customer Portal

- **Now: the no-code login link.** Activate it in Billing settings. Stripe emails the buyer a login link, so no SMTP is needed ([Stripe](https://docs.stripe.com/customer-management/activate-no-code-customer-portal)). Allow cancel at period end, card update and invoices, but no plan switching.
- **Account page:** add a "Plan" block to src/ui/Account.tsx above "Sign out" (lines 526-542). It shows the plan, the renewal or end date, the portal link with `?prefilled_email=`, and "Withdraw from contract here" while a refund is open.
- **Later:** `api/portal.ts` creates a portal session for the signed-in learner, in one click and with no email step.
- **Managed Payments buyers** can also manage their plan at link.com.

### Step 9. From test to live

1. **Test mode, end to end:** buy both plans, run a renewal and a failed renewal with test clocks, refund a payment, and raise a dispute with Stripe's dispute test card. Check the gate after each step.
2. **Live setup:** finish activation and accept Managed Payments in live mode. Copy the Products to live, add a live webhook endpoint for the same events (it has its own secret), and repeat the portal, renewal and retry settings.
3. **Environments:** Vercel Production gets the live values. Preview keeps the test values.
4. **Smoke test:** Luis buys forever with his own card, walks the whole flow, then refunds it. That costs about $2.30 in fees.
5. **Go:** Luis says go. Only then do buy buttons appear.

### Edge cases

| Case | Handling |
|---|---|
| Duplicate purchase | `/api/checkout` refuses a second plan. A double charge in a race is refunded by hand. |
| Yearly to forever | Forever with a $10 coupon. On payment, cancel the yearly subscription at once, with no refund; the coupon was the credit. |
| Refund or dispute | Access ends at once. A won dispute restores it. |
| Failed renewal | Smart Retries for about 2 weeks, then cancel. Access continues 14 days past the period end. |
| Checkout email differs from the account email | Signed in: `client_reference_id` wins, and the plan goes to the signed-in account. Not signed in: the checkout email is the account. |
| A comp learner buys | The comp row becomes yearly or forever. |
| Buyer never reaches the success page | The webhook still creates the account and the plan. The buyer resets the password (needs SMTP) or writes in. |
| The 13 on the waitlist | Signed links (step 7) |

## 8. Site changes Stripe activation needs (draft text)

The text follows house style (commas and periods, no em dashes) and passes both `slopHits` (tests/copy-rules.ts) and `slopless`. It is written for Managed Payments. With Stripe direct, the Payment paragraph would name Pristine Mekong as the seller, with the descriptor `RIANGENG.COM`. A lawyer reviews it before it goes live (confirm).

### terms.html

Add these sections after "Waitlist", which keeps "Joining does not reserve a date, a price, or a place" (terms.html:50). Replace the Service paragraph (terms.html:53) with the one below.

> **Plans and prices.** rian gèng has two plans. Yearly costs $10 a year and renews each year until it is cancelled. Forever costs $20 once. Prices are in US dollars and include any sales tax, VAT, or GST. A card issuer may add its own currency or foreign card fees.
>
> **Forever.** Forever means for as long as the company offers rian gèng. It does not mean the life of the buyer or of the company.
>
> **Payment.** Stripe takes the payment. Link, LLC, a Stripe company, sells the plan as the seller of record, charges the card, collects any tax, and sends the receipt. Pristine Mekong Pte. Ltd. provides the course. A charge shows on a card statement as LINK.COM* RIANGENG.
>
> **Renewal and cancellation.** The yearly plan renews on the same date each year, at the price shown at purchase, until the account holder cancels it. About 30 days before each renewal, an email states the date, the amount, and how to cancel.
>
> Cancelling takes one step: Plan, in Account, or the link in the reminder. A cancelled plan stays open to the end of the paid year and does not renew. A new price applies only from a renewal after an email has announced it, with time to cancel first.
>
> **Refunds.** Any payment is refunded in full when the account holder asks within 30 days of it. No reason is needed. Write to pristinemekong@gmail.com, or use Withdraw from contract here, under Plan in Account. A refund closes the plan it pays back. After 30 days, a payment is not refunded, except where the law requires a refund.
>
> **Withdrawal.** A consumer in the European Union or the United Kingdom may withdraw from a purchase within 14 days, without giving a reason. The 30-day refund covers that right in full. To withdraw, use Withdraw from contract here, under Plan in Account, then Confirm withdrawal, or write to pristinemekong@gmail.com from the email of the account. An email confirms the withdrawal.
>
> **Who may buy.** A buyer must be 18 or older, or have a parent's or guardian's permission. When a parent writes that a child bought a plan without permission, the company refunds it. The company may refuse an order that a law, a sanction, or the payment provider does not allow.
>
> **If the course closes.** The company may close rian gèng. It emails every paying account at least 90 days before the last day. A yearly plan gets back its unused whole months.
>
> A forever plan counts as two years of the yearly plan. When the last day falls less than 24 months after a forever purchase, the buyer gets back 1/24 of the price for each whole month short of 24. From 24 months on, a forever plan has no refund at closing.
>
> **Service.** The company may change the course, or take it offline for maintenance or for reasons outside its control. Closing the course follows If the course closes.
>
> **Contact.** Questions, refunds, and complaints go to pristinemekong@gmail.com. The company replies within two working days.

### privacy.html

- **Data list:** add after "Account" (privacy.html:40).
- **Processors:** add to the paragraph at privacy.html:54.
- **Retention:** add to the section at privacy.html:57-59.
- **Date:** update privacy.html:65.

> **Payment.** When someone buys a plan, Stripe and Link collect the card details, the billing address, and the email. The company never sees the card number. It keeps the email, the plan, the dates, the amounts, the country, and Stripe's references for the customer and the payment, to open the course and to keep the accounts the law requires.
>
> **Processors.** Stripe processes payments. Link, LLC, a Stripe company, sells the plans as the seller of record, collects tax, and sends receipts. Stripe and Link also use payment data for their own fraud checks and legal duties, under their own privacy notices. Their servers may be outside Singapore.
>
> **Retention.** Payment records are kept for at least five years, as Singapore law requires for company accounts.

Stripe acts as an independent controller for its own fraud prevention ([Stripe privacy](https://stripe.com/privacy)). The "no analytics" line (privacy.html:47) is doc 04's to fix.

### Footer and contact

- **Where:** add `<p class="footer-contact"><a href="mailto:pristinemekong@gmail.com">pristinemekong@gmail.com</a></p>` to the footers of index.html (line 249), terms.html (line 66) and privacy.html (line 67).
- **Why its own line:** tests/legal.test.ts:22-25 expects exactly Privacy and Terms inside `.footer-legal`.
- **Stripe settings:** the support email is the same address. The terms URL is `https://riangeng.com/terms` and the privacy URL is `https://riangeng.com/privacy`.

### Checkout consent text

**On the price cards, before Stripe:**

> Yearly. $10 a year. Renews each year until cancelled. Cancel in Account at any time. Full refund within 30 days of any payment.
>
> Forever. $20 once. For as long as rian gèng runs. Full refund within 30 days.

**Yearly only,** a required checkbox, unticked by default. Store its text version and time in the session metadata and in `purchases.renewal_consent`, for California's three-year proof.

> I agree that the yearly plan renews at $10 each year until I cancel it.

**In Stripe,** in `custom_text.submit.message`:

> Yearly: Renews at $10 a year on this date until cancelled. Cancel in Account, under Plan. Full refund within 30 days of any payment.
>
> Forever: One payment. Open for as long as rian gèng runs. Full refund within 30 days.

**Terms checkbox:** keep Stripe's default wording from `consent_collection.terms_of_service`, so it links to the terms URL.

**Receipts:** Link sends the receipts. The company's name and UEN go in Stripe's public details, and no receipt may say "GST" while the company is unregistered.

## 9. Checklists

### Luis, in dashboards

**Stripe (the company's account)**

- [ ] Open the account as Pristine Mekong Pte. Ltd. (UEN 202609906N), with the company's SGD bank account. Complete KYC, including the Sept 2026 items (§2).
- [ ] Turn on two-factor sign-in with a passkey.
- [ ] Public details: name "rian gèng", website https://riangeng.com, support email pristinemekong@gmail.com, descriptor `RIANGENG.COM`, shortened `RIANGENG`, terms and privacy URLs.
- [ ] Settings, Managed Payments: accept the terms, and check the eligibility result.
- [ ] Settings, Tax: "Include tax in prices". Leave Stripe Tax off.
- [ ] Test mode: create the two Products and Prices (step 1), and send the four values to Claude.
- [ ] Billing, subscriptions and emails: renewal emails 30 days ahead, failed-payment and expiring-card emails on, Smart Retries for 2 weeks and then cancel.
- [ ] Customer Portal: cancel at period end, card update, invoice history, no plan switching. Activate the login link.
- [ ] Webhook endpoint `https://riangeng.com/api/stripe-webhook`, with the events in step 3.
- [ ] Live mode only after the test run, and only when you say go.

**Vercel**

- [ ] Upgrade to Pro ($20 a month per developer seat) before any price shows ([Vercel](https://vercel.com/docs/plans/hobby)). P0.
- [ ] Add the Stripe env vars: test values in Preview, live values in Production at go.

**Supabase**

- [ ] Choose an SMTP provider and turn on custom SMTP, before the first live charge.
- [ ] Auth URL settings: site URL `https://riangeng.com`; redirects allow `https://riangeng.com/` and `/learn/`.
- [ ] Keep sign-ups off.
- [ ] Run the entitlements migration. Check that every invited account got a `comp` row.

**Bank and books**

- [ ] An SGD business account in the company's name. USD is optional, later.
- [ ] Download Stripe's payout reconciliation report each month for the bookkeeper.

**Questions for the accountant**

1. Under Managed Payments, is our revenue the full price or Link's net? Do we invoice Link? How do we book withheld tax and fees?
2. Can yearly be booked as deferred revenue over 12 months, and forever over 24 months? Does tax follow the accounts?
3. Do we stay unregistered for GST until S$1M? If we ever register, are supplies to Link zero-rated?
4. What is the best way to pay Luis, given where he is tax resident: salary, director's fee or dividend? Does he need a work pass?
5. Can the company repay Luis's outlays, such as Vercel and the domain, as a director's loan?
6. What are our financial year end and first YA, and do we qualify for the start-up exemption, the ECI waiver and Form C-S (Lite)?

**Questions for the lawyer**

1. Review the clauses in §8.
2. Who must provide the EU withdrawal button under Managed Payments?
3. Does Germany's rule on renewing contracts apply to the yearly plan?
4. Is the California consent checkbox enough?
5. Is the Private Education Act out of scope?

### Code (ordered, with effort)

| # | Task | Files | Effort |
|---|---|---|---|
| 1 | Env names in `.env.example`; add the `stripe` dependency once Luis approves | `.env.example`, `package.json` | 0.5 h |
| 2 | Checkout endpoint and parameter builder, with tests | `api/checkout.ts`, `src/pay/checkout.ts`, `tests/checkout.test.ts` | 0.5 day |
| 3 | Webhook: signature check, idempotency, event rules, with tests | `api/stripe-webhook.ts`, `src/pay/webhook.ts`, `tests/stripe-webhook.test.ts` | 1 day |
| 4 | Migration: entitlements, purchases, events, email lookup, comp backfill | `supabase/migrations/20261005120000_entitlements.sql` | 2 h |
| 5 | Shared `fulfillCheckout` and Supabase admin calls | `src/pay/fulfill.ts`, `src/pay/supabase-admin.ts` | 0.5 day |
| 6 | Success-page claim, set password without SMTP | `api/claim.ts`, `src/landing/main.tsx`, `src/landing/redirect.ts`, `src/landing/copy.ts` | 0.5 day |
| 7 | Gate on the entitlement, with a signed per-user cookie | `api/gate.ts`, `src/gate-account.ts`, `src/gate-token.ts`, `api/session.ts`, gate tests | 0.75 day |
| 8 | Price cards, renewal checkbox, buy buttons (hidden until go) | `index.html`, `src/landing/*` | 0.5 day |
| 9 | Account "Plan" block: portal link, withdraw button with confirm step | `src/ui/Account.tsx`, `src/ui/copy.ts` | 0.5 day |
| 10 | Legal pages and footer, update tests/legal.test.ts | `terms.html`, `privacy.html`, `index.html` | 2 h |
| 11 | Waitlist signed links and local script | `api/checkout.ts`, `scripts/waitlist-links.ts` | 2 h |
| 12 | Test-mode run of every edge case in §7 | none | 0.5 day |
| 13 | Later (P2): API portal sessions; SGD price for PayNow; review direct versus Managed Payments | `api/portal.ts` | 0.5 day |

The total for P1 is about 5 working days. Items 10 and the P0 pricing copy can ship before the rest, once Vercel is on Pro.
