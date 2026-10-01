# Streetwise AI Operations Foundation

> Internal architecture for JARVIS, TECH, CALLER, and OPS. This is an orchestration design, not a public customer-facing AI product.

## Purpose

Provide one controlled task system for Streetwise internal work.

The agents share context and audit records, but they do not receive unrestricted authority over production systems.

## Agent roles

| Agent | Primary responsibility | Default access |
|---|---|---|
| JARVIS | Orchestration, prioritisation, task routing, status | Read + propose |
| TECH | Programming, infrastructure, technical research, security analysis | Read + propose changes |
| CALLER | Call preparation, scripts, communication workflows, follow-ups | Read + prepare communications |
| OPS | Business administration, documents, opportunities, task tracking | Read + prepare operations |

No agent is inherently authorised to perform a production-changing action.

## Shared task model

Every task should have:

- Task ID
- Title
- Description
- Owner agent
- Requester
- Project
- Priority
- Status
- Risk level
- Required approval
- Inputs/context
- Outputs/artifacts
- Created/updated timestamps
- Audit events

Suggested statuses:

`queued` → `assigned` → `in_progress` → `awaiting_approval` → `completed`

Alternative terminal states:

- `cancelled`
- `blocked`
- `failed`

## Routing rules

JARVIS is the coordinator.

1. Receive or create the task.
2. Classify the task.
3. Select the specialist.
4. Pass only the required context.
5. Receive the specialist output.
6. Validate whether an approval boundary was crossed.
7. Record the result.
8. Escalate or complete the task.

Example:

```text
User request
    ↓
  JARVIS
    ↓
 ┌──┴───────────────┐
TECH              OPS
 │                   │
engineering       business
 │                   │
 └───────┬───────────┘
         ↓
      JARVIS
         ↓
   approval gate
         ↓
       result
```

## Approval boundaries

### No approval normally required

- Reading repository documentation
- Drafting documentation
- Research
- Creating plans
- Preparing code changes
- Preparing customer communications
- Creating internal task records

### Explicit approval required

- Production database writes
- Production configuration changes
- Live billing changes
- Cellular activation changes
- Provider credential changes
- Security-policy changes affecting customers
- Destructive operations
- External communications that create a binding business commitment

### Never put in agent prompts or source files

- API keys
- Passwords
- Provider secrets
- Payment secrets
- Database passwords
- Customer credentials
- SSNs, ITINs, government IDs, or banking information

Secrets belong in the approved secret-management system, not task context.

## Audit model

Every consequential task should record:

- Who or what initiated it
- Which agent handled it
- What tools were invoked
- What changed
- Whether approval was required
- Who approved it
- Timestamp
- Result
- Error information, when applicable

Audit records should be append-oriented. Do not silently rewrite history.

## Context handling

JARVIS should pass the smallest context needed for the task.

Use references to documents, issues, commits, and artifacts instead of copying sensitive or unnecessarily large content into every agent prompt.

Task context should distinguish:

- User-provided input
- Retrieved information
- Agent-generated reasoning/output
- Approved action
- Execution result

## Failure handling

If a specialist fails:

1. Preserve the failed task and error.
2. Do not silently retry destructive actions.
3. Allow JARVIS to retry safe/idempotent work where appropriate.
4. Escalate repeated failures.
5. Keep production systems unchanged unless explicit approval and successful validation exist.

## First implementation target

Build the internal task model before building autonomous agent execution.

Minimum useful implementation:

1. Task record
2. Project/context reference
3. Agent role
4. Status
5. Priority
6. Approval requirement
7. Audit event record
8. Artifact/reference record

This creates the control plane first. The agents can then plug into it without inventing their own incompatible task formats.

## Security principle

**Agents propose. The control plane decides. Humans approve consequential production changes.**

That separation is the core safety boundary for the Streetwise AI Operations platform.