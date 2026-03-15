# Validation Checklist (Phase 9)

**Purpose**: T085 (SLA validation) and T086 (E2E validation) execution checklist. Run after full stack is up (Docker or host).

---

## T085 — Response time SLA validation

Use load-test tooling (e.g. k6, artillery, or custom scripts) and measure:

| Scenario | Requirement | How to validate |
|----------|-------------|-----------------|
| SC-001 | First agent response token ≤ 2 s p95 | Send message; measure time to first token over WebSocket or SSE. Run 20+ requests; compute p95. |
| SC-002 | Job state update visible ≤ 3 s | Trigger a job (e.g. form submit or agent job); poll or listen for status change; assert visible within 3 s. |
| SC-004 | Search results ≤ 3 s at 95th percentile | Execute keyword search repeatedly (e.g. 20+ queries); assert p95 latency ≤ 3 s. |

**Document results**: Record p95/p99 and any tuning (timeouts, connection pool, index settings) in this file or a separate SLA report.

---

## T086 — End-to-end validation

Execute and confirm:

### User story acceptance (spec.md)

1. **US1** — Start conversation, send message, receive agent reply in timeline.
2. **US2** — Create/view jobs in Task Center; status updates and retry/rerun.
3. **US3** — Form request appears; submit form (and optional file); job resumes.
4. **US4** — Create goal; link to job; see goal update cards in timeline.
5. **US5** — Table/chart/file/image artifacts render; download triggers audit.
6. **US6** — Search returns results; open conversation from result; highlight message; rerun job.

### quickstart.md scenarios

- Full stack Docker up; sign-in; create conversation; send message.
- Infra-only + host backend/frontend; same flow.

### Cross-cutting (spec FR)

| ID | Requirement | How to confirm |
|----|-------------|-----------------|
| FR-039 | Timeout auto-fail | Cause agent timeout; job transitions to failed. |
| FR-040 | First-wins 409 | Submit form twice; second receives 409 form_already_resolved. |
| FR-041 | Fail-fast error card | Cause adapter error; error card with message/code appears. |
| FR-042 | Upload limits 422 | Upload file over size limit; receive 422. |
| FR-043 | Replay buffer on reconnect | Disconnect socket; send message; reconnect; buffered messages appear. |
| FR-044 | Search unavailable banner + retry | Stop OpenSearch or return 503; banner and Retry button appear. |

---

**Status**: [ ] T085 executed and results documented  
**Status**: [ ] T086 executed and all items confirmed
