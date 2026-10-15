# Jarvis

Jarvis is the assistant and agent layer being developed inside Streetwise Connection.

## Purpose

Jarvis is intended to provide a secure, modular interface for operating and understanding Streetwise systems without coupling the product to a single AI provider or automation platform.

The first version is deliberately small. It establishes the architecture, security boundaries, tool model, memory model, and verification approach before adding autonomous behaviour.

## Principles

- **Human-authorised actions:** Jarvis must not perform consequential actions merely because a model suggested them.
- **Least privilege:** tools receive only the permissions they need.
- **Fail closed:** missing credentials, unclear authority, invalid state, and failed verification stop the operation.
- **Provider agnostic:** AI/model vendors and external service providers remain replaceable.
- **Auditable:** consequential tool calls should produce structured logs.
- **No secrets in source:** credentials belong in approved secret/configuration systems.
- **Small changes:** the Jarvis layer should not destabilise the existing Streetwise platform.

## Initial scope

1. Core request/context model
2. Tool registry and permission boundary
3. Memory interface
4. Security policy interface
5. Structured audit events
6. Health/status checks
7. Tests and documentation

The private chat page now connects natural-language questions to a server-side AI provider. `/status` executes the registered Streetwise status tool through Jarvis's policy and audit path. Chat does not select or execute arbitrary tools. Voice, autonomous workflows, browser control, production provisioning, live billing, and other high-impact capabilities remain deferred. A controlled storefront commerce foundation exists for catalogue, pricing, cart, checkout, and payment-verified order boundaries; it is not a production billing integration.

## Relationship to Streetwise

Jarvis lives under the existing Streetwise Connection repository so the project does not create unnecessary repository sprawl.

The existing cellular platform remains the system of record. Jarvis is an orchestration and assistant layer, not a replacement for the existing application, provider abstraction, billing controls, or launch gates.

## Status

**Private chat and read-only status interface.** See [Chat setup](docs/CHAT.md) for configuration and limitations.

See:

- `jarvis/docs/ARCHITECTURE.md`
- `jarvis/docs/SECURITY.md`
- `jarvis/docs/ROADMAP.md`
- `jarvis/docs/COMMERCE.md`
