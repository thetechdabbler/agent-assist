# Agent Integration Guide

**Version**: 1.0
**Last Updated**: 2026-03-14
**Audience**: Developers integrating an external agentic system with the Agent Chat Workspace

---

## 1. Overview

The Agent Chat Workspace is a **personal assistant platform** — a structured interaction layer that sits between users and autonomous AI-driven workflows. It is not an agent runtime. It does not reason, plan, or execute business logic.

Your agentic system plugs in through a single, well-defined boundary: the **Agent Gateway**. Everything else — conversation threads, job tracking, artifact storage, notifications, structured UI rendering — is handled by the platform.

```
User ──► Chat Workspace ──► Agent Gateway ──► Your Agentic System
                ▲                                      │
                └──────────── Event Bus ◄──────────────┘
```

Your system receives user intent, executes work, and communicates back through events. The platform handles everything the user sees.

---

## 2. Integration Model

### 2.1 What the platform does

- Maintains conversation threads and message history
- Tracks job lifecycle (scheduled → queued → running → waiting_for_input → completed / failed)
- Stores and renders artifacts (tables, charts, files, reports)
- Delivers notifications to the user
- Renders structured UI payloads (forms, cards, charts, tables)
- Manages user authentication and session state

### 2.2 What your agent system must do

- Accept an incoming turn (user message + context) and process it
- Emit structured events back to the platform via the event bus
- Return typed, versioned payloads — never raw HTML or unstructured strings
- Manage your own reasoning, planning, and tool execution internally

### 2.3 The single integration boundary

All communication flows through the **Agent Gateway**. You never call conversation, goal, job, or artifact services directly. The gateway is the only entry and exit point for your system.

---

## 3. Registering Your Agent Adapter

An **agent adapter** is a plugin that connects your agent runtime to the gateway. The platform discovers adapters through a plugin registry.

### 3.1 Plugin registration payload

```json
{
  "pluginType": "agent_adapter",
  "name": "my-agent-system",
  "version": "1.0.0",
  "description": "Personal assistant powered by MyAgent",
  "baseUrl": "https://your-agent-system.example.com",
  "authScheme": "bearer",
  "capabilities": ["text", "form_input", "file_processing", "scheduled_jobs"],
  "webhookUrl": "https://your-agent-system.example.com/events",
  "config": {}
}
```

### 3.2 Registration endpoint

```
POST /plugins/register
Authorization: Bearer <admin_token>
Content-Type: application/json
```

### 3.3 Per-tenant enablement

Once registered, your adapter must be explicitly enabled per tenant before it receives any traffic:

```
POST /tenants/{tenantId}/plugins/{pluginName}/enable
```

---

## 4. Agent Gateway Contract

### 4.1 Operations the platform calls on your system

Your agent system must implement the following HTTP endpoints or message consumers:

#### `POST /agent/turn`

Called when the user sends a message. Your system should begin processing and immediately return a job reference. All output is delivered asynchronously through events.

**Request:**
```json
{
  "conversationId": "conv_abc123",
  "userId": "user_xyz",
  "tenantId": "tenant_001",
  "userInput": {
    "text": "Prepare my daily workflow summary for today",
    "attachments": []
  },
  "context": {
    "goals": [
      {
        "id": "goal_001",
        "title": "Daily Workflow Summary",
        "description": "Summarize completed and pending tasks each morning"
      }
    ],
    "settings": {
      "agenticSystemGoal": "Act as a personal productivity assistant",
      "dailyWorkflow": "Morning briefing at 9 AM, task review at 5 PM"
    },
    "recentMessages": [
      {
        "source": "user",
        "text": "What did I complete yesterday?",
        "createdAt": "2026-03-13T08:55:00Z"
      }
    ]
  }
}
```

**Response (synchronous acknowledgement only):**
```json
{
  "jobId": "job_789",
  "status": "accepted"
}
```

---

#### `POST /agent/goal`

Called when the user creates or updates a persistent goal or system-level rule from settings.

