# Tasks: Agent Chat Workspace

**Input**: Design documents from `/specs/001-agent-chat-workspace/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md
**Branch**: `001-agent-chat-workspace`
**Generated**: 2026-03-14 (v2 — post clarification sessions, corrected paths and tech stack)

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no unmet dependencies)
- **[Story]**: Which user story this task belongs to (US1–US6)
- All paths use confirmed monorepo layout: `backend/`, `frontend/`, `packages/`
- Real-time transport is **Socket.io 4** throughout — not SSE

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization, monorepo scaffolding, and shared tooling

- [x] T001 Initialize pnpm workspace with `backend/`, `frontend/`, `packages/shared-types/`, and `packages/plugin-sdk/` at repository root; create `pnpm-workspace.yaml`, root `package.json` with `dev`, `build`, `test`, `test:e2e` scripts, and `docker-compose.yml` (PostgreSQL 16, Redis 7, OpenSearch 2, MinIO)
- [x] T002 [P] Bootstrap `backend/` as Fastify 4 TypeScript project: `package.json` (fastify, @fastify/cors, prisma, socket.io, zod, ioredis, opossum, async-retry, pino, @opentelemetry/sdk-node, @aws-sdk/client-s3, @opensearch-project/opensearch, jose, qrcode, vitest, supertest, testcontainers), `tsconfig.json`, `backend/.env.example` per `quickstart.md`
- [x] T003 [P] Bootstrap `frontend/` as Next.js 14 App Router TypeScript project: `package.json` (next, react, socket.io-client, zod, next-auth, @tanstack/react-query, vitest, @testing-library/react, msw, playwright), `tsconfig.json`, `frontend/.env.example` per `quickstart.md`
- [x] T004 [P] Initialize `packages/shared-types/src/index.ts` with shared TypeScript interfaces for all 13 core entities (Conversation, Message, Goal, Job, Artifact, Notification, Attachment, Plugin, Tenant, User, AuditLog, TenantPlugin) and versioned payload type aliases matching `contracts/message-envelope.v1.json`
- [x] T005 [P] Initialize `packages/plugin-sdk/src/index.ts` implementing the five versioned plugin interfaces from `specs/001-agent-chat-workspace/contracts/`: `IAgentAdapter` (agent-adapter.v1.ts), `IRenderer` (renderer-payloads.v1.json), `INotificationChannel`, `IStoragePlugin`, `IAuthPolicy`, and `IEventBus` (event-bus.v1.ts)
- [x] T006 Configure ESLint, Prettier, and Husky pre-commit hooks at repository root with shared config extending to all workspace packages

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T007 Define Prisma schema in `backend/prisma/schema.prisma` for all 13 entities: `tenants` (id, name, slug, config_json), `users` (id, email, name, tenant_id), `conversations` (id, title, owner_user_id, tenant_id, active_goal_id, status), `messages` (id, conversation_id, source_type, type, version, payload_json, correlation_id), `attachments` (id, conversation_id, message_id, storage_key, filename, mime_type, size_bytes, malware_scan_status), `goals` (id, user_id, tenant_id, conversation_id, title, description, status, goal_type ["directive"|"scheduled"], schedule), `jobs` (id, conversation_id, goal_id, tenant_id, external_job_ref, job_type, status, progress_percent, schedule_at, started_at, completed_at, input_ref, result_ref, error_code, error_summary, retry_count), `artifacts` (id, job_id, conversation_id, tenant_id, artifact_type, title, version, storage_uri, payload_json, schema_version), `notifications` (id, user_id, tenant_id, conversation_id, job_id, artifact_id, category, title, body, is_read), `plugin_registry` (id, plugin_type, plugin_name, version, contract_version, status, config_json), `tenant_plugins` (tenant_id, plugin_id, enabled, config_override_json), `audit_log` (id, tenant_id, user_id, event_type, entity_type, entity_id, before_state, after_state, correlation_id); run `prisma migrate dev` to apply
- [x] T008 Implement Prisma ORM model helper files in `backend/src/models/` — one file per entity type (13 total) re-exporting the Prisma-generated type with any domain-specific helpers; add `goal_type` enum `GoalType { DIRECTIVE = 'directive', SCHEDULED = 'scheduled' }` to `backend/src/models/goal.ts`
- [x] T009 Implement authentication middleware validating NextAuth/jose session tokens and attaching `{ userId, tenantId }` to every request in `backend/src/middleware/auth.ts`; add route-level ownership assertions ensuring users cannot access resources belonging to other users or tenants
- [x] T010 Implement multi-tenant isolation Prisma middleware that appends `WHERE tenant_id = :tenantId` to all queries and throws `403` on cross-tenant access attempts in `backend/src/middleware/tenant.ts`
- [x] T011 [P] Implement Fastify server entry point with plugin registration order (cors → correlation-id → auth → tenant → rate-limit → payload-validator → router) and graceful shutdown in `backend/src/server.ts` and `backend/src/api/router.ts`
- [x] T012 Implement Socket.io 4 server with Redis adapter (for multi-instance support) and typed event bus publishing `DomainEvent` envelopes (per `contracts/event-bus.v1.ts`) to per-conversation and per-user rooms in `backend/src/realtime/event-bus.ts`; attach to Fastify HTTP server
- [x] T013 Implement Redis client (ioredis) with connection pooling, TTL constants (`HANDOFF_TOKEN_TTL = 90`, `SESSION_TTL = 86400`), and atomic single-use token store helper (`setToken`, `redeemToken` using GET+DEL pipeline) in `backend/src/db/redis.ts`; configure Socket.io Redis adapter using this client
- [x] T014 Implement plugin registry: load plugins from `plugin_registry` table, validate each implements the correct `packages/plugin-sdk` interface contract version, resolve active plugin per type per tenant from `tenant_plugins`, expose `getPlugin(type, tenantId)` and `healthCheck()` in `backend/src/plugins/registry.ts`
- [x] T015 [P] Implement secure file storage service wrapping S3-compatible SDK: `uploadFile(key, stream, mimeType)` (multipart upload via presigned URL), `generateSignedDownloadUrl(key, ttlSeconds)`, `deleteFile(key)`, and `triggerVirusScan(key)` hook in `backend/src/services/storage.service.ts`; configure via `S3_ENDPOINT`, `S3_BUCKET` env vars
- [x] T016 [P] Implement audit log service writing append-only entries to `audit_log` table for job state transitions (`job.status_changed`) AND artifact access events (`artifact.accessed`): `logJobTransition(jobId, from, to, correlationId)` and `logArtifactAccess(artifactId, userId, correlationId)` in `backend/src/services/audit.service.ts`
- [x] T017 Implement typed environment config with Zod validation schema covering all required env vars (`DATABASE_URL`, `REDIS_URL`, `OPENSEARCH_URL`, `S3_*`, `JWT_SECRET`, `NEXTAUTH_SECRET`, `AGENT_GATEWAY_*`) in `backend/src/config/index.ts`; fail fast on missing required vars at startup
- [x] T018 [P] Implement correlation ID middleware generating a `crypto.randomUUID()` per request, attaching it to `request.correlationId`, propagating via `x-correlation-id` response header, and injecting into pino log context and Socket.io event `meta.correlationId` in `backend/src/middleware/correlation-id.ts`
- [x] T019 Implement rate-limiting middleware on the Agent Gateway using a token-bucket algorithm: per-user limit (default 60 req/min) and per-tenant limit (default 1000 req/min), configurable via tenant `config_json`; return `429` with `Retry-After` header when exceeded in `backend/src/middleware/rate-limit.ts`
- [x] T020 [P] Implement observability stack in `backend/src/observability/`: (1) `logger.ts` — pino structured logger with `correlationId`, `tenantId`, `userId` fields on every entry; (2) `metrics.ts` — OpenTelemetry SDK with 7 named instruments: `agent_assist_active_conversations` (UpDownCounter), `agent_assist_job_count` (UpDownCounter, label `status`), `agent_assist_job_completion_seconds` (Histogram), `agent_assist_adapter_error_total` (Counter, label `adapter_name`), `agent_assist_renderer_validation_failure_total` (Counter, label `payload_type`), `agent_assist_search_latency_seconds` (Histogram), `agent_assist_notification_delivery_latency_seconds` (Histogram); (3) `tracing.ts` — OTel tracer with spans on Agent Gateway invocations, service method boundaries, event bus publish/consume, and external S3/OpenSearch calls; expose Prometheus scrape endpoint at `GET /metrics`
- [x] T021 Implement Redis-backed per-connection event replay buffer: store each emitted `DomainEvent` in a Redis sorted set keyed by `replay:<socketId>` with timestamp score; on Socket.io `reconnect` event, query events since last seen timestamp and re-emit to client in arrival order; set TTL of 300 s on replay sets in `backend/src/realtime/replay-buffer.ts`; integrate with `event-bus.ts`
- [x] T022 [P] Scaffold Next.js 14 App Router frontend shell: create `frontend/src/app/layout.tsx` (root layout with SessionProvider, TanStack Query provider), `frontend/src/app/(auth)/layout.tsx` (auth guard redirecting unauthenticated users to `/auth/signin`), `frontend/src/layouts/AppLayout.tsx` (sidebar nav with placeholder links for Conversations, Goals, Task Center, Search, Notifications)
- [x] T023 [P] Implement frontend API client with NextAuth session token injection, typed response wrappers, `ApiError` class, and retry on `401` (session refresh) in `frontend/src/services/api-client.ts`

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 — Converse With an AI Agent (Priority: P1) 🎯 MVP

**Goal**: Users can create a conversation, send messages, receive streamed agent responses via Socket.io, attach files, and see full history on return.

**Independent Test**: Create a new conversation, send a text message, observe agent response tokens streaming into the timeline via Socket.io, attach a file, navigate away, return and confirm full history; disconnect mid-stream and confirm replay buffer delivers missed tokens on reconnect.

### Implementation for User Story 1

- [x] T024 [P] [US1] Implement `ConversationService` (create, list by user, get by ID with ownership check, update title, archive) in `backend/src/services/conversation.service.ts`; emit `conversation.created` domain event
- [x] T025 [P] [US1] Implement `MessageService` (append with `correlation_id` and `version` fields, list by conversation in chronological order, paginate with cursor) in `backend/src/services/message.service.ts`
- [x] T026 [US1] Implement `AgentGateway` in `backend/src/gateway/agent-gateway.ts`: resolve active `IAgentAdapter` from plugin registry, wrap call with `opossum` circuit breaker (open after 5 consecutive failures, half-open after 30 s), use `async-retry` (3 attempts, exponential backoff) for transient errors; on circuit open emit `agent.unavailable` Socket.io event to conversation room; on circuit close emit `agent.available`; validate all response payloads with Zod against `contracts/message-envelope.v1.json` before forwarding; apply rate-limit middleware (T019)
- [x] T027 [US1] Implement reference HTTP `IAgentAdapter` (per `contracts/agent-adapter.v1.ts`): streams typed token events via chunked HTTP response, supports `getHealth()` and `getCapabilities()` in `backend/src/plugins/adapters/http-agent-adapter.ts`
- [x] T028 [US1] Implement conversation REST API: `POST /conversations` (create), `GET /conversations` (list owned), `GET /conversations/:id` (get with messages), `GET /conversations/:id/messages` (paginated) in `backend/src/api/conversations.router.ts`; enforce auth + ownership on every route
- [x] T029 [US1] Implement message send endpoint `POST /conversations/:id/messages`: persist user message with `correlation_id`, trigger `AgentGateway`, emit streamed agent response tokens as `message.token` Socket.io events to conversation room; on agent unreachable emit `agent.unavailable` — do NOT queue the message; return `503` to the client so the frontend can show `AgentUnavailableCard` in `backend/src/api/conversations.router.ts`
- [x] T030 [US1] Implement attachment upload endpoint `POST /conversations/:id/messages/:msgId/attachments`: read tenant upload-limits from `tenants.config_json` (default: 50 MB, images/PDF/office/text); reject with `422` and structured error if size or MIME type exceeds limits; pass to `StorageService.uploadFile` + `triggerVirusScan`; persist `attachments` record with `malware_scan_status: 'pending'` in `backend/src/api/attachments.router.ts`
- [x] T031 [US1] Implement tenant upload-limits configuration endpoints: `GET /tenants/:id/config/upload-limits` and `PATCH /tenants/:id/config/upload-limits` (accepts `maxSizeBytes`, `allowedMimeTypes[]`) stored in `tenants.config_json.uploadLimits`; accessible to any authenticated tenant user (no separate admin role) in `backend/src/api/admin/tenant-config.router.ts`
- [x] T032 [US1] Implement Zod payload validation and CSP sanitization middleware: validate every inbound message payload against versioned schema in `contracts/message-envelope.v1.json`; unknown or malformed types produce an `error_card` message; agent-supplied content is stripped of HTML/script before persistence in `backend/src/middleware/payload-validator.ts`; increment `agent_assist_renderer_validation_failure_total` metric on rejection
- [x] T033 [P] [US1] Implement `ConversationListPage` with conversation list, create-new button, and empty state in `frontend/src/app/(auth)/conversations/page.tsx`
- [x] T034 [P] [US1] Implement `ConversationPage` with message timeline (virtualized scroll), message composer input, send button, file attachment trigger in `frontend/src/app/(auth)/conversations/[id]/page.tsx`
- [x] T035 [US1] Implement `MessageBubble` component with registry-driven renderer dispatcher: load enabled renderers for tenant from plugin registry API; dispatch `text`, `markdown`, `notification`, `error_card` message types in Phase 3; additional types registered in later phases; reference `contracts/renderer-payloads.v1.json` as canonical type list in `frontend/src/components/messages/MessageBubble.tsx`
- [x] T036 [US1] Implement `useConversationStream` Socket.io hook: join conversation room on mount, subscribe to `message.token` (append streamed tokens), `agent.unavailable` (show `AgentUnavailableCard`, disable send), `agent.available` (hide card, re-enable send), `message.complete` (finalize message); on Socket.io reconnect the server replay buffer (T021) delivers missed events automatically in `frontend/src/hooks/useConversationStream.ts`
- [x] T037 [US1] Implement `AgentUnavailableCard` component: displays inline error in conversation timeline when circuit is open ("Agent temporarily unavailable — send will re-enable automatically"); disappears and re-enables the send input on `agent.available` Socket.io event in `frontend/src/components/messages/AgentUnavailableCard.tsx`
- [x] T038 [US1] Implement `AttachmentUploader` component: reads tenant upload-limits from `GET /tenants/:id/config/upload-limits`; validates file size and MIME type client-side before upload; shows inline error with constraint description on rejection; triggers upload to `POST /conversations/:id/messages/:msgId/attachments` in `frontend/src/components/AttachmentUploader.tsx`
- [x] T039 [US1] Implement QR code handoff: `GET /conversations/:id/handoff-qr` generates a cryptographically random UUID token, stores in Redis `handoff:<uuid>` with 90 s TTL and `{ userId, conversationId, tenantId, redeemed: false }`; `POST /auth/handoff/redeem?code=<uuid>` validates token (exists, not expired, not redeemed, userId matches authenticated session), issues new session for device B, atomically deletes token; writes audit log entry on every redemption attempt in `backend/src/api/conversations.router.ts` and `backend/src/api/auth.router.ts`
- [x] T040 [US1] Implement `QRHandoffModal` component: calls `GET /conversations/:id/handoff-qr`, renders QR code image using `qrcode` npm package, shows 90 s countdown and auto-closes on expiry in `frontend/src/components/QRHandoffModal.tsx`

**Checkpoint**: User Story 1 fully functional and independently testable — MVP deliverable

---

## Phase 4: User Story 2 — Monitor Background Job Execution (Priority: P2)

**Goal**: Users can open the task center, see all jobs with live state and progress (Socket.io), view job details, and receive notifications on completion/failure.

**Independent Test**: Open the task center, confirm a running job's state and progress update in real time without refresh via Socket.io, view the error summary and retry action on a failed job, confirm an unread notification appears on return.

### Implementation for User Story 2

- [ ] T041 [P] [US2] Implement `JobService` (create, update state via state machine, list by tenant/user, get by ID, retry, rerun — clones job parameters and links new job to same conversation) in `backend/src/services/job.service.ts`; emit `job.created` event; link job to active goal if context provides one
- [ ] T042 [P] [US2] Implement `NotificationService` (create, mark delivered/seen/acknowledged, list unread by user, count unread) in `backend/src/services/notification.service.ts`; measure and record `agent_assist_notification_delivery_latency_seconds` on delivery
- [ ] T043 [US2] Implement job lifecycle state machine enforcing valid transitions (scheduled → queued → running → waiting_for_input → completed/failed; waiting_for_input → running on form submission) and invalid transition rejection; emit `job.status_changed` Socket.io event to user's rooms on every transition; call `AuditService.logJobTransition`; update `agent_assist_job_count` metric in `backend/src/domain/job-state-machine.ts`
- [ ] T044 [US2] Implement `waiting_for_input` timeout scheduler: on application startup register a recurring check (every 60 s) scanning jobs in `waiting_for_input` state where `updated_at < now() - tenant_timeout`; for each expired job invoke `job-state-machine.ts` to transition to `failed` with `error_code: 'input_timeout'`; create failure notification via `NotificationService`; tenant timeout defaults to 86400 s (24 h), configurable via `tenants.config_json.inputTimeoutSeconds` in `backend/src/domain/job-timeout-scheduler.ts`
- [ ] T045 [US2] Implement job REST API: `GET /jobs` (list, filterable by status), `GET /jobs/:id` (detail with start/completion times, error summary), `POST /jobs/:id/retry` (reset to scheduled), `POST /jobs/:id/rerun` (clone job to new instance), `DELETE /jobs/:id` in `backend/src/api/jobs.router.ts`
- [ ] T046 [US2] Implement notification REST API: `GET /notifications` (list unread), `PATCH /notifications/:id/seen`, `PATCH /notifications/:id/acknowledged` in `backend/src/api/notifications.router.ts`
- [ ] T047 [US2] Extend Socket.io event bus to push `job.status_changed` and `notification.created` events to all Socket.io sessions belonging to the owning user (join user room on auth); ensure replay buffer (T021) captures these events in `backend/src/realtime/event-bus.ts`
- [ ] T048 [P] [US2] Implement `TaskCenterPage` with job list, state filter tabs (All / Scheduled / Running / Waiting / Completed / Failed), progress bars in `frontend/src/app/(auth)/jobs/page.tsx`
- [ ] T049 [P] [US2] Implement `JobDetailPanel` showing job type, start time, completion time, output summary, error summary with `error_code`, retry button, rerun button, and an Artifacts tab (populated in Phase 7) in `frontend/src/components/jobs/JobDetailPanel.tsx`
- [ ] T050 [US2] Implement `NotificationCenter` component: unread badge with count, dropdown list of recent notifications, mark-as-seen on dropdown open, mark-as-acknowledged on item click in `frontend/src/components/NotificationCenter.tsx`
- [ ] T051 [US2] Implement `useJobUpdates` Socket.io hook: subscribe to `job.status_changed` and `notification.created` events on user room; update task center state and notification badge without page refresh; on reconnect replay buffer delivers missed transitions automatically in `frontend/src/hooks/useJobUpdates.ts`

**Checkpoint**: User Stories 1 and 2 are both independently functional

---

## Phase 5: User Story 3 — Supply Structured Input to a Paused Workflow (Priority: P3)

**Goal**: When a job enters `waiting_for_input`, an inline form appears in the chat; first valid submission transitions the job automatically; delivery failures retry 3× then fail the job; subsequent submissions after resolution receive `409`.

**Independent Test**: Place a job in `waiting_for_input`, observe inline form in timeline, submit valid data, confirm job transitions immediately (platform-triggers), submit again and confirm `409 Conflict`; disconnect agent after submission and confirm 3-retry exhaustion transitions job to `failed` with reason `"submission_delivery_failed"`.

### Implementation for User Story 3

- [ ] T052 [P] [US3] Implement `FormRequestService`: `createFormRequest(jobId, schema)` persists a form request record and injects `form_request` typed message into the conversation timeline; `submitFormResponse(jobId, payload)` — first call transitions job out of `waiting_for_input` via state machine, marks form resolved, initiates agent delivery with `async-retry` (3 attempts, exponential backoff); if all retries fail, call `job-state-machine` to transition job to `failed` with `error_code: 'submission_delivery_failed'` and create failure notification; subsequent calls after resolution return `409 Conflict` in `backend/src/services/form-request.service.ts`
- [ ] T053 [US3] Implement form submission REST endpoint `POST /jobs/:id/form-response`: validate payload with Zod against agent-supplied form schema; call `FormRequestService.submitFormResponse`; return `200` on success, `409` if already resolved, `422` on schema validation failure in `backend/src/api/jobs.router.ts`
- [ ] T054 [US3] Extend `AgentGateway` to handle agent-initiated `form_request` events: validate payload against `contracts/renderer-payloads.v1.json` form_request schema, call `FormRequestService.createFormRequest`, inject `form_request` message into conversation timeline via `MessageService` in `backend/src/gateway/agent-gateway.ts`
- [ ] T055 [P] [US3] Implement `InlineFormRenderer` component: render dynamic agent-defined form schema (text, number, date, select, file upload fields) with field-level client-side Zod validation; show submission confirmation in timeline on success in `frontend/src/components/messages/InlineFormRenderer.tsx`
- [ ] T056 [US3] Implement `useFormDraft` hook: persist partially-filled form state to `sessionStorage` keyed by `formRequestId`; restore on navigation return; clear on successful submission in `frontend/src/hooks/useFormDraft.ts`
- [ ] T057 [US3] Implement file upload field within `InlineFormRenderer` using `AttachmentUploader`, linking the uploaded file reference to the form submission payload in `frontend/src/components/messages/InlineFormRenderer.tsx`
- [ ] T058 [US3] Register `form_request` message type in `MessageBubble` dispatcher delegating to `InlineFormRenderer`; register `status_card` type (job state change cards) in `frontend/src/components/messages/MessageBubble.tsx`

**Checkpoint**: User Stories 1, 2, and 3 are all independently functional

---

## Phase 6: User Story 4 — Define and Track a Goal (Priority: P4)

**Goal**: Users can create directive goals (injected as context on every agent turn) and scheduled goals (spawning background jobs); both use the same Goal entity with `goal_type` discriminator.

**Independent Test**: Create a directive-type goal and confirm it is injected as context on the next message sent; create a scheduled goal, link a job to it, view the job in goal detail; update the goal description, then cancel it.

### Implementation for User Story 4

- [ ] T059 [P] [US4] Implement `GoalService` (create with `goal_type: 'directive' | 'scheduled'`, list, get, update, cancel, link jobs; `getActiveDirectiveGoals(userId)` for context injection) in `backend/src/services/goal.service.ts`; emit `goal.created`, `goal.updated`, `goal.cancelled` domain events
- [ ] T060 [US4] Implement goal REST API: `POST /goals`, `GET /goals`, `GET /goals/:id`, `PATCH /goals/:id` (update title/description/schedule), `DELETE /goals/:id` (cancel — sets `status: 'cancelled'`), `GET /goals/:id/jobs` in `backend/src/api/goals.router.ts`
- [ ] T061 [US4] Extend `AgentGateway` to fetch all `goal_type: 'directive'` goals for the user via `GoalService.getActiveDirectiveGoals` and include them as a `directives` array in the context payload on **every** conversation turn (not only when a goal is linked to the conversation) in `backend/src/gateway/agent-gateway.ts`
- [ ] T062 [US4] Implement goal-to-job linking in `JobService`: when a job is created with a `goalId` context field, associate the job with that goal; when a `goal_type: 'scheduled'` goal is cancelled, prevent new jobs from being created under it in `backend/src/services/job.service.ts`
- [ ] T063 [P] [US4] Implement `GoalPanel` sidebar component showing active goals grouped by type (Directives / Scheduled) with status badges and link to goal detail in `frontend/src/components/goals/GoalPanel.tsx`
- [ ] T064 [US4] Implement `GoalDetailPage` showing title, description, `goal_type`, status, cron schedule (if scheduled), linked job list, edit form (title/description/schedule), and cancel button in `frontend/src/app/(auth)/goals/[id]/page.tsx`
- [ ] T065 [US4] Register `goal_update` message type in `MessageBubble` dispatcher rendering inline goal status change cards in `frontend/src/components/messages/MessageBubble.tsx`

**Checkpoint**: User Stories 1–4 are all independently functional

---

## Phase 7: User Story 5 — Review and Retrieve Generated Outputs (Priority: P5)

**Goal**: Completed jobs produce table, chart, file, and image artifacts that render as interactive components in the conversation timeline.

**Independent Test**: Produce a table artifact; confirm it renders with sortable columns, filter bar, pagination, and CSV/JSON export; produce chart, file, and image artifacts and verify each renders correctly; confirm `artifact.accessed` audit log entry is written on download.

### Implementation for User Story 5

- [ ] T066 [P] [US5] Implement `ArtifactService` (create with Zod versioned schema validation against `artifact-schema-registry`, list by job, get by ID, `generateSignedDownloadUrl` — generates S3 presigned URL and calls `AuditService.logArtifactAccess`) in `backend/src/services/artifact.service.ts`
- [ ] T067 [US5] Implement artifact REST API: `GET /artifacts/:id`, `GET /jobs/:id/artifacts`, `GET /artifacts/:id/download-url` (returns time-limited signed URL) in `backend/src/api/artifacts.router.ts`
- [ ] T068 [US5] Implement versioned artifact schema registry with Zod schemas per `artifact_type` (table, chart, file, image, text) and `schema_version`; reject any payload that does not match a known versioned schema; increment `agent_assist_renderer_validation_failure_total` on rejection in `backend/src/domain/artifact-schema-registry.ts`
- [ ] T069 [P] [US5] Implement `TableArtifactRenderer` with client-side sortable columns (click-to-sort), filter bar (text filter across all columns), pagination (10/25/50 rows), and CSV/JSON export button in `frontend/src/components/artifacts/TableArtifactRenderer.tsx`
- [ ] T070 [P] [US5] Implement `ChartArtifactRenderer` rendering validated chart payloads as a visual chart (bar/line/pie per `chartType` field) with title and axis labels in `frontend/src/components/artifacts/ChartArtifactRenderer.tsx`
- [ ] T071 [P] [US5] Implement `FileArtifactRenderer` showing filename, size, MIME type, and a secure download button that calls `GET /artifacts/:id/download-url` to fetch a fresh signed URL on click in `frontend/src/components/artifacts/FileArtifactRenderer.tsx`
- [ ] T072 [P] [US5] Implement `ImageArtifactRenderer` rendering inline image from signed URL for `artifact_type: 'image'`; also handles `image_reference` message type displaying an inline image preview in the conversation timeline in `frontend/src/components/artifacts/ImageArtifactRenderer.tsx`
- [ ] T073 [US5] Register `table`, `chart`, `file_reference`, and `image_reference` message types in `MessageBubble` dispatcher delegating to the appropriate renderer; register `action_card` type (renders agent-proposed action buttons) in `frontend/src/components/messages/MessageBubble.tsx`
- [ ] T074 [US5] Extend `JobDetailPanel` with populated Artifacts tab: list all artifacts produced by the job with type icon, title, and view/download link in `frontend/src/components/jobs/JobDetailPanel.tsx`

**Checkpoint**: User Stories 1–5 are all independently functional

---

## Phase 8: User Story 6 — Search Historical Jobs, Conversations, and Artifacts (Priority: P6)

**Goal**: Users can search by keyword or filter, receive results within 3 s, navigate directly to the linked conversation, and rerun a prior job.

**Independent Test**: Seed prior jobs/conversations/artifacts; execute keyword search and confirm results arrive within 3 s; apply status and date filters; click a result and confirm navigation to linked conversation with match highlighted; select "Rerun" and confirm new job is created; take OpenSearch offline and confirm visible error banner with retry button appears (no silent empty results).

### Implementation for User Story 6

- [ ] T075 [P] [US6] Implement `SearchIndexerService`: OpenSearch indices for `conversations` (title, owner), `messages` (payload text), `goals` (title, description), `jobs` (job_type, status, error_summary), `artifacts` (title, preview_json) — all documents include `tenant_id` for mandatory per-query scoping; `indexDocument`, `updateDocument`, `deleteDocument` helpers in `backend/src/services/search-indexer.service.ts`
- [ ] T076 [US6] Implement `SearchQueryService`: execute full-text + structured queries with filters (status, date range, artifact_type) within 3 s SLA; on OpenSearch unavailability return structured `{ unavailable: true }` response (do NOT return empty results) in `backend/src/services/search-query.service.ts`; record `agent_assist_search_latency_seconds` histogram on every query
- [ ] T077 [US6] Implement search REST endpoint `GET /search?q=&type=&status=&from=&to=` returning ranked results with `conversationId` links; when `SearchQueryService` returns `{ unavailable: true }` respond with `503` and `{ error: 'search_unavailable' }` body in `backend/src/api/search.router.ts`
- [ ] T078 [US6] Register index update hooks in all four services: call `SearchIndexerService.indexDocument` / `updateDocument` after every create/update in `ConversationService`, `GoalService`, `JobService`, and `ArtifactService`; use fire-and-forget with error logging so indexing failures do not affect primary operations in `backend/src/services/search-indexer.service.ts`
- [ ] T079 [P] [US6] Implement `GlobalSearchBar` with 300 ms debounced query input, result dropdown (showing top 5 per type), keyboard navigation (↑↓ to navigate, Enter to open); when API returns `503` display a visible search-unavailable error banner with a "Retry" button that re-executes the last query in `frontend/src/components/GlobalSearchBar.tsx`
- [ ] T080 [US6] Implement `SearchResultsPage` with full result list, filter panel (status, date range, artifact type), result cards with type icon and conversation link in `frontend/src/app/(auth)/search/page.tsx`
- [ ] T081 [US6] Implement search result navigation: when arriving from a search result with `?highlight=<messageId>`, scroll to and visually highlight the target message or artifact in `ConversationPage` in `frontend/src/app/(auth)/conversations/[id]/page.tsx`

**Checkpoint**: All six user stories are independently functional

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Renderer extensibility wiring, missing content types, SLA validation, and final QA

- [ ] T082 [P] Implement `RendererRegistry` that resolves the active renderer component for a given message type from the tenant's enabled plugins via plugin registry API; wire `MessageBubble` to use `RendererRegistry` for dynamic plugin-driven renderer resolution (FR-036) in `frontend/src/components/messages/RendererRegistry.ts` and update `frontend/src/components/messages/MessageBubble.tsx`
- [ ] T083 [P] Implement `error_card` message type renderer: displays agent error payload with message text, error code, and optionally a retry action; already referenced as a fallback in `MessageBubble` — make it a standalone component in `frontend/src/components/messages/ErrorCardRenderer.tsx`
- [ ] T084 [P] Implement per-tenant plugin enablement UI: list all registered plugins with enable/disable toggle per plugin type; calls `PATCH /tenants/:id/plugins/:pluginId/enabled`; accessible to any authenticated tenant user in `frontend/src/app/admin/plugins/page.tsx` and `backend/src/api/admin/plugins.router.ts`
- [ ] T085 Validate response time SLAs via load test scenarios from `quickstart.md`: first agent response token ≤ 2 s p95 (SC-001); job state update visible ≤ 3 s (SC-002); search results ≤ 3 s at 95th percentile (SC-004); document results and any tuning applied
- [ ] T086 Run end-to-end validation: execute all 6 user story acceptance scenarios from `spec.md` and all quickstart.md scenarios; confirm FR-039 (timeout auto-fail), FR-040 (first-wins 409), FR-041 (fail-fast error card), FR-042 (upload limits 422), FR-043 (replay buffer on reconnect), FR-044 (search unavailable banner with retry) all behave as specified

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately; T002–T005 parallelizable after T001
- **Foundational (Phase 2)**: Requires Phase 1 complete — BLOCKS all user stories; T007 must precede T008; T012 requires T013 (Redis client); T021 requires T012 + T013; T014 requires T005 (plugin SDK)
- **User Stories (Phases 3–8)**: All depend on Phase 2 completion; can proceed in priority order or parallel across team
- **Polish (Phase 9)**: Depends on all desired user story phases complete

### User Story Dependencies

| Story | Depends On | Notes |
|-------|-----------|-------|
| US1 (P1) | Phase 2 | Standalone MVP; Socket.io rooms in T012 required |
| US2 (P2) | Phase 2 | References Job + Notification entities; standalone |
| US3 (P3) | Phase 2, US1 recommended | Form rendered in conversation timeline (T035); US2 state machine used |
| US4 (P4) | Phase 2, US1 + US2 recommended | AgentGateway directive injection (T061) extends T026; jobs link to goals |
| US5 (P5) | Phase 2, US2 recommended | Artifacts linked to jobs (T041); JobDetailPanel extended |
| US6 (P6) | Phase 2, all stories recommended | Indexes all entity types; full validation requires all stories seeded |

### Within Each User Story

- Backend service → API endpoints → frontend pages/components → integration wiring
- Parallelizable backend services and frontend pages can overlap across team members
- Commit after each logical group; validate story checkpoint before advancing

### Parallel Opportunities

- Phase 1: T002–T005 all parallelizable after T001
- Phase 2: T015–T016 parallelizable; T017–T020 parallelizable; T022–T023 parallelizable; T007 must precede T008
- Phase 3: T024–T025 parallel; T033–T034 parallel (frontend)
- Phase 4: T041–T042 parallel; T048–T049 parallel
- Phase 5: T052, T055 parallel
- Phase 6: T059, T063 parallel
- Phase 7: T066, T069–T072 parallel
- Phase 8: T075, T079 parallel

---

## Parallel Example: User Story 1

```bash
# Backend (parallel after T007/T008):
Task T024: ConversationService
Task T025: MessageService

