# Streetwise Business Ideas Portfolio

> Working document for consolidating business concepts, product lines, technical projects, and future automation work.

## 1. Streetwise Connection℠

**Status:** Active development / launch-readiness

Streetwise Connection℠ is the current cellular/connectivity business concept. The existing repository is already structured around an eventual provider-agnostic cellular platform.

Core direction:
- Affordable cellular service
- Clear pricing and service terms
- Account security and SIM-swap protections
- Residential and small-business multi-line support
- Connectivity resilience where provider agreements support it
- Domestic cellular plus separate travel/data capability
- Provider-agnostic architecture

Current repository launch state remains governed by README.md and the project-status documents. No live cellular sales or activation should be enabled until the existing provider, legal, regulatory, security, support, and economics gates pass.

## 2. Streetwise Networking

**Status:** Business concept

Working focus:
- Home networking and Wi-Fi
- Small-business networking
- Computer/device setup and maintenance
- Network troubleshooting
- Remote technical support
- Connectivity optimisation
- Practical technology support for customers without internal IT staff

Potential commercial models:
- One-time service
- Project-based work
- Recurring support
- Small-business support plans

This concept should remain distinct from Streetwise Connection's cellular-provider operation while sharing useful technical infrastructure and brand direction where appropriate.

## 3. Streetwise Security / Internet Security

**Status:** Business concept / naming not final

Potential focus:
- Defensive cybersecurity
- Account and device security
- Home/small-business security reviews
- Network hardening
- Security awareness
- Basic monitoring and maintenance
- Practical protection against phishing, scams, unsafe configurations, and common account compromises

Security claims must be tied to specific implemented capabilities. Avoid marketing a capability merely because it is planned.

## 4. Streetwise Remote Technology Support

**Status:** Business concept

A service layer that can support customers remotely with:
- Device troubleshooting
- Account/access assistance
- Software configuration
- Network diagnostics
- Customer technology education
- Scheduled support

This can eventually operate as a recurring service rather than requiring every interaction to be a one-off job.

## 5. Internal AI / Agent Operations Platform

**Status:** Early concept

Use a small group of specialised AI agents as internal business infrastructure rather than immediately treating each bot as a separate public product.

Proposed roles:
- **JARVIS:** orchestration, task routing, project coordination
- **TECH:** programming, infrastructure, technical research, security analysis
- **CALLER:** call preparation, communication workflows, follow-ups
- **OPS:** business administration, documents, opportunities, task tracking

The agents should share a common project/task model and produce auditable outputs rather than independently changing production systems.

## Architecture principle

Keep the business concepts modular:

```text
Streetwise
├── Connection
│   └── Cellular / connectivity platform
├── Networking
│   └── Home + small-business IT/network services
├── Security
│   └── Defensive security services
├── Remote Support
│   └── Ongoing technical assistance
└── AI Operations
    └── Internal automation and agent tooling
```

## GitHub organisation plan

The existing streetwise-connection- repository remains the primary Streetwise Connection codebase.

Business planning documents should live under:

```text
docs/business/
```

Technical product documentation should remain under:

```text
docs/
```

Application code remains under:

```text
src/
api/
```

Do not mix business planning documents into application source code.

## Immediate planning backlog

- Consolidate all known Streetwise business concepts
- Separate confirmed products from exploratory ideas
- Define target customer and problem for each concept
- Identify which capabilities can share infrastructure
- Identify regulatory/licensing requirements before public claims
- Define MVP scope for each viable service
- Define revenue model for each viable service
- Create a dependency map between the businesses
- Keep production cellular functionality fail-closed until existing launch gates pass

## Working rule

Ideas are allowed to evolve. Production systems are not.

Every new product or feature should be classified as one of:

- **Idea** — concept only
- **Planned** — documented but not implemented
- **Development** — actively being built
- **Staging** — implemented and being validated
- **Production** — verified and authorised for real customers

Never describe an Idea, Planned, Development, or Staging capability as a live customer service.