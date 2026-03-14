# Feature Specification: Agent Chat Workspace

**Feature Branch**: `001-agent-chat-workspace`
**Created**: 2026-03-14
**Status**: Draft
**Input**: pluggable_agent_chat_architecture.md

## Clarifications

### Session 2026-03-14

- Q: What user roles exist — single role, tenant_admin + user, or three-tier? → A: Single role — all authenticated users have identical permissions. Plugin management, settings administration, and all other privileged operations are accessible to any authenticated user within their tenant.
- Q: Are FR-016 "settings panel directives" (Agentic System Goal, Daily Workflow) the same concept as US4 Goal entities, or distinct? → A: Same concept — Goal entities (FR-017+) serve both purposes: they are automatically applied as context across all conversations and job executions (FR-016) AND they can spawn scheduled/recurring jobs (US4). There is one Goal entity, one Goal panel; no separate user_settings model for behavioral directives.
- Q: What happens if a job remains in `waiting_for_input` indefinitely? → A: Configurable per-tenant timeout (default 24 h). On expiry the job auto-transitions to `failed` with a human-readable reason; the user receives a notification. The timeout value is a tenant-level configuration field.
- Q: When two users in the same session submit the same form simultaneously, which wins? → A: First submission wins. The first valid submission transitions the job out of `waiting_for_input` and is forwarded to the agent. Subsequent submissions that arrive after the transition receive a `409 Conflict` response indicating the form has already been resolved.
- Q: What is the data retention policy for conversations, jobs, artifacts, and attachments? → A: Out of scope for this feature. Retention, purge scheduling, and compliance-driven deletion are deferred to a future data-management feature. This feature retains all data indefinitely by default.
- Q: What happens when the external agent system is unreachable while a user sends a message? → A: Fail fast — the send attempt is rejected with a visible inline error card in the conversation timeline. The send button re-enables automatically when the circuit closes. No message is queued; the user decides whether to resend.
- Q: Who triggers job resumption from `waiting_for_input` — the platform on form submission receipt, or the agent on explicit signal? → A: Platform triggers — the first valid form submission received transitions the job out of `waiting_for_input` automatically. The submission is forwarded to the agent. Subsequent submissions after the transition are rejected with `409 Conflict`.
- Q: What happens if a form submission fails to reach the agent after the user submits? → A: Retry silently up to 3 times. If all attempts fail, the job transitions to `failed` with reason `"submission_delivery_failed"` and the user receives a failure notification.
- Q: What happens if the event stream disconnects mid-job and the user misses state transitions? → A: Server maintains a per-connection replay buffer. On reconnect, the client receives all events missed since disconnect in arrival order. No manual refresh required.
- Q: What happens when the search index is temporarily unavailable? → A: Show a visible search-unavailable error banner with a retry button. Empty results MUST NOT be returned silently.
- Q: What are the file upload size and type limits? → A: Configurable per tenant with platform defaults: 50 MB max file size; allowed MIME types default to images, PDF, office documents, and plain text. Client-side validation runs before upload. Rejected files show an inline error listing the allowed types and size limit.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Converse With an AI Agent (Priority: P1)

A user opens the workspace and types a message to an external AI agent system. The
agent processes the request and streams a response back into the conversation timeline.
The user can continue the conversation across multiple turns, attach files, and see
all prior messages when they return to the session.

**Why this priority**: This is the foundational interaction that every other capability
depends on. Without a working conversation thread, no other feature can be demonstrated
or tested. It is the entry point for all user intents.

**Independent Test**: A user can start a new conversation, send a message, and receive
a streamed response from the agent — delivering meaningful AI interaction with no other
features needed.

**Acceptance Scenarios**:

1. **Given** the user has an authenticated session, **When** they create a new conversation
   and send a text message, **Then** the message is persisted and the agent response streams
   into the conversation timeline in real time.
2. **Given** an active conversation, **When** the user sends a follow-up message, **Then**
   the prior context is available and the agent responds within the same thread.
3. **Given** a conversation, **When** the user attaches a file to their message,
   **Then** the file is accepted, stored securely, and associated with the message.
4. **Given** a previous conversation, **When** the user reopens it, **Then** the full
   message history is visible in the correct order.

---

### User Story 2 - Monitor Background Job Execution (Priority: P2)

