# Streetwise Connection — Cellular/MVNO Architecture

## Product boundary

Streetwise Connection should be designed as a **cellular service control plane, customer experience, and provider orchestration layer**.

Streetwise does not need to own towers or licensed spectrum to become a cellular brand. The realistic path is to use licensed carrier/MVNO/MVNE/Telco-as-a-Service infrastructure while Streetwise controls plan design, customer experience, security policy, support, billing orchestration, and provider integration.

An eSIM is only one provisioning mechanism. The product architecture must now be broader than eSIM ordering because a full cellular service may include voice, SMS, phone numbers, porting, SIM swaps, Wi-Fi calling, roaming, and line lifecycle events.

## Architecture layers

### 1. Public/customer experience

Customer-facing interfaces for:

- plan selection
- device compatibility
- coverage guidance
- number/porting eligibility when supported
- account creation
- checkout
- SIM/eSIM installation
- activation
- line/security controls
- usage and plan management
- international/travel options
- support

Public checkout and activation remain disabled today.

### 2. Streetwise API

Owns Streetwise business rules:

- plan catalogue
- customer/account state
- organisation and multi-line state
- eligibility and compatibility
- order lifecycle
- billing orchestration
- provider abstraction
- usage and renewals
- line lifecycle
- security-policy state
- audit events
- support/escalation metadata

### 3. Cellular provider capability adapter

The provider boundary should evolve from an eSIM-only interface into a capability-based cellular interface.

Potential internal operations include:

- checkCoverage()
- listWholesalePlans()
- createSubscriber()
- provisionSimOrEsim()
- getLineStatus()
- getUsage()
- renewOrChangePlan()
- suspendLine()
- resumeLine()
- replaceOrSwapSim()
- listAvailableNumbers()
- assignNumber()
- checkPortEligibility()
- createPortRequest()
- getPortStatus()
- sendProviderLifecycleAction()
- getRoamingOptions()
- getProviderEvents()

Do not implement unsupported calls speculatively. Add each operation only after the selected provider's real API and contract are available.

### 4. Network-resilience policy layer

Streetwise should keep network resilience separate from provider-specific logic.

This layer can eventually decide:

- which provider/profile is eligible for a customer
- whether a device can support an alternate network/profile
- whether failover is manual or automatic
- when a secondary profile may be offered
- how coverage metadata influences recommendations

No automatic carrier switching is enabled today.

### 5. Security layer

Planned security capabilities should be modelled independently from raw connectivity:

- account takeover protection
- secure recovery
- SIM-swap lock/approval workflow
- SIM/eSIM replacement alerts
- line/number port-out protection
- suspicious account/line activity events
- malicious-domain or scam filtering where technically available
- customer-visible security audit history

Some controls may be Streetwise-owned software. Others require provider/network support.

### 6. Emergency-connectivity policy

A planned emergency reserve should be represented as a policy/capability, not a marketing assumption.

Possible implementation approaches depend on provider support:

- separate low-speed allowance
- protected data bucket
- limited essential-service access
- secondary profile/data pool
- manual emergency top-up credit

Streetwise must not promise this until one approach is contractually and technically validated.

### 7. Payment processor

Production launch requires webhook-driven payment state and reconciliation. Provisioning must not rely solely on browser redirects.

### 8. Persistence

PostgreSQL remains the recommended application database.

Existing core entities remain useful:

- customers/users
- organisations
- service lines
- devices
- plans
- orders
- eSIM/SIM profiles
- provider accounts
- usage snapshots
- payments
- audit events
- licences/registrations
- provider commercial evidence

Future schema may add:

- phone_numbers
- port_requests
- line_security_policies
- sim_swap_requests
- roaming_profiles
- network_options
- security_events
- emergency_reserve_events

Migrations should only be added once the corresponding provider and product requirements are concrete.

## Service lifecycle

A cellular line lifecycle will be more complex than a one-time eSIM order.

Representative lifecycle:

draft -> eligibility_checked -> payment_pending -> paid -> provisioning -> number_assignment_or_port -> active

Additional states may include:

suspended, plan_change_pending, port_pending, sim_swap_pending, roaming_active, cancelled, disconnected

Failure states should be explicit and recoverable.

## Security requirements before real provisioning

- Never commit provider API keys to GitHub.
- Store secrets in deployment secret management.
- Verify payment and provider webhooks cryptographically.
- Minimise stored activation credentials.
- Encrypt sensitive subscriber/number/porting data where appropriate.
- Keep immutable audit records for line, number, security, payment, and provisioning transitions.
- Require strong authentication for SIM swaps, port-outs, account recovery, and security-setting changes.
- Add rate limiting, abuse controls, fraud review, and support escalation.
- Define retention and deletion policies.
- Resolve provider and legal requirements for customer identity/KYC where applicable.

## Provider selection criteria

Evaluate providers on:

1. recurring U.S. domestic-service rights
2. data economics
3. voice/SMS support
4. local mobile numbers
5. number portability
6. eSIM and physical SIM support
7. 5G, VoLTE, and Wi-Fi calling
8. network footprint and resilience options
9. roaming/international service
10. SIM-swap/porting/lifecycle APIs and events
11. API quality, idempotency, and sandbox access
12. usage latency
13. branding/reseller rules
14. minimum commitments
15. provider-of-record/regulatory allocation
16. E911 and number-service responsibilities
17. fraud/security tooling
18. support/SLA quality
19. refund/failed-activation rules
20. sustainable contribution margin

## Current architecture decision

Keep the existing eSIM/data integration as a working provisioning foundation, but make the long-term architecture provider-agnostic and cellular-capability based.

1GLOBAL or an equivalent full-stack MVNO/MVNE/Telco-as-a-Service partner is the priority path for recurring U.S. cellular evaluation. eSIM Go remains useful for travel/short-duration data and controlled technical validation unless its commercial product scope changes in writing.
