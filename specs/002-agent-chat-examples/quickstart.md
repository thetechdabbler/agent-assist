# Quickstart: Agent Chat Examples

**Feature**: 002-agent-chat-examples

## Prerequisites

- Node.js 22+, pnpm
- PostgreSQL and Redis (or use Docker: `pnpm docker:up:dev`)
- Backend and frontend from the agent-assist monorepo

## Run locally (dev)

1. **Start backend and frontend**  
   From repo root:  
   `pnpm dev`  
   (or start backend and frontend separately in two terminals).

2. **Ensure example agents are enabled**  
   Example agents are available only in **non-production or local** environments. The app uses `NODE_ENV !== 'production'` or an explicit flag (e.g. `ENABLE_EXAMPLE_AGENTS=true`) to show the list. Ensure your local backend is running with that condition so the list API returns at least one agent.

3. **Seed (if needed)**  
   Run `pnpm --filter backend db:seed` to create the default tenant, user, and at least one agent_adapter plugin (e.g. echo). The seed may be extended to register an “example” echo adapter with a display name.

## Use an example agent

1. **Open the chat UI** and sign in (e.g. dev@example.com with your auth setup).
2. **Open the list of agents** (e.g. “New conversation” or “Agents” entry point). You should see at least one agent by **display name** (e.g. “Echo Agent”).
3. **Select an agent** from the list. This creates a **dedicated conversation** with that agent (a new thread/channel).
4. **Send a message.** You should see:
   - A **loading state** (e.g. “Agent is thinking…” or spinner) while the agent is processing.
   - The **agent’s response** in the same thread, or an **error message** if the agent is unavailable.
5. **Verify** the example completes at least one task (e.g. echo echoes back; simple Q&A answers).

## Add a new example agent (reference)

To add another example agent that others can use as a reference:

1. **Implement the contract**  
   Implement the **IAgentAdapter** interface (see `specs/001-agent-chat-workspace/contracts/agent-adapter.v1.ts` or backend `plugins/registry.ts`): at minimum `startTurn(request)` returning a stream or promise; optionally `getHealth`, `getCapabilities`, `metadata` (including display name).

2. **Register the plugin**  
   - Add the adapter to the backend (e.g. under `backend/src/plugins/adapters/`).  
   - Register it in the plugin registry (DB): insert into `PluginRegistry` with `pluginType = 'agent_adapter'`, `pluginName`, and a display name (column or `configJson.displayName`).  
   - Enable it for the tenant via `TenantPlugin` and mark it as an example (e.g. config flag or naming convention).

3. **Expose in the list**  
   The **GET /api/example-agents** (or equivalent) endpoint returns enabled example agents for the tenant; your new plugin will appear in the list once enabled and when the app is in dev/local.

4. **Document**  
   Add a short note or README next to the adapter code describing the integration contract (inputs, outputs, registration) so developers can replicate the pattern for in-process or out-of-process agents.

## Integration contract (summary)

- **Input**: The chat system calls `adapter.startTurn(ctx)` with conversationId, userId, tenantId, userInput (text, attachments), context (goals, recent messages, etc.), and correlationId.
- **Output**: Stream (async generator) of tokens or structured payloads, or a single promise result. Message envelope and payload types are defined in the main workspace contracts; agents must return validated structured payloads (no raw HTML or script).
- **Registration**: Plugin in `PluginRegistry` with `pluginType = 'agent_adapter'`; enabled per tenant in `TenantPlugin`. Optional `displayName` for the UI list.
- **Dedicated conversation**: Create a conversation with `agentId` set to the plugin’s ID; all turns in that conversation are routed to that adapter.

For full contract details, see `specs/001-agent-chat-workspace/contracts/` and backend `gateway/agent-gateway.ts` and `plugins/registry.ts`.

## Validation (Echo agent)

1. From repo root: `pnpm dev` (backend + frontend).
2. `pnpm --filter backend db:seed` (creates default tenant, user, and Echo Agent plugin).
3. Sign in at the app (e.g. dev@example.com).
4. Open **Example agents** in the nav; you should see **Echo Agent** in the list.
5. Click **Echo Agent**; a new conversation opens.
6. Type a message (e.g. "Hello") and send. You should see "Agent is thinking…" then the same text echoed back.
7. If the agent is unavailable, you should see a clear error card in the chat (no hanging state).
