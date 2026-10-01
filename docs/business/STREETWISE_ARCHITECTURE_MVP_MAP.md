# Streetwise Architecture & MVP Map

> Planning document for turning the Streetwise portfolio into a small number of coherent products without prematurely splitting the codebase.

## 1. Product boundaries

| Product | Primary customer | Core problem | MVP status |
|---|---|---|---|
| Streetwise Connection℠ | Consumers and small businesses needing cellular connectivity | Cellular service is confusing, fragmented, and difficult to manage | Development / launch-readiness |
| Streetwise Networking | Homes and small businesses | Wi-Fi, networking, computers, and connectivity are difficult to diagnose and maintain | Planned |
| Streetwise Security | Homes and small businesses | Accounts, devices, and networks need practical defensive protection | Planned |
| Streetwise Remote Support | Customers who need ongoing technical help | Problems often need troubleshooting without an on-site visit | Planned |
| Streetwise AI Operations | Internal Streetwise operations | Business, technical, and communication work needs coordination and auditability | Development concept |

## 2. Shared capabilities

The following should be reusable across products rather than rebuilt separately:

- Identity and access control
- Customer/contact records
- Organisation and service-line records
- Task and project tracking
- Support/ticket workflow
- Notifications and communications
- Audit logging
- Document/policy storage
- Billing abstraction
- Provider/integration abstraction
- Security controls and secrets management
- Observability and error reporting

Shared infrastructure is a design goal, not permission to couple unrelated production systems.

## 3. Dependency map

```text
                    ┌─────────────────────┐
                    │   AI Operations     │
                    │ JARVIS / TECH /     │
                    │ CALLER / OPS        │
                    └──────────┬──────────┘
                               │
                    tasks / audit / workflows
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
   Connection             Networking            Security
   cellular               IT / Wi-Fi            defensive
          │                    │                    │
          └────────────────────┼────────────────────┘
                               │
                      Remote Support
                               │
                     customer support layer
```

Remote Support can serve multiple products. AI Operations should coordinate work but should not silently modify production systems.

## 4. MVP definitions

### Streetwise Connection℠

The existing repository remains the primary codebase.

MVP gate:
- Waitlist remains functional
- Provider onboarding is approved
- Required legal/regulatory responsibilities are resolved
- Pricing and economics are validated
- Security controls are validated
- Support workflows exist
- Staging provisioning is validated
- Live billing and activation remain disabled until explicitly authorised

### Streetwise Networking

Initial service MVP:
1. Customer intake
2. Device/network inventory
3. Basic network diagnostic workflow
4. Wi-Fi/connectivity troubleshooting
5. Written findings and recommended fixes
6. Job status and follow-up tracking

Keep this initially service-oriented. Do not build a giant remote-management platform before there are customers who need it.

### Streetwise Security

Initial service MVP:
1. Customer security intake
2. Account/device/network checklist
3. Configuration review
4. Risk findings with evidence
5. Remediation recommendations
6. Follow-up verification

Do not promise continuous monitoring, threat detection, or incident response until those capabilities actually exist.

### Streetwise Remote Support

Initial service MVP:
1. Support request
2. Customer verification
3. Diagnostic checklist
4. Resolution notes
5. Escalation path
6. Follow-up

Remote access should be explicit, authenticated, logged, and revocable.

### Streetwise AI Operations

Initial internal MVP:
1. Shared task object
2. Project/context object
3. Agent role definitions
4. Human approval boundary
5. Audit trail
6. Output/artifact references
7. Basic routing between JARVIS, TECH, CALLER, and OPS

The agents should recommend or prepare actions first. Production-changing actions require an explicit approval boundary.

## 5. Repository strategy

Do not create a repository for every idea.

### Current structure

```text
streetwise-connection-
├── api/
├── src/
├── db/
├── scripts/
├── public/
├── docs/
│   └── business/
└── lab/
```

### Near-term rule

Keep the Streetwise Connection application here.

Keep business architecture and planning under `docs/business/`.

Create a separate repository only when a project has an independent deployment lifecycle, security boundary, ownership boundary, or materially different technology stack.

Likely future candidates for separation:
- Public marketing/site application, if it becomes independently deployable
- Internal AI Operations platform, if it becomes a real application
- Mobile/network diagnostic tooling, if it becomes independently maintained

Do not split these yet.

## 6. Security boundaries

### Production
- No secrets committed to Git
- Production cellular remains fail-closed until launch gates pass
- Provider credentials isolated from development
- Administrative actions authenticated and auditable
- Destructive actions require explicit approval

### Development
- Mock providers and test credentials only
- No real customer activation
- No production database credentials
- Security testing isolated from production systems

### AI agents
- Least privilege
- Tool access scoped by role
- Read-only by default
- Explicit approval for production writes
- Every consequential action logged

## 7. Build order

### Phase 1 — Foundation
- Business architecture
- Product boundaries
- Shared data/task model
- Security boundaries
- Repository rules

### Phase 2 — Internal operations
- JARVIS task routing
- TECH development workflow
- CALLER communication workflow
- OPS business workflow
- Shared audit model

### Phase 3 — Service MVPs
- Networking intake and diagnostic workflow
- Security assessment workflow
- Remote support workflow

### Phase 4 — Connection launch readiness
- Provider and regulatory gates
- Staging provisioning
- Pricing/economics validation
- Security/support acceptance
- Controlled production enablement

## 8. Definition of done

A feature is not considered complete merely because code exists.

It must have:
- Clear owner
- Defined customer or internal use case
- Security boundary
- Validation evidence
- Documentation
- Correct status classification
- Rollback or disable path where applicable

**Operating principle:** build the smallest useful system, prove it works, then expand.