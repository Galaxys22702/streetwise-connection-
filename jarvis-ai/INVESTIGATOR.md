# JARVIS Investigator Module v0.1

Scope: public-source research and security work on systems owned by or explicitly authorized to the operator. No bypass of access controls, sealed records, or nonpublic personal contact details.

## Case lifecycle
Intake → Scope/authorization → Evidence → Analysis → Review → Authorized remediation → Verification → Closure.

## Evidence standard
Every finding records a source URL or file reference, observed date, collection method, factual excerpt, confidence (confirmed / corroborated / unverified), and limitations. Keep allegations separate from proven facts. Do not fabricate citations.

## Security rules
- Default to read-only. Require explicit approval before modifying external services.
- Do not store API keys, session cookies, or sensitive personal information in browser localStorage.
- Treat public profile research as public-only; no private account access.
- Do not label simulated execution as a real repair.
- Keep investigation notes private; do not publish reports automatically.

## Case template
- Case ID and title:
- Purpose and authorized scope:
- Sources and observation dates:
- Timeline:
- Findings with evidence references:
- Confidence and alternative explanations:
- Proposed actions and approvals:
- Changes performed (commit/deployment IDs):
- Verification results:
- Open risks and next steps:

## Planned capabilities
Case management, source verification, security findings, remediation approval, audit history, and report export. Connector actions remain disabled until authentication, authorization, and deployment protection are independently verified.
