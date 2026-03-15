# Research: Agent Chat Examples

**Feature**: 002-agent-chat-examples  
**Phase**: 0 — Outline & Research

## 1. Dedicated agent conversation model

**Decision**: Bind a conversation to an agent by adding an optional `agentId` (plugin ID) on the Conversation entity. When set, the conversation is a dedicated thread/channel with that agent only; the gateway resolves the adapter by this ID and runs that adapter for every turn in that conversation.

**Rationale**: Reuses existing Conversation and message pipeline; no new entity. Aligns with “dedicated thread or channel” and “list of agents by display name” (user picks an agent, we create a conversation with `agentId` set).

**Alternatives considered**:
- Separate “AgentChannel” entity: rejected to avoid duplicating message/list semantics and to keep one conversation model.
- No binding (single default agent per tenant): rejected because the spec requires multiple example agents and explicit selection by display name.

---

## 2. Listing example agents (display name, dev/local only)

**Decision**: Expose a **list example agents** API that returns enabled `agent_adapter` plugins for the tenant, filtered so that only “example” agents are included and only when the app is running in a non-production or local environment. Display name comes from plugin metadata (e.g. `configJson.displayName` or a new `displayName` field on PluginRegistry). Each item includes at least: id (pluginId), displayName, pluginName.

**Rationale**: Spec requires “list by display name” and “example agents available only in non-production or local”. Reusing PluginRegistry and TenantPlugin keeps one source of truth; env check and optional “example” flag in config or plugin name convention (e.g. `example-*`) keeps production safe.

**Alternatives considered**:
- Hard-coded list in frontend: rejected so that adding/removing example agents is backend-driven and consistent with plugin registry.
- Separate “ExampleAgent” table: rejected to avoid duplicating plugin metadata; registry + config is sufficient.

---

## 3. Integration contract supporting in-process and out-of-process

**Decision**: Keep the existing **IAgentAdapter** contract (startTurn, optional submitFormInput, getHealth, getCapabilities). In-process example agents are adapter implementations registered in the same process (e.g. a built-in “echo” adapter). Out-of-process agents use the existing HTTP adapter pattern (external service). The **same** conversation and gateway flow apply: gateway resolves adapter by `conversation.agentId`, calls `adapter.startTurn(ctx)`; no difference to the chat system whether the adapter runs in-process or over HTTP.

**Rationale**: Spec requires the contract to support both deployment models. Current design already abstracts over the adapter; we only add “resolve by pluginId” and ensure at least one example is runnable (in-process or HTTP) with documented contract.

**Alternatives considered**:
- Two separate contracts for in-process vs HTTP: rejected to keep one contract and one gateway path.
- Mandate only in-process: rejected; spec explicitly allows either.

---

## 4. At least one example agent (behavior)

**Decision**: Ship at least one example agent that completes a well-defined task (e.g. **echo** or **simple Q&A**). Prefer an **in-process echo adapter** for the first example: no external service, minimal config, easy to run in dev/local and to copy as a reference. Document the contract (inputs, outputs, registration) in quickstart and, if needed, in a short README next to the example adapter.

**Rationale**: Spec requires “at least one” and “consistent, defined behavior” for verification. Echo is the smallest viable example; optional second example (e.g. FAQ or HTTP-based) can follow the same contract.

**Alternatives considered**:
- Only HTTP-based example: would require running an external service for every dev; in-process echo is simpler for “run and see”.
- Multiple examples in v1: one is sufficient per spec; more can be added later.

---

## 5. Plugin registry: multiple agent adapters per tenant

**Decision**: Extend the plugin model so a tenant can have **multiple** enabled `agent_adapter` plugins (e.g. “echo”, “http”). Today `getAgentAdapter(tenantId)` returns a single adapter (findFirst); add **listAgentAdapters(tenantId)** returning all enabled agent adapters with id and display name, and **getAgentAdapterByPluginId(tenantId, pluginId)** for the gateway. Example agents are the subset of these that are marked as example and shown only in dev/local.

**Rationale**: Enables “list of agents by display name” and “select one to start dedicated conversation” without changing the constitution (still one adapter interface, versioned, plugin-based).

**Alternatives considered**:
- One adapter that multiplexes by “agent key” in context: possible but pushes agent identity into adapter logic and complicates the contract; multiple plugins are clearer and already supported by the schema (TenantPlugin is many-to-many per tenant).
