# Streetwise Connection — Open Network Technology Roadmap

Last reviewed: 2026-09-04

Status: **planned research/lab architecture; not a live production network**

## Objective

Streetwise Connection will remain a provider-agnostic cellular service control plane for commercial launch. The open-network stack below is intended to give Streetwise deeper technical control, testing capability, resilience research, and a path towards private/neutral-host experiments without claiming that Streetwise owns nationwide towers or licensed spectrum.

Commercial customer service still requires an authorised carrier, MVNO/MVNE, Telco-as-a-Service, roaming, Wi-Fi federation, or other licensed/contracted network relationship.

## Technology decision

### Open5GS — primary open-source mobile-core lab

Use Open5GS as the preferred 4G/5G core-network lab for EPC/4G and 5G Core experimentation, subscriber/session lifecycle testing, policy and routing experiments, interoperability testing, telemetry, and failure/recovery testing.

Open5GS is a lab and engineering dependency, not evidence that Streetwise operates a licensed public mobile network.

### free5GC — secondary 5G Core research environment

Use free5GC for standards-oriented 5G Core research, architecture comparison against Open5GS, controlled interoperability experiments, and validation of Streetwise provider-abstraction assumptions.

It is a secondary research implementation, not a reason to operate duplicate production cores.

### OpenAirInterface — RAN research and private-network prototyping

Use OpenAirInterface (OAI) for authorised lab/private-network RAN experiments where suitable hardware, spectrum authority, and test conditions exist. Potential work includes 5G gNB/CU/DU research, SA/NSA lab experiments, device/core interoperability, private/neutral-host proof-of-concept work, and RAN programmability research.

No public RF transmission should be performed without required spectrum rights, equipment compliance, site approval, and other applicable authorisation.

### WBA OpenRoaming / Passpoint — Wi-Fi offload and seamless roaming path

Evaluate WBA OpenRoaming and Passpoint as a future Wi-Fi offload layer complementing cellular coverage. Potential value includes secure automatic Wi-Fi onboarding, cellular-to-Wi-Fi offload where commercially supported, reduced captive-portal dependence, and additional venue/travel/community resilience.

Participation, certificates, commercial terms, privacy obligations, settlement, and technical validation must be complete before Streetwise markets this capability as available.

## Technology not selected as a primary dependency

The previous srsRAN Project was considered for open RAN experimentation. Its current documentation states that the project was discontinued and transitioned to OCUDU. Streetwise therefore should not standardise the roadmap on the discontinued srsRAN Project codebase. A maintained successor or another RAN stack can be evaluated separately.

## Target architecture

```text
Customer device
    |
    +--> Licensed wholesale cellular network
    |       |
    |       +--> Streetwise provider adapter
    |
    +--> OpenRoaming / Passpoint Wi-Fi (future, contracted)
            |
            +--> Streetwise identity/policy integration

Streetwise control plane
    |
    +--> Accounts / plans / billing / support
    +--> Security and SIM-swap policy
    +--> Provider orchestration
    +--> Network-resilience policy
    +--> Telemetry / audit / usage
    |
    +--> Open-network engineering lab
            |
            +--> Open5GS (primary core lab)
            +--> free5GC (secondary core research)
            +--> OpenAirInterface (authorised RAN lab)
```

The lab does not sit in the production customer path until a specific capability passes security, regulatory, provider, device, reliability, and economic review.

## Phased implementation

### Phase A — documentation and isolated lab

- keep production in waitlist mode
- document interfaces and threat model
- deploy Open5GS only in an isolated non-production environment
- use test/simulated subscribers and non-customer data
- add observability for registration, session, policy, latency, and failure events
- document rollback and complete lab teardown

### Phase B — core interoperability tests

- compare Open5GS and free5GC behaviour
- test provider-capability mappings
- validate subscriber/session state modelling
- validate usage/event ingestion
- test failure, restart, and state-recovery behaviour
- do not connect customer billing or live provisioning

### Phase C — authorised RAN/private-network proof of concept

- use OAI only in an authorised environment
- validate device compatibility and 5G SA/NSA assumptions
- measure latency, throughput, handover, packet loss, and recovery
- record hardware, spectrum, licensing, and site constraints
- keep the experiment separated from commercial launch claims

### Phase D — Wi-Fi offload evaluation

- evaluate WBA OpenRoaming participation model
- define identity-provider/access-network roles
- evaluate Passpoint profile lifecycle
- model privacy, security, PKI, RadSec, support, and settlement requirements
- run a controlled pilot only after commercial and technical approval

### Phase E — production capability promotion

A lab capability may be considered for production only after lawful authority and provider/spectrum rights are documented, security/privacy review passes, support procedures exist, device compatibility is defined, reliability and rollback tests pass, economics are acceptable, monitoring/audit trails operate, disclosures are approved, staging passes end to end, and the owner explicitly authorises production use.

## Security rules

- never place Ki/OPc values, production SIM credentials, provider secrets, private keys, subscriber identity documents, or customer PII in GitHub
- use synthetic subscribers in public CI and development examples
- isolate mobile-core lab networks from production customer systems
- use least-privilege service accounts and secret storage
- keep immutable audit logs for privileged configuration changes
- rate-limit and authenticate management interfaces
- treat roaming, RAN, SIM, eSIM, and subscriber-management components as high-trust infrastructure
- do not expose internal core-network management interfaces directly to the public Internet

## Product boundary

This roadmap does not change the current launch gate:

- public mode remains waitlist-only
- live billing remains disabled
- live cellular activation remains disabled
- carrier affiliation must not be claimed without written rights
- automatic network switching must not be promised until supported and verified
- emergency-service capability must not be inferred from a lab core

## Official references

- Open5GS: https://open5gs.org/open5gs/docs/
- free5GC: https://free5gc.org/doc/
- OpenAirInterface RAN: https://openairinterface.org/ran/
- WBA OpenRoaming: https://wballiance.com/openroaming/

## Decision summary

Streetwise will treat **Open5GS + free5GC + OpenAirInterface + OpenRoaming/Passpoint** as the open-network technology roadmap, with Open5GS as the preferred core lab and the existing provider-agnostic Streetwise control plane remaining the commercial product foundation.

This provides a credible path to learn, test, and eventually own more of the network intelligence without confusing an engineering lab with a licensed nationwide carrier network.
