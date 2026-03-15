# Phase 0 Research: Agent Chat Workspace

**Branch**: `001-agent-chat-workspace` | **Date**: 2026-03-14

All NEEDS CLARIFICATION items resolved. Technology choices finalised for MVP with plugin interfaces ensuring all infrastructure remains swappable per constitution Principle II.

---

## Decision Log

### D-001: Frontend Framework

**Decision**: Next.js 14 (App Router) + TypeScript
**Rationale**: SSR for initial page load, built-in API routes serve as BFF aggregation layer, streaming server components suit token streaming, excellent TypeScript support.
**Alternatives considered**:
- Vite + React — rejected: requires separate BFF server, no SSR.
- Remix — smaller ecosystem hire pool than Next.js.

---

### D-002: Backend Runtime

**Decision**: Node.js (Fastify 4) + TypeScript
**Rationale**: Fastify is 2–3× faster than Express, TypeScript-first plugin system aligns with Principle II, strong ecosystem for event-driven patterns and WebSocket.
**Alternatives considered**:
- Go — adds a second language; TypeScript across the stack reduces context switching.
- NestJS — good DI but heavy abstraction; Fastify + tsyringe gives DI without overhead.

---

### D-003: Database ORM

**Decision**: Prisma 5 + PostgreSQL 16
**Rationale**: Type-safe schema with auto-generated TypeScript types, robust migration tooling, excellent PostgreSQL support. Prisma schema acts as the data contract (constitution Principle VI).
**Alternatives considered**:
- Drizzle — lighter but less mature for production migrations.
- TypeORM — known type-safety gaps.

---

### D-004: Event Bus

**Decision**: Redis 7 Pub/Sub (MVP), designed for swap to Kafka/NATS via `IEventBus` plugin interface
**Rationale**: Redis is already required for session and handoff token storage, minimising operational dependencies for MVP. Plugin interface ensures swap is non-breaking.
**Constraint**: Event consumers MUST be idempotent (constitution Principle V).
**Alternatives considered**:
- Kafka — correct long-term choice but adds operational complexity disproportionate to MVP team size.
- NATS — excellent but Redis is needed regardless for session management.

---

### D-005: Search Index

**Decision**: OpenSearch 2
**Rationale**: Full-text + structured filter support, AWS-hosted option (Amazon OpenSearch Service), Apache 2.0 licence (avoids Elasticsearch SSPL concerns), good Node.js client (`@opensearch-project/opensearch`).
**Alternatives considered**:
- Typesense — simpler but weaker aggregation and faceting for complex artifact queries.
- PostgreSQL full-text — insufficient for cross-entity search with relevance ranking.

---

### D-006: Realtime Transport

**Decision**: Socket.io 4 (WebSocket with long-polling fallback)
**Rationale**: Handles reconnection and fallback transparently. Socket.io rooms map naturally to conversations. Supports bidirectional flow required for form submission acknowledgements over the same channel.
**Alternatives considered**:
- Native WebSocket — more control but reconnection must be hand-rolled.
- Server-Sent Events — unidirectional; cannot carry form acknowledgements.

---

### D-007: Authentication

**Decision**: NextAuth.js v5 + `jose` library for JWT signing/verification
**Rationale**: NextAuth v5 is provider-agnostic, integrates with Next.js App Router middleware for route protection. `jose` handles API token lifecycle server-side.
**Alternatives considered**:
- Clerk / Auth0 — managed services add vendor lock-in; self-hostable auth preferred (Principle II).
- Passport.js — more manual wiring with Fastify.

---

### D-008: Object Storage

**Decision**: S3-compatible API — MinIO for local development, AWS S3 or Cloudflare R2 for production
**Rationale**: Presigned URL support is required (FR-005, FR-013, FR-023). Vendor-agnostic via `IStoragePlugin` interface (Principle II). MinIO enables fully offline local development.
**Alternatives considered**:
- Local filesystem — not viable for multi-instance deployment.

---

### D-009: QR Code Session Handoff (FR-038)

**Decision**: Ephemeral Redis token (90 s TTL, single-use) + `qrcode` npm package

**Flow**:
1. Authenticated user requests QR on device A → server generates a cryptographically random UUID handoff token.
2. Token stored in Redis: `handoff:<uuid>` → `{ userId, conversationId, expiresAt, redeemed: false }` with 90 s TTL.
3. QR encodes the URL `<BASE_URL>/auth/handoff/redeem?code=<uuid>`.
4. User scans on device B, which must complete authentication before redeeming.
5. Redemption endpoint validates: token exists, not expired, not redeemed, userId matches authenticated session. Issues new session for device B, marks token redeemed and deletes from Redis.

**Security controls**: HMAC-signed UUID; rate-limited redemption endpoint; single-use enforcement; requires prior authentication on consuming device; audit log entry on every redemption attempt.
**Libraries**: `qrcode` (QR image generation), `jose` (JWT for issued session), Redis (token storage).

---

### D-010: Agent Gateway Implementation

**Decision**: Fastify plugin encapsulating `IAgentAdapter` registry + `opossum` circuit breaker + Redis event emission

**Pattern**:
- `IAgentAdapter` TypeScript interface (versioned contract in `contracts/agent-adapter.v1.ts`)
- Runtime adapter registry with version compatibility check on registration
- `opossum` circuit breaker wraps each adapter invocation
- `async-retry` with exponential backoff for transient failures
- Each adapter implements `getHealth()` → registry aggregates to `/health/ready`

**Resilience**: Circuit breaker transitions: closed → open (after 5 consecutive failures) → half-open (after 30 s timeout). Non-retryable errors (400, 401) fail immediately.

---

### D-011: Payload Validation

**Decision**: Zod for runtime schema validation of all renderer payloads and agent events
**Rationale**: Constitution Principle III mandates validation before rendering. Zod provides TypeScript type inference from schemas, eliminating duplicate type definitions. Unknown payload types rejected with structured `error` event.
**Integration**: Renderer Contract Service holds versioned Zod schemas; every payload is validated before any rendering path.

---

### D-012: Testing Stack

**Decision**:
- Backend: Vitest + Supertest (HTTP integration) + testcontainers (PostgreSQL, Redis, OpenSearch)
- Frontend: Vitest + React Testing Library + MSW (API mocking)
- Contract tests: Schema validation tests for every versioned contract
- E2E: Playwright

**Rationale**: Vitest is faster than Jest for cold starts. Testcontainers hit real infrastructure, avoiding mock/prod divergence. Playwright covers critical user journeys (send message, view job, submit form, scan QR).

---

## Resolved Unknowns Summary

| Item | Resolution |
|---|---|
| Frontend framework | Next.js 14 + TypeScript |
| Backend runtime | Node.js (Fastify 4) + TypeScript |
| ORM | Prisma 5 |
| Event bus | Redis Pub/Sub (pluggable via IEventBus) |
| Search | OpenSearch 2 |
| Realtime | Socket.io 4 |
| Auth | NextAuth.js v5 + jose |
| Object storage | S3-compatible (MinIO / S3 / R2) |
| QR handoff | Ephemeral Redis token + qrcode |
| Agent gateway | Fastify plugin + opossum + IAgentAdapter registry |
| Validation | Zod |
| Testing | Vitest + Playwright + testcontainers |
