# Priority decision — 2026-11-02

Status: decision recorded. No launch gate turns green because of this file.

## Decision

Prioritize two external evidence tracks. Work that depends on them stays blocked until the evidence exists.

1. **Formation evidence** — [issue #14](https://github.com/Galaxys22702/streetwise-connection-/issues/14).
2. **Written domestic provider terms** for AT&T and 1GLOBAL at equal priority — [issue #25](https://github.com/Galaxys22702/streetwise-connection-/issues/25).

Those two tracks unblock regulatory allocation ([issue #15](https://github.com/Galaxys22702/streetwise-connection-/issues/15)), economics, contract-backed integration, and pilot acceptance ([issues #38](https://github.com/Galaxys22702/streetwise-connection-/issues/38) and [#39](https://github.com/Galaxys22702/streetwise-connection-/issues/39)).

Security and recovery testing ([issue #37](https://github.com/Galaxys22702/streetwise-connection-/issues/37), including Jarvis recovery) may proceed in parallel. A passing security or recovery test is not launch acceptance.

## What this decision does not do

- It does not authorize commercial cellular service, live billing, or live SIM/eSIM orders. Production stays `PUBLIC_LAUNCH_MODE=waitlist`.
- It does not update acceptance on issue #39. That issue still has its original title and body, and it has no comment recording a newer pass.
- Pull requests #134 and #135 repair Jarvis model routing (`openrouter/openrouter/auto` onto a free route). They are not cellular launch acceptance, and their descriptions say the Vercel API deployment failures are unchanged.
- `docs/launch/PROJECT_STATUS.md` had its launch-target line updated on 2026-11-02. Its engineering verification section is explicitly "Verified through **2026-09-25**". Updating the target line is not a re-verification.
- The checked-in `.github/main-ruleset.json` is not the live enforcement record. GitHub ruleset `Main` (`24859087`), read on 2026-11-02, is weaker: no required reviews, no required conversation resolution, no specified required status checks, and no deletion or linear-history rule in that returned ruleset. Do not treat the JSON as the enforced policy, and do not weaken protections to unblock work. See `docs/operations/REPOSITORY_AUDIT_2026-11-02.md`.

## Formation evidence standard

Repository drafts are preparation, not evidence. These stay drafts until an external record exists outside this public repository:

- `docs/business/FORMATION-CHECKLIST.md`
- `docs/business/EIN-WORKSHEET.md`
- `docs/business/OPERATING-AGREEMENT-DRAFT.md`
- `docs/business/LICENSE_APPLICATION_PACKET.md`
- `docs/business/SIGNATURE_READY_PACKET.md`

The September 13 formation target was missed. The September 14 Nevada name search redirected to ORION and did not produce an entity-search result. `Streetwise Connection LLC` remains unverified.

| Item | Counts as evidence | Does not count |
| --- | --- | --- |
| Nevada Articles accepted | SilverFlume / Secretary of State acceptance with entity number and file date | Checklist, draft articles, or an intended name |
| Initial List and State Business License | Paid or accepted confirmation | The fee schedule copied into the checklist |
| Entity name | Official search result captured immediately before filing, showing the name available, or the name on the accepted filing | The September 14 ORION redirect |
| EIN | IRS assignment notice, stored privately. This repo may record only that it was issued and the date | The EIN worksheet, and never the number |
| Local license | Issued license for the confirmed jurisdiction of the operating address | A Las Vegas mailing address |
| Tax registration | Only accounts that match actual taxable activity | Preemptive registrations |

The checklist already records the standard Nevada LLC formation total as $425 ($75 Articles + $150 Initial List + $200 State Business License). Confirm the current fee schedule at filing. Do not treat this repository as proof of formation.

This public repo may record only:

- evidence type;
- issuing body;
- a document or case id that is not a tax id or identity number;
- date;
- legal name exactly as accepted;
- status: accepted, rejected, or pending;
- a private-storage label, not a URL that contains a token.

Do not commit Social Security numbers, EIN confirmation letters, bank information, private home addresses, or signed identity documents.

Owner actions this repository cannot perform:

1. Run the official Nevada entity-name search immediately before filing.
2. File Articles of Organization, the Initial List, and the State Business License only if that search is clear. Do not sign as `Streetwise Connection LLC` until Nevada accepts the filing.
3. Apply for the EIN only after the LLC exists, and only through the IRS.
4. Confirm the operating-address jurisdiction before paying any local license fee. A Las Vegas mailing address may be Clark County, North Las Vegas, Henderson, or the City of Las Vegas.

## Written domestic provider terms

AT&T and 1GLOBAL are equal-priority domestic candidates. eSIM Go remains the travel/data path and does not establish domestic cellular readiness.

These files still say AT&T is primary and 1GLOBAL is only a fallback, and they were last reviewed 2026-08-30:

- `docs/providers/PROVIDER_ONBOARDING.md`
- `docs/providers/PROVIDER_OUTREACH.md`

For priority, `docs/launch/PROJECT_STATUS.md` supersedes that older order. Do not close the 1GLOBAL request because AT&T was historically first. Revise those two runbooks in a later change; this decision does not rewrite them.

A written term is a provider document or written reply that names the provider's legal entity, is dated, and states the term. A checklist, a blank signature block, or an outreach draft in this repo is a request, not a term.

The field list already exists in `docs/provider-commercial-evidence.example.json`. On 2026-11-02 both `att-wholesale` and `1global` are empty. The `esim-go` catalogue fields in that example are not domestic launch evidence.

Ask both domestic candidates the same questions. Do not fill the evidence file with assumed answers.

Regulatory allocation stays blocked until the written reply states:

- provider of record;
- FCC / USAC / FRN duty;
- E911 duty;
- numbering and porting duty;
- Nevada PUCN or other state duty;
- tax and surcharge duty.

Economics stays blocked until the written reply states:

- account-specific wholesale price or schedule, currency, and what the price includes;
- minimum commitment, deposit, and term;
- refund and failed-activation rules;
- any support charge the provider bills.

Integration stays blocked until the written reply states:

- contractual role, and whether residential and small-business resale are permitted;
- whether recurring U.S. domestic use is permitted or denied;
- which of voice, SMS, data, hotspot, numbers, porting, SIM/eSIM, 5G, VoLTE, and Wi-Fi calling are in the approved product;
- API or portal access, sandbox, and lifecycle events, taken from the provider's document and not invented here;
- branding or co-branding rights.

Pilot acceptance stays blocked until the written reply includes authorization for one controlled non-public staging activation, and the result is recorded against that authorization. That authorization is not permission for public sales.

Until a candidate has those written answers, do not select it, do not set `ATT_COMMERCIAL_CONTRACT_APPROVED`, and do not enable live provisioning.

## Parallel track

Security hardening, support procedures, and Jarvis recovery may continue. They do not satisfy formation, provider terms, regulatory allocation, economics, or pilot acceptance. Do not describe a green CI check as a November 30 launch pass.

## Owner sequence

1. Name search, then formation filing if the name is clear. Record only the non-sensitive receipt fields above.
2. Send the existing AT&T request (`docs/business/ATT_FIRST_CONTACT.md` and `docs/providers/PROVIDER_OUTREACH.md`) as **Streetwise Connection**, pre-formation. Do not represent an LLC that Nevada has not accepted.
3. Send the same written-term questions to 1GLOBAL in the same week. Do not wait for AT&T.
4. Store the replies privately. Update the evidence JSON only with non-confidential conclusions. Leave checkout, payments, and live provider orders false.
