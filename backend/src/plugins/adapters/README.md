# Agent Adapters

This directory contains implementations of the **IAgentAdapter** contract used by the Agent Gateway to run agent turns.

## Integration contract

- **Input**: The gateway calls `adapter.startTurn(ctx)` with:
  - `conversationId`, `userId`, `tenantId`
  - `userInput`: `{ text?: string; attachments?: unknown[] }`
  - `context`: goals, directives, settings, recent messages
  - `correlationId`
- **Output**: Either an **async generator** (streaming) yielding chunks with `{ token?: string }` or `{ delta?: string }`, or a **Promise** with a single result. The gateway emits `message.token` and `message.complete` for streams; it persists and broadcasts messages.
- **Registration**: Adapters are registered by **plugin name** in `backend/src/plugins/registry.ts` via `registerAgentAdapter(pluginName, adapter)`. The same name must exist in the DB as a `PluginRegistry` row with `pluginType = 'agent_adapter'`, and be enabled per tenant in `TenantPlugin`.
- **Display name**: For the example agents list API, set `configJson.displayName` on the plugin row (e.g. in seed or admin) so the UI shows a friendly name.

## How to add a new agent

1. **Implement** the adapter in this directory (e.g. `my-agent.adapter.ts`) exporting a factory that returns `IAgentAdapter` (see `echo-agent.adapter.ts` or `http-agent-adapter.ts`).
2. **Register** it in `backend/src/plugins/registry.ts`:  
   `registerAgentAdapter('my-agent', createMyAgentAdapter());`
3. **Seed or admin**: Add a `PluginRegistry` row with `pluginType: 'agent_adapter'`, `pluginName: 'my-agent'`, and optionally `configJson: { displayName: 'My Agent' }`. Enable it for the tenant via `TenantPlugin`.
4. **Dedicated conversations**: Users create a conversation with `agentId` set to that plugin’s ID; the gateway resolves the adapter via `getAgentAdapterByPluginId(tenantId, agentId)`.

## Example adapters

- **echo-agent.adapter.ts**: In-process echo; yields the user’s text as the response. Reference for a minimal streaming adapter.
- **http-agent-adapter.ts**: Out-of-process; forwards turns to an external HTTP service. Reference for out-of-process integration.

Both support the same contract; the gateway does not distinguish in-process vs out-of-process.