**Request:**
```json
{
  "conversationId": "conv_abc123",
  "userId": "user_xyz",
  "goal": {
    "id": "goal_001",
    "title": "Daily Workflow Summary",
    "description": "Summarize completed and pending tasks every morning at 9 AM",
    "type": "scheduled",
    "schedule": "0 9 * * *"
  }
}
```

---

#### `POST /agent/jobs/{jobId}/input`

Called when the user submits a form in response to a `job.waiting_for_input` event.

**Request:**
```json
{
  "jobId": "job_789",
  "formResponse": {
    "dateRange": "2026-03-01/2026-03-14",
    "includeWeekends": false
  },
  "attachments": []
}
```

---

#### `POST /agent/jobs/{jobId}/cancel`

Called when the user cancels a running or scheduled job.

---

#### `GET /agent/jobs/{jobId}`

Called when the platform needs to sync the latest state of a job from your system.

---

### 4.2 Events your system must emit

Your system communicates all output and state changes by publishing events to the platform's event bus. The platform consumes these events to update conversations, jobs, notifications, and artifacts.

#### Event envelope

Every event must follow this structure:

```json
{
  "eventType": "turn.delta",
  "version": "1.0",
  "jobId": "job_789",
  "conversationId": "conv_abc123",
  "tenantId": "tenant_001",
  "timestamp": "2026-03-14T09:00:01Z",
  "payload": {}
}
```

---

#### Turn events (streaming response)

| Event | Description |
|---|---|
| `turn.started` | Agent has begun processing the user turn |
| `turn.delta` | Incremental token or chunk for streaming text |
| `turn.completed` | Agent turn is fully complete |

**`turn.delta` payload:**
```json
{
  "delta": "Here is your daily summary for March 14th..."
}
```

**`turn.completed` payload:**
```json
{
  "finalText": "Here is your daily summary for March 14th...",
  "jobId": "job_789"
}
```

---

#### Job lifecycle events

| Event | Description |
|---|---|
| `job.created` | A new background job was created by your system |
| `job.scheduled` | Job is scheduled for future execution |
| `job.started` | Job execution has begun |
| `job.progress` | Progress update during execution |
| `job.waiting_for_input` | Job is paused and needs user input |
| `job.completed` | Job finished successfully |
| `job.failed` | Job failed with an error |

**`job.progress` payload:**
```json
{
  "percent": 45,
  "statusMessage": "Fetching tasks from integrations..."
}
```

**`job.waiting_for_input` payload:**
```json
{
  "formSchema": {
    "type": "object",
    "properties": {
      "dateRange": { "type": "string", "format": "date-range" },
      "includeWeekends": { "type": "boolean" }
    },
    "required": ["dateRange"]
  },
  "uiSchema": {
    "dateRange": { "ui:widget": "dateRangePicker" }
  },
  "prompt": "Please select the date range for your report."
}
```

**`job.failed` payload:**
```json
{
  "errorCode": "INTEGRATION_TIMEOUT",
  "errorMessage": "Could not reach the task management integration.",
  "retryable": true
}
```

---

#### Artifact events

| Event | Description |
|---|---|
| `artifact.created` | Your system has produced a deliverable |

**`artifact.created` payload (table example):**
```json
{
  "artifactId": "art_001",
  "title": "Daily Summary — March 14",
  "type": "table",
  "version": "1.0",
  "payload": {
    "columns": [
      { "key": "task", "label": "Task" },
      { "key": "status", "label": "Status" },
      { "key": "due", "label": "Due" }
    ],
    "rows": [
      { "task": "Review PRs", "status": "Completed", "due": "2026-03-14" },
      { "task": "Prepare report", "status": "In Progress", "due": "2026-03-14" }
    ],
    "capabilities": {
      "sort": true,
      "filter": true,
      "paginate": false,
      "export": ["csv"]
    }
  }
}
```

