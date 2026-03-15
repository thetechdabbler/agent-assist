# Quickstart: Agent Chat Workspace (Local Development)

**Branch**: `001-agent-chat-workspace` | **Date**: 2026-03-14

---

## Prerequisites

| Tool | Version | Install |
|---|---|---|
| Node.js | 22 LTS | https://nodejs.org |
| pnpm | 9+ | `npm i -g pnpm` |
| Docker + Docker Compose | 27+ | https://docs.docker.com/get-docker |
| Git | any | — |

---

## 1. Clone and install

```bash
git clone <repo-url> agent-assist
cd agent-assist
pnpm install
```

---

## 2. Full stack in Docker (recommended for “it just runs”)

Brings up **Postgres, Redis, OpenSearch, MinIO, backend API, and frontend** with correct startup order and health checks.

**Prerequisites:** Docker 24+; on **Linux**, set `vm.max_map_count=262144` once (see repo `README.md`) or OpenSearch may exit.

```bash
# Optional: copy and set JWT/NEXTAUTH secrets (defaults are fine for local only)
cp .env.docker.example .env

docker compose up --build -d
```

First boot can take several minutes (image builds + OpenSearch). Check status:

```bash
docker compose ps
docker compose logs -f backend
```

| URL | Service |
|-----|--------|
| http://localhost:3000 | Web app |
| http://localhost:4000 | API |
| http://localhost:9001 | MinIO console (minioadmin / minioadmin) |

To stop: `docker compose down`. To reset data: `docker compose down -v`.

---

## 2b. Infrastructure only (Docker) — dev on host Node

If you run backend/frontend with `pnpm` on your machine and only want databases in Docker:

```bash
docker compose up -d postgres redis opensearch minio
```

Wait until healthy:

```bash
docker compose ps
```

This starts:
- **PostgreSQL 16** on port `5432`
- **Redis 7** on port `6379`
- **OpenSearch 2** on port `9200`
- **MinIO** (S3-compatible) on port `9000`, console on `9001`

Note: MinIO bucket `agent-assist-dev` is created by the full-stack compose (`minio-init`). For infra-only, create the bucket once (MinIO console → Buckets) or run `minio-init` once after MinIO is up.

---

## 3. Configure environment

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Key variables to set in `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/agent_assist"
REDIS_URL="redis://localhost:6379"
OPENSEARCH_URL="http://localhost:9200"
S3_ENDPOINT="http://localhost:9000"
S3_ACCESS_KEY="minioadmin"
S3_SECRET_KEY="minioadmin"
S3_BUCKET="agent-assist-dev"
JWT_SECRET="<generate with: openssl rand -hex 32>"
NEXTAUTH_SECRET="<generate with: openssl rand -hex 32>"
```

---

## 4. Run database migrations

```bash
pnpm --filter backend db:migrate
```

Optionally seed development data:

```bash
pnpm --filter backend db:seed
```

---

## 5. Create MinIO bucket

```bash
# Using the MinIO client (mc) or the console at http://localhost:9001
# Default credentials: minioadmin / minioadmin
mc alias set local http://localhost:9000 minioadmin minioadmin
mc mb local/agent-assist-dev
```

---

## 6. Start development servers

In separate terminals (or use the workspace script):

```bash
# Terminal 1 — backend (Fastify)
pnpm --filter backend dev

# Terminal 2 — frontend (Next.js)
pnpm --filter frontend dev
```

Or run both together:

```bash
pnpm dev
```

| Service | URL |
|---|---|
| Frontend | http://localhost:3000 |
| Backend API | http://localhost:4000 |
| Backend health | http://localhost:4000/health/ready |
| MinIO Console | http://localhost:9001 |
| OpenSearch | http://localhost:9200 |

---

## 7. Register a test agent adapter

For development, a mock agent adapter is available that echoes inputs and emits synthetic job events.

```bash
curl -X POST http://localhost:4000/plugins/register \
  -H "Authorization: Bearer <admin_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "pluginType": "agent_adapter",
    "name": "mock-agent",
    "version": "1.0.0",
    "baseUrl": "http://localhost:4001",
    "authScheme": "bearer",
    "capabilities": ["text", "form_input"]
  }'
```

Enable it for the default tenant:

```bash
curl -X POST http://localhost:4000/tenants/default/plugins/mock-agent/enable \
  -H "Authorization: Bearer <admin_token>"
```

---

## 8. Run tests

```bash
# Unit tests (backend + frontend)
pnpm test

# Integration tests (requires Docker infrastructure)
pnpm --filter backend test:integration

# Contract tests
pnpm --filter backend test:contract

# E2E tests
pnpm test:e2e
```

---

## Useful commands

| Command | Description |
|---|---|
| `pnpm dev` | Start all dev servers |
| `pnpm build` | Build all packages |
| `pnpm test` | Run unit tests |
| `pnpm --filter backend db:migrate` | Apply pending migrations |
| `pnpm --filter backend db:studio` | Open Prisma Studio |
| `pnpm --filter backend db:reset` | Reset dev database |
| `docker compose down -v` | Stop infrastructure and wipe volumes |

---

## Integrating Your Own Agent System

See `docs/agent-integration-guide.md` for the full integration contract, event reference, and step-by-step walkthrough.
