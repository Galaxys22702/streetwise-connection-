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

### Core

Normalises requests, maintains execution context, and coordinates tool calls.

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
3. Validate inputs.
4. Evaluate policy.
5. Execute the tool.
6. Validate the result.
7. Record an audit event.
8. Return a bounded response.

Autonomous multi-step execution should be introduced only after this foundation is tested.

## Non-goals for the foundation

- unrestricted shell access
- unrestricted browser control
- automatic production changes
- automatic billing or provisioning
- credential discovery
- bypassing existing Streetwise safety gates
