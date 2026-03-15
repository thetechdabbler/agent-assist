# Implementation Plan: Agent Chat Examples

**Branch**: `002-agent-chat-examples` | **Date**: 2026-03-15 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/002-agent-chat-examples/spec.md`

## Summary

Deliver at least one **example agent** that integrates with the existing chat system so users can start a **dedicated thread/channel** with it, see a **loading state** and responses, and use the example as a **reference** for building new agents. Example agents are **dev/local only**, presented in a **list by display name**, and the **integration contract** supports both **in-process and out-of-process** implementations. Implementation reuses the existing Agent Gateway, plugin registry (agent_adapter), and conversation/message pipeline; adds optional **conversation–agent binding** and an **example agents list API**; and introduces at least one runnable example (e.g. echo or simple Q&A) plus minimal docs for the contract.

## Technical Context

**Language/Version**: TypeScript 5.4+; Node.js 22 LTS  
**Primary Dependencies**: Backend: Fastify 4, Prisma 5, Socket.io 4, Redis 7, OpenSearch 2, Zod, jose, opossum. Frontend: Next.js 14, React 18, NextAuth v5, Socket.io-client, TanStack Query.  
**Storage**: PostgreSQL (Prisma); Redis (sessions, handoff, rate limit).  
**Testing**: Vitest (backend + frontend unit/integration); Playwright (frontend e2e); contract tests (Vitest).  
**Target Platform**: Web (backend server, Next.js frontend); dev/local for example agents.  
**Project Type**: Web application (monorepo: backend, frontend, shared-types, plugin-sdk).  
**Performance Goals**: Same as existing chat (streaming, event-driven); example agents are for demo/reference only.  
**Constraints**: Example agents only in non-production or local; integration contract must support in-process and out-of-process.  
**Scale/Scope**: At least one example agent; list of agents by display name; dedicated conversation per agent.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|----------|--------|--------|
| I. Separation of Concerns | PASS | Chat owns UI/orchestration; agents run via Agent Gateway and plugin adapters only. |
| II. Headless Core, Pluggable | PASS | Example agents are agent_adapter plugins; list and routing use existing registry and versioned contract. |
| III. Structured Payloads | PASS | No new payload shapes; existing message envelope and renderer contract unchanged. |
| IV. Jobs and Artifacts | PASS | No change to job/artifact lifecycle; agent turns may still create jobs per existing behavior. |
| V. Event-Driven | PASS | Reuse existing event bus and real-time delivery for messages and agent availability. |
| VI. Versioned Contracts | PASS | New/updated API and list schemas versioned; stored under `contracts/`. |
| Security | PASS | Example agents gated by env (dev/local); auth and tenant isolation unchanged. |
| Observability | PASS | Use existing correlation IDs, logging, and metrics; add agent-adapter resolution metrics if needed. |

No violations. Complexity Tracking table left empty.

## Project Structure

### Documentation (this feature)

```text
specs/002-agent-chat-examples/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── src/
│   ├── api/             # conversations.router (extend: create with agentId; agents list)
│   ├── gateway/         # agent-gateway (extend: resolve adapter by conversation.agentId)
│   ├── plugins/         # registry (extend: list agent adapters; get by pluginId), adapters/
│   ├── services/        # conversation.service (extend: create with agentId)
│   └── ...
├── prisma/              # schema: Conversation.agentId; seed example agent(s)
└── tests/

frontend/
├── src/
│   ├── app/             # (auth) routes: agent list, start agent conversation
│   ├── components/      # agent list, dedicated agent thread UI, loading state
│   └── ...
└── tests/
```

**Structure Decision**: Existing backend + frontend monorepo. Changes are additive: optional `agentId` on Conversation, new list-agents API, gateway resolution by agent, one or more example agent adapters (in-process or HTTP), and frontend flows for list + dedicated thread + loading state.

## Complexity Tracking

> No constitution violations. Table intentionally left empty.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| —         | —          | —                                    |
