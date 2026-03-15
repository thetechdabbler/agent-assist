# Backend runs from monorepo root so workspace deps (shared-types, plugin-sdk) resolve.
# Use Debian-based image and install OpenSSL so Prisma engine can load (required for migrate deploy).
FROM node:22-bookworm-slim
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend ./backend
COPY packages ./packages
COPY scripts/docker-backend-entrypoint.sh ./backend/entrypoint.sh

RUN chmod +x ./backend/entrypoint.sh && \
pnpm install --frozen-lockfile && \
    cd backend && npx prisma generate && cd /app && \
    pnpm --filter shared-types build && \
    pnpm --filter plugin-sdk build && \
    pnpm --filter backend build

WORKDIR /app/backend
EXPOSE 4000
ENTRYPOINT ["/app/backend/entrypoint.sh"]
