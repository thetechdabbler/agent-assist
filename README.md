# agent-assist

**Agent Chat Workspace** — a multi-tenant web app where users chat with pluggable AI agents, run background jobs, get notifications, and attach files. The backend is **Fastify** + **Prisma** + **Socket.io**; the frontend is **Next.js 14** (App Router) + **NextAuth.js v5**.

---

## Table of contents

1. [What this system does](#what-this-system-does)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Run the full stack (Docker)](#run-the-full-stack-docker)
5. [Local development (Node on host)](#local-development-node-on-host)
6. [Configuration](#configuration)
7. [Using the application](#using-the-application)
8. [HTTP API overview](#http-api-overview)
9. [Realtime (WebSocket)](#realtime-websocket)
10. [Database & migrations](#database--migrations)
11. [Monorepo layout](#monorepo-layout)
12. [Scripts reference](#scripts-reference)
13. [Testing](#testing)
14. [Troubleshooting](#troubleshooting)
15. [Further documentation](#further-documentation)

---

## What this system does

| Area | Behavior |
|------|------------|
| **Chat** | Users create conversations, send messages, and receive streaming agent replies over Socket.io. |
| **Jobs** | Long-running work is modeled as **jobs** (scheduled → running → completed/failed). Users monitor them on a **Task Center** page. |
| **Notifications** | In-app notifications for job events, timeouts, etc., with a **notification center** in the UI. |
| **Files** | Message **attachments** are stored in S3-compatible storage (MinIO in dev). |
| **Multi-tenancy** | Requests carry a **tenant** context; data is isolated per tenant. |
| **Auth** | JWT-based API auth + NextAuth for the browser session; handoff flows for secondary devices (QR). |

---

## Architecture

```
┌─────────────┐     ┌─────────────┐     ┌──────────────┐
│  Next.js    │────▶│  Fastify    │────▶│  PostgreSQL  │
│  (port 3000)│     │  (port 4000)│     │  (Prisma)    │
└──────┬──────┘     └──────┬──────┘     └──────────────┘
       │                   │
       │ WebSocket         ├── Redis (sessions, Socket.io adapter)
       └───────────────────┤
                           ├── OpenSearch (search — when indexed)
                           └── MinIO / S3 (attachments)
```

**Packages in this repo**

| Package | Role |
|---------|------|
| `backend/` | REST API, Prisma, Socket.io, agent gateway, job/notification services |
| `frontend/` | Next.js UI: conversations, jobs, notifications |
| `packages/shared-types/` | Shared DTOs / entity shapes |
| `packages/plugin-sdk/` | Contracts for agent adapters and plugins |

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|--------|
| **Node.js** | 22 LTS | Required for local `pnpm` dev |
| **pnpm** | 9+ | `corepack enable && corepack prepare pnpm@latest --activate` |
| **Docker** | 24+ with Compose v2 | For Postgres, Redis, OpenSearch, MinIO, and optional full stack |
| **Git** | any | — |

**Linux (OpenSearch in Docker):** raise the virtual memory map limit once or OpenSearch may fail to start:

```bash
sudo sysctl -w vm.max_map_count=262144
echo 'vm.max_map_count=262144' | sudo tee -a /etc/sysctl.conf   # persist across reboots
```

**RAM:** plan for **~3 GB free** when running the full Docker stack (OpenSearch JVM ~512 MB + other services).

---

## Run the full stack (Docker)

This starts **PostgreSQL, Redis, OpenSearch, MinIO**, creates the dev **S3 bucket**, runs **migrations**, then **backend** and **frontend**, with health checks so services start in order.

### 1. Optional environment file

```bash
cp .env.docker.example .env
```

Edit `.env` if you want strong secrets or custom URLs (see [Configuration](#configuration)). Defaults are fine for **local-only** use.

### 2. Start everything

```bash
docker compose up --build -d
# or: pnpm docker:up
```

First run may take **several minutes** (image pulls, builds, OpenSearch cold start).

### 3. Verify

```bash
docker compose ps
docker compose logs -f backend    # migrations + server
```

### 4. URLs (localhost)

| Service | URL | Notes |
|---------|-----|--------|
| **Web app** | http://localhost:3000 | Next.js UI |
| **API** | http://localhost:4000 | REST + Socket.io on same host/port |
| **Health** | http://localhost:4000/health | JSON `{"status":"ok"}` |
| **Metrics** | http://localhost:4000/metrics | Prometheus format |
| **MinIO console** | http://localhost:9001 | User `minioadmin`, password `minioadmin` |
| **OpenSearch** | http://localhost:9200 | Dev: security plugin disabled |
| **Postgres** | `localhost:5432` | DB `agent_assist`, user/password `postgres` |

### 5. Stop / reset

```bash
docker compose down              # stop containers
docker compose down -v           # stop and delete volumes (full data wipe)
```

### Remote / LAN access

The browser must reach the API and WebSocket at the **same host/IP** you use for the app. Rebuild the frontend with public URLs:

```bash
NEXT_PUBLIC_API_URL=http://YOUR_IP:4000 NEXT_PUBLIC_WS_URL=http://YOUR_IP:4000 \
  NEXTAUTH_URL=http://YOUR_IP:3000 \
  docker compose build --no-cache frontend && docker compose up -d frontend
```

Set `CORS_ORIGIN` / backend env accordingly if needed.

---

## Local development (Node on host)

Useful when you want hot reload on backend/frontend without rebuilding images.

### 1. Install

```bash
git clone <repo-url> agent-assist
cd agent-assist
pnpm install
```

### 2. Infra only in Docker

```bash
docker compose up -d postgres redis opensearch minio
```

Create the MinIO bucket once (console at http://localhost:9001 or `mc mb local/agent-assist-dev` — see quickstart).

### 3. Env files

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env.local
```

Set `JWT_SECRET` and `NEXTAUTH_SECRET` to the **same** value in both files (32+ bytes, e.g. `openssl rand -hex 32`).

### 4. Migrations

```bash
pnpm --filter backend db:migrate
# optional: pnpm --filter backend db:seed
```

### 5. Run dev servers

```bash
pnpm dev
# or: pnpm --filter backend dev   +   pnpm --filter frontend dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:3000 |
| Backend | http://localhost:4000 |

---

## Configuration

### Backend (`backend/.env`)

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | yes | PostgreSQL connection string |
| `REDIS_URL` | yes | e.g. `redis://localhost:6379` |
| `JWT_SECRET` | yes | Signs API JWTs (`openssl rand -hex 32`) |
| `NEXTAUTH_SECRET` | yes | Must match frontend NextAuth secret |
| `NEXTAUTH_URL` | optional | Public app URL (OAuth callbacks) |
| `PORT` / `HOST` | optional | Default `4000` / `0.0.0.0` |
| `CORS_ORIGIN` | optional | Allowed browser origin (e.g. `http://localhost:3000`) |
| `OPENSEARCH_URL` | optional | Search indexing/query when wired |
| `S3_ENDPOINT`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET`, `S3_REGION` | optional* | Attachments / file storage (*required if you upload files) |
| `AGENT_GATEWAY_*` | optional | Timeouts and rate limits for the agent HTTP client |
| `AGENT_GATEWAY_URL` | optional | Base URL of external agent service |
| `LOG_LEVEL` | optional | `trace` … `error` |

Docker Compose injects the above for in-cluster hostnames (`postgres`, `redis`, `opensearch`, `minio`).

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXTAUTH_URL` | Same as browser origin |
| `NEXTAUTH_SECRET` | Same as backend `NEXTAUTH_SECRET` |
| `NEXT_PUBLIC_API_URL` | Backend HTTP base (e.g. `http://localhost:4000`) |
| `NEXT_PUBLIC_WS_URL` | Socket.io URL (usually same as API) |

### Docker Compose (repo root `.env`)

Optional; used when you `cp .env.docker.example .env`. Typical overrides: `JWT_SECRET`, `NEXTAUTH_SECRET`, `S3_BUCKET`, `CORS_ORIGIN`, `NEXT_PUBLIC_*`, `NEXTAUTH_URL`.

---

## Using the application

1. **Sign in** via NextAuth (configure providers in `frontend` as needed for your deployment).
2. **Conversations** — create a thread, send messages; agent responses can stream over the socket.
3. **Task Center** (`/jobs`) — list jobs, filter by status, open detail, retry/rerun failed jobs, link back to conversations.
4. **Notifications** — bell / notification center; marks read/ack when you interact.
5. **Handoff** — QR flow to move session to another device (see API/auth routes).

---

## HTTP API overview

Base URL: `http://localhost:4000` (dev).

**Unauthenticated (no JWT)**

| Method | Path | Purpose |
|--------|------|--------|
| GET | `/health` | Liveness |
| GET | `/metrics` | Prometheus metrics |

**Authenticated** (typically `Authorization: Bearer <jwt>` — plus tenant context as implemented)

| Area | Examples |
|------|----------|
| User | `GET /api/me` |
| Auth / handoff | see `auth.router` — handoff redeem, etc. |
| Conversations | create/list conversation, messages, post message, handoff QR |
| Attachments | upload to a message |
| Jobs | `GET /api/jobs`, `GET /api/jobs/:id`, retry/rerun/delete |
| Notifications | list, count, mark seen/ack |
| Admin | tenant config (e.g. upload limits) |

Exact paths and bodies follow the routers under `backend/src/api/`. See **`specs/001-agent-chat-workspace/contracts/`** for API contracts where defined.

---

## Realtime (WebSocket)

The client connects to the **same origin as `NEXT_PUBLIC_WS_URL`** (Socket.io). After auth, the socket joins **user** and **conversation** rooms. Events include message streaming (`message.token`, `message.complete`), job updates (`job.status_changed`), and notifications (`notification.created`).

---

## Database & migrations

- **ORM:** Prisma (`backend/prisma/schema.prisma`).
- **Apply migrations (local):** `pnpm --filter backend db:migrate`
- **Deploy migrations (Docker backend entrypoint):** `prisma migrate deploy` before `node dist/server.js`.
- **Studio:** `pnpm --filter backend db:studio`
- **Reset (destructive):** `pnpm --filter backend db:reset`

Main entities: **User, Tenant, Conversation, Message, Attachment, Goal, Job, Artifact, Notification**, audit and plugin registry tables — see `specs/001-agent-chat-workspace/data-model.md`.

---

## Monorepo layout

```text
agent-assist/
├── backend/                 # Fastify API, Prisma, services
├── frontend/                # Next.js App Router
├── packages/
│   ├── shared-types/
│   └── plugin-sdk/
├── scripts/                 # e.g. Docker backend entrypoint
├── docker-compose.yml
├── .env.docker.example
├── specs/001-agent-chat-workspace/   # plans, tasks, data model, quickstart
└── README.md                # this file
```

---

## Scripts reference

| Command | Description |
|---------|-------------|
| `pnpm install` | Install all workspace dependencies |
| `pnpm dev` | Backend + frontend dev servers |
| `pnpm build` | Build shared-types → plugin-sdk → backend → frontend |
| `pnpm test` | Backend + frontend unit tests |
| `pnpm lint` | ESLint across packages |
| `pnpm docker:up` | `docker compose up --build -d` |
| `pnpm docker:down` | `docker compose down` |
| `pnpm test:e2e` | Frontend E2E (Playwright) |
| `pnpm --filter backend db:migrate` | Prisma migrate (dev) |
| `pnpm --filter backend db:generate` | Regenerate Prisma Client |

---

## Testing

```bash
pnpm test
pnpm --filter backend test:integration   # needs Docker infra
pnpm --filter backend test:contract
pnpm test:e2e
```

---

## Troubleshooting

| Issue | What to try |
|-------|--------------|
| OpenSearch exits on Linux | `vm.max_map_count=262144` (see [Prerequisites](#prerequisites)) |
| Backend won’t start in Docker | `docker compose logs backend` — DB reachable? Migrations applied? |
| Frontend can’t reach API | `NEXT_PUBLIC_API_URL` / `NEXT_PUBLIC_WS_URL` must match how the **browser** reaches the host (not `backend:4000` from the browser). |
| MinIO upload fails | Bucket exists (`agent-assist-dev` by default); `S3_*` matches MinIO credentials |
| CORS errors | Set `CORS_ORIGIN` to the exact frontend origin (scheme + host + port) |
| “Secrets” errors | `JWT_SECRET` and `NEXTAUTH_SECRET` set and consistent across backend/frontend |

---

## Further documentation

| Doc | Content |
|-----|--------|
| `specs/001-agent-chat-workspace/quickstart.md` | Step-by-step local dev, MinIO bucket, seed, plugin registration |
| `specs/001-agent-chat-workspace/data-model.md` | Entities and relationships |
| `specs/001-agent-chat-workspace/tasks.md` | Implementation task list |
| `CLAUDE.md` | Repo conventions for AI assistants |

---

## License / security notes

- **Do not commit** real `.env` files or production secrets.
- Default Docker credentials (Postgres, MinIO, dev JWT/NEXTAUTH strings) are **for local development only** — change before any public or production deployment.
