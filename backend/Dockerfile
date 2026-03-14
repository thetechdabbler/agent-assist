# Backend runs from monorepo root so workspace deps (shared-types, plugin-sdk) resolve.
FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend ./backend
COPY packages ./packages

RUN pnpm install --frozen-lockfile && \
    pnpm --filter shared-types build && \
    pnpm --filter plugin-sdk build && \
    pnpm --filter backend build && \
    cd backend && npx prisma generate

WORKDIR /app/backend
EXPOSE 4000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/server.js"]
