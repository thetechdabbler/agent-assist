# Data Model: Agent Chat Workspace

**Branch**: `001-agent-chat-workspace` | **Date**: 2026-03-14
**Source**: Derived from `spec.md` functional requirements and `pluggable_agent_chat_architecture.md` section 9.

---

## Entity Overview

```
User ──< Conversation >──< Message
              │               └──< Attachment
              │
              ├──< Goal
              │
              └──< Job >──< Artifact
                    │
                    └── (triggers) Notification ──> User
```

---

## Entities

### users

Managed by NextAuth. Minimal record stored locally for foreign key integrity and tenant scoping.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| email | text UNIQUE NOT NULL | |
| name | text | |
| tenant_id | uuid NOT NULL FK → tenants | Tenant isolation |
| created_at | timestamptz NOT NULL | |
| updated_at | timestamptz NOT NULL | |

---

### tenants

Top-level isolation boundary. All other entities are scoped to a tenant.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | text NOT NULL | |
| slug | text UNIQUE NOT NULL | Used in API paths |
| config_json | jsonb | Tenant-level configuration |
| created_at | timestamptz NOT NULL | |
| updated_at | timestamptz NOT NULL | |

---

### conversations

A conversation thread between a user and the agent system.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| title | text | Auto-generated or user-set |
| owner_user_id | uuid NOT NULL FK → users | |
| tenant_id | uuid NOT NULL FK → tenants | |
| active_goal_id | uuid FK → goals | Nullable |
| status | text NOT NULL | `active` \| `archived` |
| created_at | timestamptz NOT NULL | |
| updated_at | timestamptz NOT NULL | |

**Indexes**: `(owner_user_id, status)`, `(tenant_id, status)`

---

### messages

Individual items in a conversation timeline. Both user and agent messages.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| conversation_id | uuid NOT NULL FK → conversations | |
| source_type | text NOT NULL | `user` \| `agent` \| `system` |
| type | text NOT NULL | See message types below |
| version | text NOT NULL | Contract version (e.g. `1.0`) |
| payload_json | jsonb NOT NULL | Validated structured payload |
| correlation_id | uuid | Traces a turn across services |
| created_at | timestamptz NOT NULL | |

**Message types**: `text`, `notification`, `goal_update`, `job_status`, `form_request`, `table`, `chart`, `file`, `image`, `action_prompt`, `error`, `system_event`

**Indexes**: `(conversation_id, created_at)`, `(correlation_id)`

---

### attachments

Files and images attached to user messages.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| conversation_id | uuid NOT NULL FK → conversations | |
| message_id | uuid NOT NULL FK → messages | |
| storage_key | text NOT NULL | S3 object key |
| filename | text NOT NULL | |
| mime_type | text NOT NULL | |
| size_bytes | bigint NOT NULL | |
| malware_scan_status | text NOT NULL | `pending` \| `clean` \| `quarantined` |
| metadata_json | jsonb | |
| created_at | timestamptz NOT NULL | |

---

### goals

Unified entity for both persistent user intent (US4) and agentic system directives (FR-016). The `goal_type` discriminator distinguishes the two sub-types. `directive` goals are injected as context on every agent turn; `scheduled` goals are recurring jobs driven by the `schedule` cron expression.

> **Note**: There is no separate `user_settings` table. Directive-style settings (agentic system goal, daily workflow) are stored as `goal_type = 'directive'` goals belonging to the user.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid NOT NULL FK → users | |
| tenant_id | uuid NOT NULL FK → tenants | |
| conversation_id | uuid FK → conversations | Origin conversation; nullable |
| goal_type | text NOT NULL | `directive` \| `scheduled` |
| title | text NOT NULL | |
| description | text | |
| status | text NOT NULL | `active` \| `completed` \| `cancelled` |
| schedule | text | Cron expression; only used when `goal_type = 'scheduled'` |
| metadata_json | jsonb | |
| created_at | timestamptz NOT NULL | |
| updated_at | timestamptz NOT NULL | |

**Indexes**: `(user_id, status)`, `(tenant_id, status)`, `(user_id, goal_type)` where `goal_type = 'directive'`

---

### jobs

Every background execution tracked through a defined lifecycle.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| conversation_id | uuid NOT NULL FK → conversations | |
| goal_id | uuid FK → goals | Nullable |
| tenant_id | uuid NOT NULL FK → tenants | |
| external_job_ref | text | Reference ID in the external agent system |
| job_type | text NOT NULL | Descriptor from agent system |
| status | text NOT NULL | See lifecycle below |
| priority | integer NOT NULL DEFAULT 5 | 1 = highest |
| schedule_at | timestamptz | For scheduled jobs |
| started_at | timestamptz | |
| completed_at | timestamptz | |
| progress_percent | integer | 0–100 |
| input_ref | uuid FK → artifacts | Form input stored as artifact |
| result_ref | uuid FK → artifacts | Primary output artifact |
| error_code | text | |
| error_summary | text | Human-readable error description |
| retry_count | integer NOT NULL DEFAULT 0 | |
| metadata_json | jsonb | |
| created_at | timestamptz NOT NULL | |
| updated_at | timestamptz NOT NULL | |

