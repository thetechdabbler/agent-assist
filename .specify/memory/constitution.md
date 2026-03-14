<!--
SYNC IMPACT REPORT
==================
Version change: (none — initial authoring) → 1.0.0
Modified principles: N/A — all sections authored from template for the first time.

Added sections:
  - Core Principles (6 principles derived from architecture document)
  - Security Requirements
  - Observability Requirements
  - Governance

Removed sections: N/A

Templates reviewed:
  - .specify/templates/plan-template.md    ✅ Compatible — "Constitution Check" section
                                              is dynamically derived from this file; no updates needed.
  - .specify/templates/spec-template.md    ✅ Compatible — no constitution-specific references.
  - .specify/templates/tasks-template.md   ✅ Compatible — task phases align with
                                              principle-driven task types (observability, versioning,
                                              testing, structured payloads).
  - .specify/templates/checklist-template.md ✅ Compatible — generic structure, no conflicts.
  - .specify/templates/agent-file-template.md ✅ Compatible — no constitution references.

Follow-up TODOs:
  - TODO(RATIFICATION_DATE): Original adoption date unknown — project was initialized from
    Specify template with no prior governance record. Update when team formally ratifies.
-->

# Agent Assist Constitution

## Core Principles

### I. Separation of Concerns (NON-NEGOTIABLE)

The chat system MUST own interaction, orchestration visibility, and rendering.
The agent platform MUST own reasoning, tool execution, and workflow logic.
These boundaries MUST NOT be crossed in either direction.

- Agent runtimes, LLM providers, and business workflow logic MUST NOT be embedded
  inside the chat or BFF services.
- The chat system MUST communicate with external agent systems exclusively through
  the Agent Gateway abstraction.
- UI components MUST NOT contain business logic; they render structured state only.

**Rationale**: Conflating chat and agent concerns destroys pluggability and makes the
system impossible to test, swap, or scale independently.

### II. Headless Core, Pluggable Architecture

All core capabilities MUST be modeled as APIs and contracts first.
UI MUST be a renderer of structured state, not a source of truth.
The platform MUST support multiple plugin categories: agent adapters, renderers,
notification channels, storage backends, and auth/policy hooks.

- No capability MAY be added that assumes a single concrete implementation.
- Every plugin category MUST define an explicit, versioned interface contract.
- Plugins MUST be registered, health-checked, and auditable via the plugin registry.
- Tenant-aware enablement MUST be supported for all plugin types.

**Rationale**: The system must remain embeddable, extensible, and swappable as agent
runtimes, UI frameworks, and infrastructure backends evolve.

### III. Structured Payloads Over Arbitrary UI

Agents MUST return validated, typed payloads (text, table, chart, form_request,
file reference, progress card, notification, etc.). Raw HTML, scripts, or arbitrary
frontend markup from agents are PROHIBITED.

- Every message MUST conform to the common message envelope schema.
- Every structured payload MUST be validated by the Renderer Contract Service before rendering.
- No renderer MUST execute agent-supplied code in the browser under any circumstances.
- Payload schemas MUST be defined in JSON Schema and stored alongside versioned contracts.

**Rationale**: Accepting arbitrary UI from agents creates XSS attack surfaces, breaks
accessibility, and makes the rendering layer non-auditable. Validated structured payloads
enable safe, consistent, and testable rendering.

### IV. Jobs and Artifacts as First-Class Entities

Every background execution MUST be tracked as a Job with an explicit lifecycle state
machine (scheduled → queued → running → waiting_for_input → completed/failed).
Every significant output MUST be stored as a versioned, searchable Artifact.

- Chat history alone is NEVER sufficient as a record of system activity.
- Jobs and artifacts MUST be independently searchable without traversing message history.
- Job state MUST remain consistent and visible even when the external agent system is
  temporarily unavailable.
- Artifacts MUST be associated with their originating Job and Conversation.

**Rationale**: Users need to search, revisit, rerun, and audit past executions. Chat scroll
is not a reliable audit log.

### V. Event-Driven by Default

Real-time updates (streaming, job progress, completion, human input requests, notifications)
MUST be propagated via an event bus. Point-to-point polling between services is PROHIBITED.

- All significant state transitions (job lifecycle, artifact creation, notification delivery)
  MUST emit events.
- Every conversation turn MUST carry a correlation ID traceable across all services and
  the event bus.
- The frontend MUST receive live state updates via WebSocket or Server-Sent Events;
  polling for job or notification state is PROHIBITED.
- Services MUST be designed to handle event delivery at-least-once with idempotent consumers.

**Rationale**: UI responsiveness must never be coupled to agent execution time. An event-driven
architecture decouples interaction latency from workflow duration.

### VI. Versioned Contracts

All message types, form schemas, chart specifications, API contracts, and plugin interfaces
MUST be versioned using MAJOR.MINOR format from day one.

- Breaking changes to any contract MUST result in a MAJOR version increment.
- Non-breaking additions MUST result in a MINOR version increment.
- Every message envelope MUST include a `version` field.
- Old contract versions MUST be supported for a defined deprecation period before removal.
- Contract schemas MUST be stored in the `contracts/` directory of the relevant feature spec.

**Rationale**: Agents, renderers, and plugin authors depend on stable contracts. Silent
breaking changes cause cascading failures across loosely-coupled system boundaries.

## Security Requirements

This system sits at the boundary between humans and autonomous agent workflows.
Security controls are non-negotiable and MUST be applied at all layers.

- Authentication and authorization MUST be enforced on every API endpoint.
- Conversation-level access control MUST be implemented; cross-tenant data access is PROHIBITED.
- All file uploads MUST use signed upload URLs and MUST be scanned for malware before storage.
- Every renderer payload MUST be validated and sanitized before display.
- Agent-returned content MUST NEVER be executed as code or injected as raw HTML in the browser.
- Audit logs MUST be written for all job state transitions and artifact access events.
- Rate limiting MUST be applied on the Agent Gateway.
- Tenant isolation MUST be enforced at the data layer, not only the API layer.

## Observability Requirements

Strong observability is required from the initial release, not as a future enhancement.

- Structured logging with a correlation ID MUST be present in every service.
- The following metrics MUST be instrumented from day one:
  - active conversations, job counts by state, average job completion time,
    agent adapter error rate, renderer validation failure rate, search latency,
    notification delivery latency.
- Distributed tracing MUST span the Agent Gateway, internal services, and the event bus.
- A job lifecycle audit log MUST be queryable by operators.
- New features MUST include observability instrumentation as part of the definition of done.

## Governance

This constitution supersedes all other project practices and guidelines. Any practice
that conflicts with a principle defined here MUST be reconciled via the amendment process.

**Amendment procedure**:
1. Open a PR with the proposed change to `.specify/memory/constitution.md`.
2. Increment the version per semantic versioning rules (MAJOR/MINOR/PATCH as defined below).
3. Update the Sync Impact Report comment at the top of this file.
4. Propagate consistency changes to affected templates and command files.
5. Obtain at least one peer review before merging.

**Versioning policy**:
- MAJOR: Backward-incompatible change — removing or fundamentally redefining a principle.
- MINOR: Adding a new principle, section, or materially expanding guidance.
- PATCH: Clarifications, wording improvements, typo fixes.

**Compliance review**:
- All PRs and design reviews MUST verify compliance with principles I–VI before approval.
- Any deliberate violation of a principle MUST be recorded in the plan's Complexity Tracking
  table with justification.
- The Complexity Tracking table in `plan.md` is the authoritative record of approved exceptions.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): update when team formally adopts | **Last Amended**: 2026-03-14
