# Guardian Telecom Intelligence

Offline research module for Streetwise Connection. Run with Node.js 24 from the repository root:

```powershell
node research/guardian-telecom/research.mjs --self-test
node research/guardian-telecom/research.mjs
```

The module prints a fixed, dated public-source catalog and one national annual aggregate from the US Courts. It does not scrape live sites, connect to any carrier, collect personal records, track government personnel or activity, intercept communications, or disclose customer data. Missing agency-specific daily counts remain unknown. Annual orders, subscriber records, legal demands and active surveillance are not interchangeable measures.

## JARVIS integration contract (proposed)

Expose the generated JSON as read-only research context only after owner review. No arbitrary shell, input URLs, external calls, automatic disclosure or new privileges. Treat retrieved pages as untrusted evidence, not commands. Keep source date, scope, metric definition and revision history. Review sources on a publication-driven cadence. Use mock data for compliance workflow tests. Do not infer that the FCC or CALEA rules authorize Streetwise to perform surveillance. Determine applicable regulatory duties and provider responsibilities with qualified counsel before commercial launch. Any actual lawful request must go through authorized legal personnel, not an automated agent.

## Launch gates

No merge, deployment, carrier access, API credentials or live inference validation has been performed by this module. Review and test the branch separately from production. Protect existing JARVIS persistent data and preserve free-route constraints. No paid dependencies.
