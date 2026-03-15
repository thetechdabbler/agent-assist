# Implementation Plan: Agent Chat Workspace

**Branch**: `001-agent-chat-workspace` | **Date**: 2026-03-14 | **Spec**: `specs/001-agent-chat-workspace/spec.md`
**Input**: Feature specification from `/specs/001-agent-chat-workspace/spec.md`

## Summary

Build a multi-tenant, pluggable agent chat workspace that enables users to converse with external AI agent systems in real time, monitor background jobs, supply structured inputs to paused workflows, define persistent goals, retrieve generated artifacts, and search historical activity. The system is architected as a headless API-first backend (Fastify 4) paired with a Next.js 14 frontend, with all agent integration, rendering, storage, and notification capabilities expressed as versioned plugin interfaces from day one.

## Technical Context

**Language/Version**: TypeScript 5.x throughout; Node.js 22 LTS (backend); Next.js 14 App Router (frontend)
**Primary Dependencies**:
- Backend: Fastify 4, Prisma 5, Socket.io 4, Zod, opossum (circuit breaker), `async-retry`, pino (structured logging), OpenTelemetry SDK, jose, `@opensearch-project/opensearch`, ioredis, `@aws-sdk/client-s3`
- Frontend: Next.js 14, React 18, Socket.io-client, Zod, NextAuth.js v5, TanStack Query v5
- Shared: tsyringe (DI), vitest, Playwright

**Storage**:
- PostgreSQL 16 — primary relational store (Prisma 5 migrations)
- Redis 7 — Pub/Sub event bus (MVP), session store, ephemeral handoff tokens
- OpenSearch 2 — full-text and structured cross-entity search index
- S3-compatible — binary file and artifact storage (MinIO for local dev, AWS S3 / Cloudflare R2 for production)

**Testing**: Vitest (unit + integration), Supertest (HTTP layer), testcontainers (PostgreSQL, Redis, OpenSearch), React Testing Library + MSW (frontend), Playwright (E2E)
**Target Platform**: Linux server (backend); modern evergreen browser (frontend)
**Project Type**: Web service (backend REST + WebSocket API) + web application (frontend SPA/SSR)
**Performance Goals**:
- First agent response token delivered to client ≤ 2 s p95 (SC-001)
- Job state update visible in task center ≤ 3 s after transition (SC-002)
- Search results returned ≤ 3 s for 95th percentile of queries (SC-004)
- Form submission → job resume round-trip ≤ 2 min (SC-003)

**Constraints**:
- Multi-tenancy is first-class from day one — all data scoped to `tenant_id` at the DB layer
- Plugin interfaces (agent adapter, renderer, notification, storage, auth/policy) must remain stable after initial release; breaking changes require MAJOR version bump
- Agent-supplied content must never execute in the browser (constitution Principle III)
- Job state must remain consistent and queryable even when the external agent system is unreachable (SC-005)
- pnpm 9+ workspace monorepo; all packages share a root `pnpm-workspace.yaml`

**Scale/Scope**: Multi-tenant SaaS; 6 user stories; 38 functional requirements; 12 core entity types; 5 plugin categories; 4 infrastructure services

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Gate | Pre-Design Status | Post-Design Status |
|-----------|------|------------------|--------------------|
| **I — Separation of Concerns** | Agent runtimes MUST NOT be embedded in chat/BFF services. Chat MUST communicate with agents exclusively through Agent Gateway. UI MUST NOT contain business logic. | ✅ PASS — Agent Gateway is the sole integration boundary; frontend renders structured state from API only | ✅ PASS — `backend/src/gateway/` is isolated; `IAgentAdapter` contract enforces boundary |
| **II — Pluggable Architecture** | All capabilities MUST be APIs/contracts first. Every plugin category MUST have a versioned interface. Plugin registry MUST support health-check and tenant-aware enablement. | ✅ PASS — `packages/plugin-sdk` defines `IAgentAdapter`, `IRenderer`, `INotificationChannel`, `IStoragePlugin`, `IAuthPolicy` interfaces | ✅ PASS — `contracts/agent-adapter.v1.ts` and plugin registry with `tenant_plugins` table confirmed |
| **III — Structured Payloads** | Agents MUST return validated typed payloads. Schemas MUST be in JSON Schema. No renderer MUST execute agent code. Raw HTML from agents is PROHIBITED. | ✅ PASS — Zod validates all payloads before rendering; unknown types produce `error` card; CSP enforced | ✅ PASS — `contracts/renderer-payloads.v1.json` and `message-envelope.v1.json` define versioned schemas |
| **IV — Jobs and Artifacts as First-Class Entities** | Every execution MUST be a tracked Job. Every significant output MUST be a versioned Artifact. Jobs/artifacts MUST be independently searchable. | ✅ PASS — Job entity with state machine; Artifact entity with schema versioning; both indexed in OpenSearch | ✅ PASS — data-model.md defines `jobs`, `artifacts`, `audit_log` tables; OpenSearch indexes all entities |
| **V — Event-Driven** | Real-time updates MUST use event bus. Polling is PROHIBITED. Every conversation turn MUST carry a correlation ID. Consumers MUST be idempotent. | ✅ PASS — Socket.io event bus; correlation ID on every message; no polling in frontend; Redis Pub/Sub for MVP | ✅ PASS — `contracts/event-bus.v1.ts` defines typed event envelopes; Socket.io rooms per conversation |
| **VI — Versioned Contracts** | All contracts MUST be MAJOR.MINOR versioned. Breaking changes → MAJOR bump. Every message envelope MUST include `version`. | ✅ PASS — `contracts/*.v1.*` naming convention; message envelope `version` field; `schema_version` on artifacts | ✅ PASS — Four v1 contract files in place; version field present on messages and artifacts in data model |
| **Security MUST** | Auth + authz on every endpoint. Tenant isolation at DB layer. Signed upload URLs. Audit logs for job transitions AND artifact access. Rate limiting on Agent Gateway. | ✅ PASS — NextAuth.js v5 + jose; Prisma middleware for tenant scoping; presigned S3 URLs; pino audit log | ✅ PASS — `audit_log` table; `opossum` circuit breaker + rate limiter on Agent Gateway (D-010) |
| **Observability MUST** | Structured logging with correlation ID in every service. 7 named metrics from day one. Distributed tracing. | ✅ PASS — pino structured logger; OpenTelemetry SDK for metrics + traces; correlation ID middleware | ✅ PASS — metrics enumerated below; OTel spans across Gateway, services, event bus |

