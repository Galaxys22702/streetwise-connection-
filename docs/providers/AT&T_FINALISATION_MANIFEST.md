# Streetwise Connection — AT&T Finalisation Manifest

Prepared: 2026-08-30

## Purpose

This manifest records what has been prepared before handing the remaining external actions to the owner.

## Code prepared

- AT&T is the primary domestic provider candidate.
- 1GLOBAL is the required domestic fallback comparison.
- eSIM Go is optional for domestic comparison and retained for travel/data.
- AT&T has a dedicated fail-closed client gate.
- AT&T commercial approval and live provisioning are separate explicit switches.
- No AT&T provisioning endpoint, SKU, payload or authentication scheme is fabricated.
- Provider readiness now requires AT&T-specific evidence for:
  - approved partner path;
  - Tier 1 support model;
  - end-user billing model;
  - FRN status/requirement;
  - API access;
  - branding rights.
- Commercial readiness remains blocked while AT&T or 1GLOBAL facts are incomplete.
- Live payments and live provider ordering remain disabled.
- Tests verify the AT&T strategy and safety gates.

## Configuration prepared

AT&T placeholders:

ATT_PARTNER_PATH  
ATT_WHOLESALE_API_BASE_URL  
ATT_WHOLESALE_CLIENT_ID  
ATT_WHOLESALE_CLIENT_SECRET  
ATT_WHOLESALE_ACCOUNT_ID  
ATT_COMMERCIAL_CONTRACT_APPROVED=false  
ATT_LIVE_PROVISIONING_ENABLED=false

Secrets belong only in deployment secret storage after approval.

## Provider documents prepared

- docs/ATT_PROVIDER_APPLICATION_PACKET.md
- docs/PROVIDER_COMPARISON.md
- docs/PROVIDER_ONBOARDING.md
- docs/PROVIDER_OUTREACH.md
- docs/provider-commercial-evidence.example.json
- docs/OWNER_ACTIONS.md

## Signature / legal handoff prepared

- docs/business/SIGNATURE_READY_PACKET.md
- docs/business/AT&T-SIGNATURE-READY-PACKET.md
- docs/business/LICENSE_APPLICATION_PACKET.md
- docs/business/EIN-WORKSHEET.md
- docs/business/FORMATION-CHECKLIST.md
- docs/business/OPERATING-AGREEMENT-DRAFT.md
- docs/business/REGULATORY-MATRIX.md
- docs/business/PRIVACY-POLICY-DRAFT.md
- docs/business/TERMS-OF-SERVICE-DRAFT.md
- docs/business/REFUND-SUPPORT-POLICY-DRAFT.md
- docs/business/IMPLEMENTATION_HANDOFF.md

## Public-site rule

Do not add AT&T branding or state that Streetwise is an AT&T reseller/partner/MVNO until written branding/resale rights exist.

The public site remains a Streetwise waitlist.

## Coding boundary

The remaining AT&T provisioning code cannot be completed correctly before AT&T supplies the approved technical contract/API specification.

When that arrives, implement only the documented resources, authentication, product IDs and lifecycle operations.

## External completion boundary

Only external/owner/provider/regulator actions should remain after this branch is merged:

- private identity/address information;
- official filings and payments;
- signatures;
- AT&T application submission and provider response;
- provider contracts/pricing;
- regulator determinations/filings;
- API credentials;
- controlled provider tests;
- final production authorisation.

Anything else belongs back in the repository rather than on the owner's manual checklist.
