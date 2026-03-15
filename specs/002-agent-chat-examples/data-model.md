# Data Model: Agent Chat Examples

**Feature**: 002-agent-chat-examples  
**Phase**: 1 — Design

This document describes **additions and changes** to the existing data model for example agents and dedicated agent conversations. Existing entities (Conversation, Message, PluginRegistry, TenantPlugin, etc.) remain as in the main schema unless noted.

## Entity changes

### Conversation (extended)

| Field       | Type    | Description |
|------------|---------|-------------|
| *existing* | ...     | id, title, ownerUserId, tenantId, activeGoalId, status, createdAt, updatedAt |
| **agentId** | UUID?   | **NEW** Optional. When set, this conversation is a dedicated thread/channel with the agent identified by this plugin ID. Must reference an enabled `agent_adapter` plugin for the same tenant. |

**Validation**:
- If `agentId` is set, it MUST reference a `PluginRegistry` row with `pluginType = 'agent_adapter'`, and that plugin MUST be enabled for the conversation’s tenant in `TenantPlugin`.
- Only one agent per conversation; no multi-agent threads in scope.

**State / lifecycle**: No new state transitions. Creating a conversation with `agentId` set implies “dedicated agent conversation”; creating without `agentId` keeps current default behavior (if any default agent exists for the tenant).

---

### PluginRegistry (extended for display name)

| Field       | Type   | Description |
|------------|--------|-------------|
| *existing* | ...    | id, pluginType, pluginName, version, contractVersion, status, configJson, healthLastCheckedAt, createdAt, updatedAt |
| **displayName** | String? | **NEW** Optional. Human-readable name shown in the UI list of agents (e.g. “Echo Agent”, “FAQ Bot”). If null, fallback to `pluginName` for display. |

**Alternative**: Store display name in `configJson.displayName` instead of a new column to avoid a migration; both are valid. Plan assumes one of: new column or configJson convention.

**Validation**:
- For `pluginType = 'agent_adapter'`, `displayName` (or config) should be set for example agents so the list API can return a user-friendly name.

---

## Unchanged entities (reference)

- **Message**: No change. Messages in an agent-dedicated conversation still have `sourceType` in { user, agent, system }; the agent adapter is determined by `conversation.agentId`.
- **TenantPlugin**: No schema change. Multiple plugins of type `agent_adapter` per tenant are already allowed (unique on tenantId + pluginId).
- **Job, Artifact, Goal, etc.**: No change for this feature.

## Relationships

- **Conversation.agentId** → PluginRegistry.id (optional FK). When present, all turns in that conversation are routed to the adapter for that plugin.
- List of “example agents” = PluginRegistry (pluginType = 'agent_adapter') joined with TenantPlugin (enabled = true) for the tenant, filtered by “example” and environment (dev/local), ordered by displayName/pluginName.

## Indexes

- **Conversation**: Add index on `(tenantId, agentId)` if we often query “conversations for agent X” or “agent conversations for tenant”. Optional for v1 if we only resolve agentId when loading a single conversation.

## Scale / assumptions

- Small number of example agents per tenant (single digits).
- Example agents are enabled only in non-production or local; production may have zero or more “real” agent adapters with the same schema.
