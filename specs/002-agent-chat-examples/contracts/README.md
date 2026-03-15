# Contracts: 002-agent-chat-examples

Versioned API and payload contracts for the Agent Chat Examples feature.

## APIs

### GET /api/example-agents

Returns the list of **example agents** available for the current tenant. Only populated in non-production or local environments; otherwise returns an empty list or the endpoint may be disabled.

- **Response**: [example-agents-list.v1.json](./example-agents-list.v1.json)  
- **Version**: 1.0

### POST /api/conversations (extended)

Create a conversation. Body may include optional **agentId** (UUID of an agent_adapter plugin) to create a **dedicated agent conversation**. When agentId is set, all turns in that conversation are routed to that agent.

- **Request body**: [conversation-create-body.v1.json](./conversation-create-body.v1.json)  
- **Version**: 1.0 (extends existing create contract)

## Existing contracts (unchanged)

- Message envelope, agent adapter interface, event bus, and renderer payloads remain as defined in `specs/001-agent-chat-workspace/contracts/`. This feature does not change those contracts.