# Then:
Task T026: AgentGateway (depends T024, T025, T019 rate-limit)
Task T027: HTTP adapter (depends T026)
Task T028–T032: API endpoints (depends T026–T027)

# Frontend (parallel with backend T028+):
Task T033: ConversationListPage
Task T034: ConversationPage
Task T038: AttachmentUploader

# Then:
Task T035: MessageBubble (depends T033, T034)
Task T036: useConversationStream (depends T034, T012 Socket.io)
Task T037: AgentUnavailableCard (depends T036)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (**CRITICAL** — 23 tasks, includes observability, correlation ID, rate limiting, replay buffer, Redis)
3. Complete Phase 3: User Story 1 (T024–T040)
4. **STOP and VALIDATE**: send message → stream response → attach file → QR handoff → disconnect/reconnect replay
5. Deploy/demo MVP

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 (T024–T040) → Working chat with Socket.io streaming → **Deploy MVP**
3. US2 (T041–T051) → Job monitoring + notifications → Deploy
4. US3 (T052–T058) → Inline form submissions → Deploy
5. US4 (T059–T065) → Goal tracking + directive injection → Deploy
6. US5 (T066–T074) → Artifact rendering (table/chart/file/image) → Deploy
7. US6 (T075–T081) → Search → Deploy
8. Polish (T082–T086) → Registry-driven renderers, SLA validation → Ship