**`artifact.created` payload (chart example):**
```json
{
  "artifactId": "art_002",
  "title": "Task Completion Trend",
  "type": "chart",
  "version": "1.0",
  "payload": {
    "kind": "bar",
    "title": "Tasks completed this week",
    "x": ["Mon", "Tue", "Wed", "Thu", "Fri"],
    "series": [
      { "name": "Completed", "data": [5, 8, 3, 7, 6] }
    ]
  }
}
```

---

#### Notification events

| Event | Description |
|---|---|
| `notification.created` | Your system wants to notify the user of something |

**`notification.created` payload:**
```json
{
  "category": "success",
  "title": "Daily summary ready",
  "body": "Your March 14th workflow summary has been prepared.",
  "jobId": "job_789",
  "artifactId": "art_001"
}
```

Notification categories: `informational` | `success` | `action_required` | `warning` | `failure`

---

## 5. Message Payload Types Reference

All messages your system sends into a conversation must use typed, versioned payloads. The platform validates every payload before rendering.

| Type | Use Case |
|---|---|
| `text` | Plain or markdown response text |
| `notification` | Status update or alert card |
| `goal_update` | Confirmation of goal creation or change |
| `job_status` | Live job progress card |
| `form_request` | Inline form for user input |
| `table` | Sortable, filterable tabular data |
| `chart` | Visual data summary |
| `file` | Downloadable file reference |
| `image` | Inline image reference |
| `action_prompt` | Card with one or more user actions |
| `error` | Structured error with optional retry |
| `system_event` | Platform-level status message |

**Never** return raw HTML, inline scripts, or unstructured markup. Any payload that does not conform to a known versioned schema will be rejected.

---

## 6. User Settings & Persistent Goals Context

Users can define persistent behavioral rules in the settings panel — for example, an **Agentic System Goal** or a **Daily Workflow** directive. These are injected automatically into every `turn` request your system receives under the `context.settings` field.

Your system should treat these as persistent instructions that apply to every interaction for that user, not just the current turn.

**Example settings context:**
```json
{
  "context": {
    "settings": {
      "agenticSystemGoal": "Act as my personal productivity assistant. Prioritize focus time and reduce interruptions.",
      "dailyWorkflow": "Start each morning with a task review. Flag overdue items. End of day send a completion summary.",
      "timezone": "Asia/Kolkata",
      "preferredLanguage": "en"
    }
  }
}
```

You are expected to honor these rules consistently across all sessions.

---

## 7. Authentication

### Platform → Your System

The platform authenticates calls to your agent system using a bearer token issued during adapter registration. Include your verification logic in your adapter.

```
Authorization: Bearer <platform_issued_token>
```

### Your System → Event Bus

Events published to the platform event bus must be signed with your adapter credentials:

```
X-Agent-Adapter: my-agent-system
X-Adapter-Signature: <HMAC-SHA256 of payload>
```

Contact the platform operator for your adapter credentials and the event bus endpoint.

---

## 8. Realtime Event Delivery

The platform supports two patterns for receiving events from your system:

### Option A — Webhook push (recommended)

Your system POSTs events to the platform's event ingestion endpoint as they occur:

```
POST /events/ingest
Authorization: Bearer <adapter_token>
Content-Type: application/json

{ ...event envelope... }
```

### Option B — Message broker subscription

If you use a shared message broker (Kafka, RabbitMQ, or similar), publish events to the agreed topic and the platform will consume them. Contact the platform operator to configure broker access.

---

## 9. End-to-End Integration Walkthrough

This walkthrough shows a complete personal assistant interaction: a user asking for their daily workflow summary.

### Step 1 — User sends a message

The user types: _"What's on my plate today?"_

Platform calls `POST /agent/turn` with the user message and their settings context (including any configured Daily Workflow directive).

### Step 2 — Your system acknowledges

Return `{ "jobId": "job_789", "status": "accepted" }` immediately. Do not block on processing.

### Step 3 — Emit `turn.started`

```json
{ "eventType": "turn.started", "jobId": "job_789", "conversationId": "conv_abc123", ... }
```