**All constitution gates: PASS. No violations requiring Complexity Tracking justification for principles I–VI or Security/Observability.**

### Observability Instrumentation Plan

Metrics instrumented from day one (OpenTelemetry + Prometheus endpoint):

| Metric | Type | Labels |
|--------|------|--------|
| `agent_assist_active_conversations` | Gauge | `tenant_id` |
| `agent_assist_job_count` | Gauge | `tenant_id`, `status` |
| `agent_assist_job_completion_seconds` | Histogram | `tenant_id`, `job_type` |
| `agent_assist_adapter_error_total` | Counter | `adapter_name`, `error_code` |
| `agent_assist_renderer_validation_failure_total` | Counter | `payload_type`, `schema_version` |
| `agent_assist_search_latency_seconds` | Histogram | `tenant_id` |
| `agent_assist_notification_delivery_latency_seconds` | Histogram | `tenant_id`, `channel` |

Distributed tracing: OpenTelemetry spans on Agent Gateway invocations, service method boundaries, event bus publish/consume, and external storage calls. Correlation ID propagated via `x-correlation-id` HTTP header and Socket.io event `meta.correlationId`.

## Project Structure

### Documentation (this feature)

```text
specs/001-agent-chat-workspace/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output — all tech decisions resolved
├── data-model.md        # Phase 1 output — PostgreSQL schema, Redis, OpenSearch index
├── quickstart.md        # Phase 1 output — local dev setup walkthrough
├── contracts/
│   ├── agent-adapter.v1.ts          # IAgentAdapter plugin interface
│   ├── event-bus.v1.ts              # IEventBus typed event envelopes
│   ├── message-envelope.v1.json     # JSON Schema for message envelope
│   └── renderer-payloads.v1.json    # JSON Schema for all renderer payload types
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
backend/                          # Fastify 4 + TypeScript API service
├── prisma/
│   ├── schema.prisma             # Prisma schema (source of truth for all DB entities)
│   └── seed.ts                   # Development seed data
├── src/
│   ├── config/
│   │   └── index.ts              # Typed env config with Zod validation
│   ├── db/
│   │   └── client.ts             # Prisma client singleton
│   ├── domain/
│   │   ├── job-state-machine.ts  # Job lifecycle transitions + event emission
│   │   └── artifact-schema-registry.ts  # Versioned Zod schema registry for artifacts
│   ├── gateway/
│   │   └── agent-gateway.ts      # IAgentAdapter registry + opossum circuit breaker
│   ├── middleware/
│   │   ├── auth.ts               # NextAuth/jose token validation
│   │   ├── correlation-id.ts     # x-correlation-id generation/propagation
│   │   ├── rate-limit.ts         # Agent Gateway rate limiting (per-user, per-tenant)
│   │   ├── tenant.ts             # Tenant isolation + Prisma middleware
│   │   └── payload-validator.ts  # Zod payload validation + CSP sanitization
│   ├── plugins/
│   │   ├── registry.ts           # Plugin registry (load, validate, health-check, resolve)
│   │   └── adapters/
│   │       └── http-agent-adapter.ts  # Reference IAgentAdapter implementation
│   ├── realtime/
│   │   └── event-bus.ts          # Socket.io server + typed event publisher
│   ├── services/
│   │   ├── audit.service.ts
│   │   ├── artifact.service.ts
│   │   ├── conversation.service.ts
│   │   ├── form-request.service.ts
│   │   ├── goal.service.ts
│   │   ├── job.service.ts
│   │   ├── message.service.ts
│   │   ├── notification.service.ts
│   │   ├── search-indexer.service.ts
│   │   ├── search-query.service.ts
│   │   ├── storage.service.ts
│   │   └── user-settings.service.ts
│   ├── api/
│   │   ├── router.ts
│   │   ├── attachments.router.ts
│   │   ├── artifacts.router.ts
│   │   ├── conversations.router.ts
│   │   ├── goals.router.ts
│   │   ├── jobs.router.ts
│   │   ├── notifications.router.ts
│   │   ├── search.router.ts
│   │   ├── user-settings.router.ts
│   │   └── admin/
│   │       └── plugins.router.ts
│   ├── observability/
│   │   ├── logger.ts             # pino structured logger (correlation-id enriched)
│   │   ├── metrics.ts            # OpenTelemetry metrics (7 named instruments)
│   │   └── tracing.ts            # OpenTelemetry tracer setup
│   └── server.ts
├── tests/
│   ├── contract/                 # Schema validation tests for all v1 contracts
│   ├── integration/              # Supertest + testcontainers (PostgreSQL, Redis, OpenSearch)
│   └── unit/
└── .env.example

frontend/                         # Next.js 14 App Router + TypeScript
├── src/
│   ├── app/                      # App Router pages and layouts
│   │   ├── (auth)/               # Auth-gated routes
│   │   │   ├── conversations/
│   │   │   ├── goals/
│   │   │   ├── jobs/
│   │   │   └── search/
│   │   ├── admin/
│   │   └── auth/
│   ├── components/
│   │   ├── artifacts/
│   │   │   ├── TableArtifactRenderer.tsx
│   │   │   ├── ChartArtifactRenderer.tsx
│   │   │   ├── FileArtifactRenderer.tsx
│   │   │   └── ImageArtifactRenderer.tsx
│   │   ├── goals/
│   │   │   └── GoalPanel.tsx
│   │   ├── jobs/
│   │   │   └── JobDetailPanel.tsx
│   │   ├── messages/
│   │   │   ├── MessageBubble.tsx      # Typed renderer dispatcher (contracts/renderer-payloads.v1.json)
│   │   │   └── InlineFormRenderer.tsx
│   │   ├── AttachmentUploader.tsx
│   │   ├── GlobalSearchBar.tsx
│   │   ├── NotificationCenter.tsx
│   │   └── QRHandoffModal.tsx
│   ├── hooks/
│   │   ├── useConversationStream.ts  # Socket.io conversation events + reconnect/replay
│   │   ├── useFormDraft.ts           # Session-storage draft persistence
│   │   ├── useJobUpdates.ts          # Socket.io job state events
│   │   └── useObservability.ts       # Client-side OTel trace propagation
│   ├── layouts/
│   │   └── AppLayout.tsx
│   └── services/
│       └── api-client.ts             # Auth header injection, typed responses
├── tests/
└── .env.example

packages/
├── shared-types/                 # Shared TypeScript entity interfaces + payload types
│   └── src/
│       └── index.ts
└── plugin-sdk/                   # Versioned plugin interface contracts
    └── src/
        └── index.ts              # IAgentAdapter, IRenderer, INotificationChannel, IStoragePlugin, IAuthPolicy

docker-compose.yml                # PostgreSQL 16, Redis 7, OpenSearch 2, MinIO
pnpm-workspace.yaml               # pnpm workspace definition
package.json                      # Root scripts: dev, build, test, test:e2e
```