After interacting with an agent, background work is triggered (e.g., a report is
being generated, a workflow is running). The user can view all jobs by state, see
progress indicators, and receive a notification when a job completes or fails — without
needing to keep the conversation open.

**Why this priority**: Many agent-driven tasks run asynchronously and take minutes or
longer. Without job visibility, users have no idea whether work is progressing, stuck,
or done. This is the minimum required to make async workflows trustworthy.

**Independent Test**: A user can open the task center, see a list of jobs with their
current states and progress, and be notified when one completes — all independently of
any other feature.

**Acceptance Scenarios**:

1. **Given** a running job, **When** the user opens the task center, **Then** they see
   the job listed with its current state (scheduled, queued, running, waiting for input,
   completed, or failed).
2. **Given** a running job, **When** the job's progress changes, **Then** the task center
   updates in real time without requiring a page refresh.
3. **Given** a completed job, **When** the user views job details, **Then** they can see
   start time, completion time, and a summary of what was produced.
4. **Given** a failed job, **When** the user views the job, **Then** they see a human-
   readable error summary and are offered a retry action.
5. **Given** a job that completes while the user is away, **When** the user returns,
   **Then** an unread notification is present in the notification center.

---

### User Story 3 - Supply Structured Input to a Paused Workflow (Priority: P3)

An agent-driven job pauses because it needs additional information from the user (e.g.,
a date range, an approval, or a document upload). The chat timeline displays a form
inline. The user fills it in, submits, and the job resumes automatically.

**Why this priority**: A significant class of workflows cannot complete without human
input at runtime. Supporting this interaction turns the platform from a fire-and-forget
tool into a true collaborative workspace. It directly unblocks jobs that are stuck
waiting.

**Independent Test**: A job can be placed in "waiting for input" state, the user is
shown a form in the chat, they submit a response, and the job resumes — testable
end-to-end without any other user stories.

**Acceptance Scenarios**:

1. **Given** a job waiting for input, **When** the user opens the relevant conversation,
   **Then** a structured input form appears inline in the chat timeline.
2. **Given** the inline form, **When** the user submits required fields with valid data,
   **Then** the submission is sent to the agent, the job transitions out of "waiting for
   input", and a confirmation appears in the timeline.
3. **Given** the inline form, **When** the user submits with missing required fields,
   **Then** validation errors are shown inline and the form is not submitted.
4. **Given** a form that requires a file upload, **When** the user selects and submits
   a file, **Then** the file is stored securely and linked to the job.
5. **Given** a partially filled form, **When** the user navigates away and returns,
   **Then** their draft input is preserved.

---

### User Story 4 - Define and Track a Goal (Priority: P4)

