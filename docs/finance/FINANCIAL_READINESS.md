# Streetwise Connection — Financial Readiness

Last reviewed: **2026-09-25**

This document is the financial launch gate for Streetwise Connection. It separates verified project facts from costs that are still unknown. Unknown values must not be replaced with guesses.

## Current planning revenue

The repository currently defines these target retail prices:

- Streetwise Home: **$25/month**
- Business Starter: **$20/month per line**
- Business Volume: **$15/month per line for 3+ lines**
- Business Pro: **$30/month per line**

These are planning prices, not approved sellable offers.

## Costs that must be known before launch

A launch budget cannot be considered complete until the project has documented:

- wholesale network/bundle cost for each mapped plan;
- provider setup, deposit, wallet or minimum-commitment requirements;
- SIM/eSIM provisioning and lifecycle charges;
- payment processing costs;
- applicable telecom taxes, fees and surcharges;
- Nevada formation, licensing and registration costs;
- hosting, database, monitoring and domain costs;
- customer support and fraud/chargeback reserve;
- refund and failed-activation exposure;
- insurance or professional-service costs if required by the final operating model;
- working capital required to fund provider transactions before customer receipts settle.

## Unit-economics gate

For each plan:

`contribution = retail price - wholesale/provider cost - payment cost - support/fraud reserve - infrastructure reserve - tax/telecom reserve - other variable costs`

A positive contribution is only a screening result. Launch still requires written commercial rights, validated provider pricing, controlled staging tests and sufficient working capital.

## Current financial status

- Retail targets: **documented**
- Real account-specific wholesale pricing: **not verified in repository**
- Provider minimum commitments/deposits: **not verified in repository**
- Telecom tax/surcharge allocation: **not resolved**
- Payment production mode: **disabled**
- Live provider ordering: **disabled**
- Launch working-capital requirement: **cannot yet be calculated reliably**
- Final gross/contribution margin by plan: **not yet validated**

## Financial register

Use this register as the checklist for replacing unknowns with dated evidence.

| Input | Current value | Evidence required |
| --- | --- | --- |
| Wholesale cost by plan | Unknown | Provider rate card/catalogue + mapped SKU |
| Provider setup/deposit/minimum | Unknown | Written provider commercial terms |
| Activation/SIM/eSIM lifecycle fees | Unknown | Provider fee schedule |
| Payment processing | Unknown for launch | Processor production pricing/contract |
| Telecom taxes/surcharges | Unresolved | Tax/regulatory determination for final model |
| Nevada formation/licensing | Incomplete | Filed receipts and official fee evidence |
| Hosting/database/monitoring | Not consolidated | Current vendor invoices/plan pricing |
| Support/fraud reserve | Not approved | Operating assumption backed by test/actual data |
| Refund/chargeback reserve | Not approved | Payment/refund policy + operating assumption |
| Launch working capital | Not quantified | Completed cost stack + provider settlement timing |

### Monthly planning formula

For a scenario with multiple plan types:

`monthly contribution = Σ(active lines × per-line contribution) - fixed monthly operating costs`

For launch cash:

`minimum launch cash = one-time setup costs + provider deposits/pre-funding + fixed-cost runway + refund/fraud reserve + settlement-timing buffer`

Do not publish a break-even customer count until wholesale costs, taxes and fixed operating costs are evidenced. A neat spreadsheet built on imaginary inputs is still imaginary.

## Required evidence

Store confidential provider pricing outside the public repository. Record only sanitised conclusions here after validation. Financial approval should reference dated evidence for provider pricing, payment fees, tax treatment, fixed operating costs and required reserves.

## Launch rule

Do not enable live billing or provider-funded orders merely because a target retail price looks profitable. Financial readiness passes only when the cost stack is evidenced, contribution margin is calculated for every sellable tier, required launch cash is quantified, and the business can fund expected activation/refund/provider timing exposure without relying on unverified assumptions.