**Job lifecycle state machine**:
```
scheduled → queued → running → waiting_for_input ⟶ running
                              ↓                         ↓
                           failed                   completed
```

**Indexes**: `(conversation_id, status)`, `(tenant_id, status)`, `(goal_id)`, `(schedule_at)` where status = `scheduled`

---

### artifacts

Outputs produced by jobs — tables, charts, files, images, reports.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| job_id | uuid NOT NULL FK → jobs | |
| conversation_id | uuid NOT NULL FK → conversations | |
| tenant_id | uuid NOT NULL FK → tenants | |
| artifact_type | text NOT NULL | `table` \| `chart` \| `file` \| `image` \| `text` |
| title | text NOT NULL | |
| version | integer NOT NULL DEFAULT 1 | Incremented on update |
| storage_uri | text | For file/image types |
| payload_json | jsonb | For table/chart/text types |
| preview_json | jsonb | Thumbnail/summary for search results |
| schema_version | text NOT NULL | Contract version of payload_json |
| metadata_json | jsonb | |
| created_at | timestamptz NOT NULL | |

**Indexes**: `(job_id)`, `(conversation_id)`, `(tenant_id, artifact_type)`, `(created_at)`

---

### notifications

First-class notification records with full lifecycle tracking.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid NOT NULL FK → users | |
| tenant_id | uuid NOT NULL FK → tenants | |
| conversation_id | uuid FK → conversations | |
| job_id | uuid FK → jobs | |
| artifact_id | uuid FK → artifacts | |
| category | text NOT NULL | `informational` \| `success` \| `action_required` \| `warning` \| `failure` |
| title | text NOT NULL | |
| body | text | |
| is_read | boolean NOT NULL DEFAULT false | |
| delivered_at | timestamptz | |
| acknowledged_at | timestamptz | |
| created_at | timestamptz NOT NULL | |

**Indexes**: `(user_id, is_read)`, `(tenant_id)`

---

### plugin_registry

All registered plugins across all types.

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| plugin_type | text NOT NULL | `agent_adapter` \| `renderer` \| `notification` \| `storage` \| `auth_policy` \| `search` |
| plugin_name | text NOT NULL | |
| version | text NOT NULL | MAJOR.MINOR |
| contract_version | text NOT NULL | Version of the interface contract this plugin implements |
| status | text NOT NULL | `active` \| `degraded` \| `disabled` |
| config_json | jsonb | |
| health_last_checked_at | timestamptz | |
| created_at | timestamptz NOT NULL | |
| updated_at | timestamptz NOT NULL | |

**Unique**: `(plugin_type, plugin_name)`

---

### tenant_plugins

Per-tenant plugin enablement (constitution Principle II).

| Column | Type | Notes |
|---|---|---|
| tenant_id | uuid NOT NULL FK → tenants | |
| plugin_id | uuid NOT NULL FK → plugin_registry | |
| enabled | boolean NOT NULL DEFAULT false | |
| config_override_json | jsonb | Tenant-specific config overrides |
| enabled_at | timestamptz | |

**PK**: `(tenant_id, plugin_id)`

---

### audit_log

Append-only log for job state transitions and artifact access (constitution Security Requirements).

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| tenant_id | uuid NOT NULL | |
| user_id | uuid | Nullable for system events |
| event_type | text NOT NULL | e.g. `job.status_changed`, `artifact.accessed` |
| entity_type | text NOT NULL | `job` \| `artifact` \| `conversation` |
| entity_id | uuid NOT NULL | |
| before_state | text | |
| after_state | text | |
| correlation_id | uuid | |
| ip_address | inet | |
| metadata_json | jsonb | |
| created_at | timestamptz NOT NULL | |

**Indexes**: `(entity_id, entity_type)`, `(tenant_id, created_at)`, `(correlation_id)`

---

## Ephemeral Storage (Redis — not persisted to PostgreSQL)

### handoff_tokens (FR-038)

Key: `handoff:<uuid>`
TTL: 90 seconds
Value:
```json
{
  "userId": "string",
  "conversationId": "string",
  "tenantId": "string",
  "createdAt": "ISO8601",
  "expiresAt": "ISO8601",
  "redeemed": false
}
```
Deleted immediately on redemption. Single-use enforced by atomic `GET` + `DEL`.

### session_tokens

Key: `session:<sessionId>`
TTL: Configurable (default 24 h)
Value: Serialised NextAuth session (userId, tenantId, deviceId, scopes)

---

## Search Index (OpenSearch)

### Indexed entities

| Index | Source | Key fields indexed |
|---|---|---|
| `conversations` | conversations table | title, owner_user_id, tenant_id, status |
| `messages` | messages table | payload_json.text, conversation_id, created_at |
| `goals` | goals table | title, description, user_id, status |
| `jobs` | jobs table | job_type, status, error_summary, conversation_id, created_at |
| `artifacts` | artifacts table | title, artifact_type, preview_json, conversation_id |

All documents include `tenant_id` for mandatory per-query tenant scoping.
