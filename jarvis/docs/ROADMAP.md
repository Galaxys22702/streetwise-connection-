# Jarvis Roadmap

## Phase 1: Foundation

- [x] Repository/module boundary
- [x] Architecture documentation
- [x] Security model
- [x] Core request/context types
- [x] Tool registry
- [x] Policy engine
- [x] Audit event model
- [x] Memory interface
- [x] Unit tests
- [x] Storefront commerce foundation (catalogue, pricing, cart, checkout/order boundaries)

## Phase 2: Controlled integrations

- [x] Read-only Streetwise status tools
- [x] GitHub development tools
- [ ] Documentation/memory integration
- [x] Structured error handling
- [x] Integration tests
- [x] Shared operation task envelope and explicit TECH/CALLER/OPS routing
- [x] One-time approval records with expiry and replay protection
- [x] Idempotency reservation and duplicate-execution blocking
- [ ] Commerce integration with authoritative product/pricing/payment services

## Phase 3: Human-approved workflows

- [ ] Multi-step workflow engine
- [ ] Explicit approval checkpoints
- [ ] Dry-run mode
- [ ] Idempotency and retry controls
- [ ] Operational audit trail

## Phase 4: Advanced interfaces

- [ ] Voice interface
- [ ] Browser automation where justified
- [ ] Desktop interaction where justified
- [ ] Notification channels

No phase should enable production billing, provisioning, credential management, or other high-impact actions without a separate security and authorisation review.
