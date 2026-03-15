# Tasks: Agent Chat Examples

**Input**: Design documents from `/specs/002-agent-chat-examples/`  
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Tests**: Not explicitly requested in the feature specification; no test tasks included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Path Conventions

- **Web app**: `backend/src/`, `frontend/src/`, `backend/prisma/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Config and environment for example agents (dev/local only)

- [x] T001 [P] Add environment/config for example agents (e.g. ENABLE_EXAMPLE_AGENTS or NODE_ENV check) in backend/src/config.ts and backend/.env.example

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Data model, registry, gateway, and API extensions that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Add optional agentId (UUID, FK to PluginRegistry) to Conversation in backend/prisma/schema.prisma and create migration
- [x] T003 Add displayName support for PluginRegistry (new column or configJson.displayName convention) in backend/prisma/schema.prisma
- [x] T004 [P] Implement listAgentAdapters(tenantId) and getAgentAdapterByPluginId(tenantId, pluginId) with adapter registry in backend/src/plugins/registry.ts
- [x] T005 Extend runAgentTurn to resolve adapter by conversation.agentId when set in backend/src/gateway/agent-gateway.ts
- [x] T006 Extend createConversation to accept optional agentId and validate against enabled agent_adapter for tenant in backend/src/services/conversation.service.ts
- [x] T007 Extend POST /api/conversations request body to accept optional agentId in backend/src/api/conversations.router.ts
- [x] T008 Add GET /api/example-agents route (dev/local only, response per contracts/example-agents-list.v1.json) in backend/src/api/ (e.g. backend/src/api/example-agents.router.ts and register in router.ts)

**Checkpoint**: Foundation ready — user story implementation can now begin

---

## Phase 3: User Story 1 - Run an example agent in the chat (Priority: P1) 🎯 MVP

**Goal**: User can start a dedicated thread/channel with an example agent, send a message, see loading state and response (or error), and discover the agent from a list by display name.

**Independent Test**: Start a dedicated agent thread, send a message, see loading then response (or clear error); discover agent from list by display name without reading code.

### Implementation for User Story 1

- [x] T009 [P] [US1] Implement in-process echo agent adapter (IAgentAdapter) in backend/src/plugins/adapters/echo-agent.adapter.ts
- [x] T010 [US1] Register echo adapter in plugin registry and seed as example agent with display name in backend/prisma/seed.ts and backend/src/plugins/registry.ts
- [x] T011 [P] [US1] Add agent list UI (fetch GET /api/example-agents, show by display name) in frontend: add page at frontend/src/app/(auth)/agents/page.tsx and optional list component at frontend/src/components/agents/AgentList.tsx (or implement in one location and document choice in plan.md)
- [x] T012 [US1] Add flow to create conversation with selected agentId (call POST /api/conversations with agentId) in frontend
- [x] T013 [US1] Ensure dedicated agent conversation thread shows messages and input in frontend (reuse conversation UI scoped to agent)
- [x] T014 [US1] Add visible loading state (e.g. "Agent is thinking…" or spinner) while waiting for agent response in frontend
- [x] T015 [US1] Surface agent unavailable/error state in chat UI per FR-007 in frontend

**Checkpoint**: User Story 1 is fully functional — user can list agents, start dedicated thread, send message, see loading and response or error

---

## Phase 4: User Story 2 - Use examples as a reference to build new agents (Priority: P2)

**Goal**: Developer can locate the example(s), identify integration points (registration, input/output), and use them as a starting point to add a new agent.

**Independent Test**: Locate example(s), state how an agent is registered and how input/output flows; reuse or copy structure from example(s).

### Implementation for User Story 2

- [x] T016 [P] [US2] Add README or inline docs for integration contract and how to add a new agent in backend/src/plugins/adapters/README.md or next to echo adapter
- [x] T017 [US2] Ensure example adapter is packaged as reference (source in adapters/, discoverable and documented) in backend/src/plugins/adapters/

**Checkpoint**: User Story 2 complete — examples are documented and usable as reference

---

## Phase 5: User Story 3 - Understand integration contract and behavior (Priority: P3)

**Goal**: Stakeholder can describe the integration contract and observe that the example agent completes at least one defined task (e.g. echo).

**Independent Test**: Read or observe example(s) and describe how messages are passed in/out; verify example completes a defined task.

### Implementation for User Story 3

- [x] T018 [P] [US3] Document integration contract (inputs, outputs, registration) in specs/002-agent-chat-examples/quickstart.md or specs/002-agent-chat-examples/contracts/README.md
- [x] T019 [US3] Verify echo agent completes defined task (echo) and add quickstart validation steps in specs/002-agent-chat-examples/quickstart.md

**Checkpoint**: All user stories complete — contract is documented and behavior verifiable

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Validation and observability

- [x] T020 [P] Run quickstart.md validation and fix any gaps
- [x] T021 Add observability for agent resolution (correlation ID already in turn; add metric for agent resolution by agentId per constitution) in backend/src/observability/metrics.ts and/or backend/src/gateway/agent-gateway.ts

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — can start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1)**: Depends on Phase 2 — MVP
- **Phase 4 (US2)**: Depends on Phase 3 (examples must exist to document)
- **Phase 5 (US3)**: Depends on Phase 3 (contract doc and verification)
- **Phase 6 (Polish)**: Depends on Phases 3–5

### User Story Dependencies

- **User Story 1 (P1)**: After Phase 2 — no dependency on US2/US3
- **User Story 2 (P2)**: After US1 — documents and packages existing example(s)
- **User Story 3 (P3)**: After US1 — documents contract and verifies behavior

### Within Each User Story

- US1: T009 (echo adapter) and T010 (seed/register) before frontend; T011–T015 can be ordered (list → create → thread → loading → error)
- US2: T016, T017 can run in parallel
- US3: T018, T019 can run in parallel

### Parallel Opportunities

- Phase 1: T001 is single task
- Phase 2: T004 is [P]; T002 and T003 can run in parallel
- Phase 3: T009 and T011 are [P]; after T010, T012–T015 are sequential per flow
- Phase 4: T016 and T017 [P]
- Phase 5: T018 and T019 [P]
- Phase 6: T020 [P]

---

## Parallel Example: User Story 1

```text
# After Phase 2, start US1 backend and frontend in parallel:
T009: Implement echo adapter in backend/src/plugins/adapters/echo-agent.adapter.ts
T011: Add agent list UI in frontend (AgentList or agents page)
# Then: T010 (register + seed) → T012–T015 (create flow, thread, loading, error)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup  
2. Complete Phase 2: Foundational  
3. Complete Phase 3: User Story 1  
4. **STOP and VALIDATE**: Run dedicated agent thread, send message, see loading and response  
5. Deploy/demo if ready  

### Incremental Delivery

1. Setup + Foundational → foundation ready  
2. Add US1 → test independently → MVP  
3. Add US2 → docs and reference → test independently  
4. Add US3 → contract doc and verification → test independently  
5. Polish → quickstart validation and metrics  

### Parallel Team Strategy

- After Phase 2: One developer can do US1 (echo + frontend), another can prepare US2/US3 docs in parallel once US1 adapter exists.

---

## Notes

- [P] = different files, no dependencies on other tasks in same phase
- [USn] maps task to user story for traceability
- Each user story is independently testable per spec
- Commit after each task or logical group
- Example agents are dev/local only; gate list API and visibility by config/env