### Parallel Team Strategy

With multiple developers, once Phase 2 is complete:
- **Developer A**: US1 (chat + Socket.io streaming + AgentGateway)
- **Developer B**: US2 (job monitoring + state machine + notifications)
- **Developer C**: US3 (inline forms + submission idempotency)
- Stories integrate independently before merge

---

## Notes

- **Real-time**: All streaming uses **Socket.io 4** with Redis adapter — not SSE. SSE is unidirectional and cannot carry form acknowledgements or circuit-breaker state events.
- **Replay buffer** (T021): Redis-backed, per-connection, 300 s TTL. Socket.io reconnection triggers automatic delivery of missed events — no manual page refresh required (FR-043).
- **Agent unreachable** (FR-041): Fail fast — `503` from backend, inline `AgentUnavailableCard` in timeline, send re-enables on `agent.available` Socket.io event. No message queuing.
- **Form submission** (FR-015/FR-040): Platform triggers state transition on first valid submission. `409 Conflict` on subsequent submissions. `async-retry` (3×) on agent delivery; `"submission_delivery_failed"` terminal state on exhaustion.
- **Upload limits** (FR-042): Tenant-configurable (50 MB default), enforced client-side and server-side (`422` on breach).
- **Timeout** (FR-039): `job-timeout-scheduler.ts` runs every 60 s; per-tenant timeout (24 h default) in `tenants.config_json.inputTimeoutSeconds`.
- **Audit log** (FR-034 + constitution): Covers job transitions AND artifact access events. Both in T016 (`AuditService`).
- **Observability** (T020): Required from Phase 2 — not deferred. 7 OTel instruments + pino + distributed tracing.
- **Goal entity** (FR-016 unified): `goal_type: 'directive' | 'scheduled'` in the `goals` table. No separate `user_settings` model.
- **[P]** tasks operate on different files — safe to parallelize. **[USN]** labels map tasks to spec user stories for full traceability.
