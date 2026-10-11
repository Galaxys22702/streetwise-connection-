# Jarvis Architecture

## Boundary

Jarvis is an orchestration layer between a user request and explicitly registered tools.

```text
User
  |
  v
Request / Context
  |
  v
Operation Task
  |
  v
Jarvis Core
  |
  +--> Policy / Authorisation
  |
  +--> Tool Registry ---> External systems
  |
  +--> Memory
  |
  +--> Audit
  |
  v
Response
```

## Components

### Operation task and routing

Every routed operation can be represented by a bounded task envelope containing the request identity, actor, capability, risk tier, environment, approval state, dry-run intent, idempotency key, lifecycle status, and timestamps.

The routing table is explicit. A capability is not assigned to TECH, CALLER, or OPS by guessing from a name, and an unrouted capability fails closed when routing is enabled.

Generic task updates may advance only the lifecycle status and may not rewrite the task's identity, capability, route, risk tier, or approval state.

### Core

Normalises requests, maintains execution context, attaches an approved operation task when routing is configured, and coordinates tool calls.

### Policy

Determines whether a requested operation is permitted in the current context. Policy decisions must be explicit and testable.

### Tools

A tool is a narrowly scoped capability with:

- a stable identifier
- an input contract
- an output contract
- required permissions
- an execution boundary
- audit metadata

Tools must not silently broaden their own permissions.

### Memory

Memory is an interface, not a hard-coded vendor dependency. The implementation may later use application storage, a dedicated memory service, or another approved backend.

Memory must distinguish ordinary contextual information from secrets and sensitive operational data.

### Audit

Consequential actions should emit structured events containing enough information to reconstruct what happened without storing secrets.

### External systems

Examples include Streetwise application services, provider systems, payment systems, communications services, and approved development infrastructure. The commerce boundary covers catalogue, pricing, carts, checkout-session preparation, and payment-verified order confirmation. Production access remains governed by the existing Streetwise launch and security gates.

## Execution model

The initial execution model is synchronous and explicit:

1. Parse request.
2. Resolve permitted capability.
3. Evaluate policy.
4. Resolve an explicit operation route when configured.
5. Create a bounded operation task.
6. Validate inputs.
7. Execute the tool.
8. Validate the result.
9. Record audit events.
10. Return a bounded response.

Autonomous multi-step execution should be introduced only after this foundation is tested.

## Non-goals for the foundation

- unrestricted shell access
- unrestricted browser control
- automatic production changes
- automatic billing or provisioning
- credential discovery
- bypassing existing Streetwise safety gates