### Step 4 — Stream the response

Emit a series of `turn.delta` events with incremental text as your system generates it. The platform streams these tokens directly into the chat timeline.

### Step 5 — Emit `job.created` for background work

If your system kicks off a background task (e.g., fetching from integrations):

```json
{ "eventType": "job.created", "payload": { "jobType": "daily_summary", "label": "Fetching today's tasks" } }
```

### Step 6 — Emit `job.progress` updates

```json
{ "eventType": "job.progress", "payload": { "percent": 60, "statusMessage": "Aggregating calendar and task data..." } }
```

### Step 7 — Emit `artifact.created` with the result

When the summary is ready, emit an artifact (e.g., a table of today's tasks). The platform stores it, renders it inline, and links it to the job.

### Step 8 — Emit `turn.completed` and `notification.created`

```json
{ "eventType": "turn.completed", ... }
{ "eventType": "notification.created", "payload": { "category": "success", "title": "Your daily summary is ready" } }
```

The platform marks the job complete, shows the notification, and closes the streaming turn.

---

## 10. Error Handling

| Scenario | What to do |
|---|---|
| Your system is temporarily unavailable | The platform retains job visibility. Sync state when you recover via `GET /agent/jobs/{jobId}` responses or by re-emitting events. |
| A job fails permanently | Emit `job.failed` with `retryable: false` and a human-readable `errorMessage`. |
| A payload fails schema validation | The platform will reject it and emit a `system_event` error to the conversation. Fix the payload version or structure. |
| A form submission arrives for an already-completed job | Return a `409 Conflict` response to the platform's `POST /agent/jobs/{jobId}/input` call. |

---

## 11. Integration Checklist

Before going live:

- [ ] Agent adapter registered and enabled for the target tenant
- [ ] `POST /agent/turn` endpoint implemented and returns `jobId` synchronously
- [ ] All job lifecycle events (`created`, `started`, `progress`, `completed`, `failed`) are emitted correctly
- [ ] `turn.delta` streaming is implemented for real-time response display
- [ ] `job.waiting_for_input` includes a valid JSON Schema for form rendering
- [ ] All artifact payloads use a known type (`table`, `chart`, `file`, `text`) with a `version` field
- [ ] No raw HTML or unstructured markup is ever returned
- [ ] `context.settings` (user goals and workflow rules) are read and honored
- [ ] Webhook authentication is configured (HMAC signature or bearer token)
- [ ] Error cases emit `job.failed` with a user-readable message
- [ ] Integration tested end-to-end with a real conversation turn

---

## 12. Quick Reference

### Platform → Agent endpoints

| Operation | Method | Path |
|---|---|---|
| New conversation turn | POST | `/agent/turn` |
| Set or update goal | POST | `/agent/goal` |
| Submit form input | POST | `/agent/jobs/{jobId}/input` |
| Cancel job | POST | `/agent/jobs/{jobId}/cancel` |
| Get job state | GET | `/agent/jobs/{jobId}` |

### Agent → Platform events

| Event | Trigger |
|---|---|
| `turn.started` | Agent begins processing |
| `turn.delta` | Streaming token chunk |
| `turn.completed` | Full response complete |
| `job.created` | Background job initiated |
| `job.scheduled` | Job queued for future execution |
| `job.started` | Execution begins |
| `job.progress` | Intermediate progress update |
| `job.waiting_for_input` | Job paused, needs user input |
| `job.completed` | Job succeeded |
| `job.failed` | Job failed |
| `artifact.created` | Output ready for the user |
| `notification.created` | Alert or status notification |

---

## 13. Support & Resources

- Architecture reference: `pluggable_agent_chat_architecture.md`
- Feature specification: `specs/001-agent-chat-workspace/spec.md`
- Platform API base: `/api/v1`
- Event ingestion endpoint: `/events/ingest`
- Plugin registration: `POST /plugins/register`

For integration support, contact the platform operator or open an issue on the project repository.