A user wants the agent to pursue a longer-running or recurring objective (e.g., "prepare
a payroll report every weekday at 6 PM"). They define a goal in the workspace. The goal
persists independently of individual conversations, and the user can view its current
status and the jobs it has spawned.

**Why this priority**: Goals represent persistent intent beyond a single conversation
turn. They enable recurring and scheduled workflows, which dramatically expand the
practical utility of the platform for operational use cases.

**Independent Test**: A user can define a goal, see it saved independently from chat
messages, view jobs linked to that goal, and update or cancel the goal — all
independently testable.

**Acceptance Scenarios**:

1. **Given** an active conversation, **When** the user defines a goal, **Then** the goal
   is stored, linked to the conversation, and visible in a dedicated goal panel.
2. **Given** a saved goal, **When** the agent creates jobs to fulfil it, **Then** those
   jobs are listed under the goal's detail view.
3. **Given** a saved goal, **When** the user updates the goal description or constraints,
   **Then** the changes are persisted and the agent is notified.
4. **Given** a goal that is no longer needed, **When** the user cancels it, **Then** no
   further jobs are created under that goal.

---

### User Story 5 - Review and Retrieve Generated Outputs (Priority: P5)

A completed job produces an artifact (report, table, chart, or file). The artifact
appears in the conversation timeline as a structured, interactive component — a table
with sorting and export, a chart, or a downloadable file. The user can view, interact
with, and download the artifact without leaving the workspace.

**Why this priority**: Artifacts are the primary deliverables of the platform. Without
the ability to render and retrieve them, the system produces invisible outputs. This
closes the loop from goal → execution → result.

**Independent Test**: A job can produce an artifact (e.g., a table), the user opens
the conversation, and the artifact renders correctly with interaction capabilities
(sort, export) — independently testable.

**Acceptance Scenarios**:

1. **Given** a job that completes with a table artifact, **When** the user views the
   conversation, **Then** the table renders inline with sortable columns, filters,
   pagination, and an export option.
2. **Given** a job that produces a chart artifact, **When** the user views the
   conversation, **Then** the chart renders as a visual representation with a title
   and axis labels.
3. **Given** a job that produces a file artifact, **When** the user views the
   conversation, **Then** a file reference card is shown with a secure download link.
4. **Given** multiple artifacts from the same job, **When** the user views job details,
   **Then** all associated artifacts are listed.

---

### User Story 6 - Search Historical Jobs, Conversations, and Artifacts (Priority: P6)

A user needs to find a report they received last month, locate a failed job from last
week, or re-open a prior conversation. They use the global search to find the relevant
record, jump directly to the linked conversation, and optionally rerun the job.

**Why this priority**: As usage grows, the volume of jobs, conversations, and artifacts
makes ad-hoc browsing impractical. Search is the reliability net that ensures past work
is retrievable rather than effectively lost.

**Independent Test**: A user can search for a keyword or status filter, receive
relevant results linking to conversations and artifacts, and navigate to any result —
independently testable.

**Acceptance Scenarios**:

1. **Given** prior jobs and conversations, **When** the user searches a keyword,
   **Then** results include matching conversations, jobs, and artifacts within
   3 seconds.
2. **Given** search results, **When** the user applies a status filter (e.g., "failed"
   or "completed"), **Then** results are narrowed to matching jobs.
3. **Given** a search result, **When** the user clicks it, **Then** they are taken
   directly to the relevant conversation and the matching item is highlighted.
4. **Given** a result linked to a prior job, **When** the user selects "rerun",
   **Then** a new job is created with the same parameters and the user is returned
   to the conversation.

---

### Edge Cases

- When the external agent system is unreachable, the send attempt fails fast with a visible inline error card in the conversation timeline. The send input re-enables automatically when the circuit breaker closes. No message is queued; the user decides whether to resend.
- What happens if the agent returns a payload type not recognized by the renderer?
- If a form submission fails to reach the agent after the user submits, the system retries silently up to 3 times. If all retries fail, the job transitions to `failed` with reason `"submission_delivery_failed"` and the user receives a failure notification.
- If a file upload exceeds the per-tenant size limit (default 50 MB) or has a disallowed MIME type (default allowed: images, PDF, office documents, plain text), the client rejects it before upload with an inline error listing the constraint violated. The server enforces the same limits as a second check and returns a `422` with a structured error if the client validation is bypassed.
- If a job remains in `waiting_for_input` beyond the per-tenant timeout (default 24 h), it auto-transitions to `failed` with reason `"input_timeout"`, and the user receives a failure notification. The timeout is configurable per tenant via the tenant configuration API.
- When two users in the same session submit the same form simultaneously, the first valid submission received transitions the job out of `waiting_for_input` and is forwarded to the agent. Any subsequent submission that arrives after the state transition receives a `409 Conflict` response indicating the form has already been resolved.
- If the event stream disconnects mid-job, the server maintains a per-connection replay buffer. On reconnect, the client automatically receives all events missed since disconnect in arrival order. No manual page refresh is required.
- When the search index is temporarily unavailable, the UI displays a visible search-unavailable error banner with a retry button. Empty results MUST NOT be returned silently — the unavailability must be surfaced explicitly to the user.

## Requirements *(mandatory)*

### Functional Requirements

**Conversation**

- **FR-001**: System MUST allow authenticated users to create new conversation threads.
- **FR-002**: System MUST persist all messages (user and agent) in a conversation and
  display them in chronological order on reload.
- **FR-003**: System MUST stream agent responses into the conversation timeline in real time.
- **FR-004**: System MUST support file and image attachments on user messages.
- **FR-005**: System MUST store attachments securely and associate them with their
  originating message.
- **FR-038**: System MUST allow users to generate a QR code for an active conversation
  that, when scanned on another authenticated device, resumes that conversation with
  full message history and state intact.

**Job Visibility**

- **FR-006**: System MUST track every background job through a defined lifecycle:
  scheduled → queued → running → waiting_for_input → completed / failed.
- **FR-007**: System MUST display current job state and progress to the user without
  requiring a page refresh.
- **FR-008**: System MUST expose a task center view listing all jobs filterable by state.
- **FR-009**: System MUST notify users when a job completes, fails, or requires input,
  regardless of whether the conversation is open.
- **FR-010**: System MUST retain job visibility even when the external agent system is
  temporarily unavailable.
- **FR-043**: The System MUST maintain a per-connection event replay buffer on the
  server. On reconnect, the client MUST automatically receive all events missed since
  disconnect in arrival order with no user action required.
- **FR-042**: File uploads MUST be validated client-side and server-side against a
  per-tenant configurable size limit (platform default: 50 MB) and an allowed MIME
  type list (platform default: images, PDF, office documents, plain text). Rejected
  uploads MUST show an inline error identifying the violated constraint. The server
  MUST return `422` with a structured error body if server-side limits are exceeded.
  Allowed types and size limits MUST be configurable per tenant via the tenant
  configuration API.
- **FR-041**: When the external agent system is unreachable, the System MUST fail the
  send attempt immediately and display a visible inline error card in the conversation
  timeline. The send input MUST re-enable automatically when the circuit breaker detects
  agent recovery. No message MAY be silently queued without user awareness; the user
  decides whether to resend.

**Structured Input**

- **FR-011**: System MUST render agent-defined forms inline in the conversation when
  a job enters "waiting for input" state.
- **FR-012**: System MUST validate form input client-side before submission.
- **FR-013**: System MUST support file and image upload fields within inline forms.
- **FR-014**: System MUST preserve draft form state across navigation within the session.
- **FR-015**: System MUST transition the job out of `waiting_for_input` automatically
  upon receipt of the first valid form submission and forward it to the agent. If agent
  delivery fails after 3 retry attempts, the job MUST transition to `failed` with reason
  `"submission_delivery_failed"` and the user MUST be notified.
- **FR-040**: The first valid form submission received for a `waiting_for_input` job
  MUST transition the job out of `waiting_for_input` automatically and forward the
  submission to the agent. Any subsequent submission arriving after this transition
  MUST be rejected with `409 Conflict` and a response body indicating the form has
  already been resolved.
- **FR-039**: System MUST auto-transition a job from `waiting_for_input` to `failed`
  (with reason `"input_timeout"`) when the per-tenant input timeout elapses (default
  24 h, configurable per tenant). A failure notification MUST be sent to the user on
  expiry.

**Goals**

- **FR-016**: Goal entities (see FR-017) serve as persistent behavioral directives that are automatically applied as context across all conversations and job executions. Examples of directive-type goals include an "Agentic System Goal" (overarching intent) or "Daily Workflow" (recurring instruction). These are the same Goal entity as US4 — not a separate settings model. The Goal panel is the single UI surface for both directive goals and schedulable objectives.
- **FR-017**: System MUST persist goals independently of individual conversation messages.
- **FR-018**: System MUST display all jobs associated with a goal in the goal detail view.
- **FR-019**: System MUST allow users to update or cancel an active goal.

**Artifacts**

- **FR-020**: System MUST store every artifact produced by a job with a reference to
  its originating job and conversation.
- **FR-021**: System MUST render table artifacts with sortable columns, filters,
  pagination, and data export capability.
- **FR-022**: System MUST render chart artifacts from structured, validated chart
  payloads.
- **FR-023**: System MUST render file artifacts as downloadable references with
  secure, time-limited download links.
- **FR-024**: System MUST reject any artifact payload that does not conform to a
  known, versioned schema.

**Search**

- **FR-044**: When the search index is unavailable, the System MUST display a visible
  search-unavailable error banner with a retry button. The System MUST NOT return empty
  results silently — index unavailability MUST be surfaced explicitly to the user.
- **FR-025**: System MUST index conversations, jobs, artifacts, and goals for full-text
  and structured search.
- **FR-026**: System MUST support filtering search results by state, date range, and
  artifact type.
- **FR-027**: System MUST link each search result to its originating conversation.
- **FR-028**: System MUST offer a "rerun" action on completed or failed job results.

**Security & Trust**

- **FR-029**: System MUST authenticate and authorize every user action.
- **FR-030**: System MUST enforce access control at the conversation level so users
  cannot access conversations they do not own or share.
- **FR-031**: System MUST scan uploaded files for malware before making them accessible.
- **FR-032**: System MUST validate and sanitize every structured payload before rendering.
- **FR-033**: Agent-supplied content MUST NEVER execute as code or be injected as raw
  markup in the browser.
- **FR-034**: System MUST write an audit log entry for every job state transition.

**Plugins & Extensibility**

- **FR-035**: System MUST support pluggable agent adapters so different external agent
  runtimes can be integrated without modifying core services. Plugin registration and
  management is accessible to any authenticated user within the tenant (no separate admin role).
- **FR-036**: System MUST support pluggable renderer types so new content blocks can be
  added without changing existing renderers.
- **FR-037**: System MUST support per-tenant plugin enablement — a plugin active for
  one tenant MUST NOT affect another. Any authenticated tenant user may enable or
  disable plugins for their tenant.

### Key Entities

- **Conversation**: A persistent thread of messages between a user and an agent system.
  Has a title, owner, status, and optionally a linked active goal.
- **Message**: A single item in a conversation timeline. Carries a structured typed
  payload (text, form, table, chart, file, notification, etc.) and a version.
- **Goal**: A user-defined objective that persists independently of chat. Has a title,
  description, status, optional schedule (cron), and links to the jobs it has spawned.
  Goals serve dual purpose: (1) directive goals are automatically injected as context
  into every conversation and job execution (e.g., "Agentic System Goal", "Daily Workflow");
  (2) scheduled/objective goals spawn background jobs to fulfil a recurring task. Both
  are the same entity; a `goal_type` field (or equivalent) distinguishes them.
- **Job**: A record of background work triggered by an agent. Tracks full lifecycle
  state, progress, input/output references, and links to its conversation and goal.
- **Artifact**: An output produced by a job. Has a type, title, versioned preview, and
  a secure storage reference. Always associated with its originating job.
- **Notification**: A first-class record of a system event (job completed, input needed,
  failure) addressed to a specific user. Has a lifecycle: created → delivered → seen →
  acknowledged.
- **Attachment**: A file or image submitted by the user. Associated with a specific
  message or form submission.
- **Plugin**: A registered extension that implements a versioned interface contract for
  a specific category (agent adapter, renderer, notification channel, storage, auth/policy).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can send a message and see the first token of the agent response
  within 2 seconds of submission under normal conditions.
- **SC-002**: Users can track job state transitions in the task center without
  refreshing the page, with state updates visible within 3 seconds of the actual
  transition.
- **SC-003**: Users can complete a structured inline form and resume a paused job
  in under 2 minutes, including any required file upload.
- **SC-004**: 95% of search queries return results in under 3 seconds.
- **SC-005**: Job history, artifacts, and conversations remain fully accessible and
  correctly reflect their last-known state even during external agent system outages.
- **SC-006**: A new renderer or agent adapter plugin can be registered and made active
  for a tenant without deploying changes to the core platform.
- **SC-007**: 100% of agent-supplied payloads are validated against a versioned schema
  before rendering; invalid payloads are rejected with a visible error card rather
  than silently failing or executing unvalidated content.
- **SC-008**: Users can locate a prior job or artifact by keyword within 3 search
  interactions (query, optional filter, result selection).

## Assumptions

- The external agent system is a separately maintained service; this platform owns only
  the interaction frontier and the Agent Gateway boundary.
- Authentication is handled by an existing identity provider; this platform consumes
  verified user identity but does not manage passwords or identity registration.
- Multi-tenancy (tenant isolation, per-tenant plugin configuration) is a first-class
  requirement from the initial release, not deferred to a later phase.
- A single conversation is owned by one user; sharing or collaborative conversations are
  out of scope unless specified in a future feature.
- The initial supported content types for rendering are: text, markdown, notification,
  goal update card, status card, form request, table, chart, file reference, image
  reference, action card, and error card.
- Real-time delivery uses a persistent connection (long-lived session); the specific
  transport mechanism is an implementation decision.
- Data retention, purge scheduling, and compliance-driven deletion (GDPR/CCPA right-to-erasure)
  are **out of scope** for this feature and deferred to a future data-management feature.
  All data is retained indefinitely by default in this release.