**Structure Decision**: pnpm monorepo with two application packages (`backend/`, `frontend/`) and two shared library packages (`packages/shared-types`, `packages/plugin-sdk`). Backend is a standalone Fastify 4 API service; frontend is Next.js 14 with App Router. Monorepo enables type-sharing without a build/publish step in development while keeping backend and frontend independently deployable. `packages/plugin-sdk` is the canonical home for plugin interface contracts referenced by `specs/001-agent-chat-workspace/contracts/`.

## Complexity Tracking

> Four infrastructure services (PostgreSQL, Redis, OpenSearch, S3) are required. This exceeds the default "simplest possible storage" heuristic but each service fills a non-overlapping, non-substitutable role:

| Component | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|--------------------------------------|
| PostgreSQL 16 | ACID relational store for all core entities with foreign keys, tenant isolation, and Prisma migrations | Single database needed regardless; this is the primary store, not an addition |
| Redis 7 | Sub-millisecond pub/sub for real-time events (SC-002 ≤ 3 s), session store, and single-use ephemeral handoff tokens (FR-038, 90 s TTL) | PostgreSQL LISTEN/NOTIFY has no built-in TTL and insufficient throughput for high-frequency job events; filesystem sessions don't work multi-instance |
| OpenSearch 2 | Cross-entity full-text + structured search across 5 entity types with relevance ranking, tenant-scoped queries, and ≤ 3 s SLA (SC-004) | PostgreSQL `tsvector` full-text search lacks cross-table relevance ranking, faceting, and the 3 s SLA guarantee at scale across 5 entity types |
| S3-compatible | Binary artifact and attachment storage with presigned URL support (FR-005, FR-013, FR-023) and virus-scan pipeline integration (FR-031) | Database BLOBs do not support signed download URLs, streaming multipart uploads, or pluggable virus-scan hooks |
