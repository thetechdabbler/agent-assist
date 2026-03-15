# Frontend runs from monorepo root so workspace deps (shared-types, plugin-sdk) resolve.
FROM node:22-alpine
RUN corepack enable && corepack prepare pnpm@latest --activate
WORKDIR /app

# Build-time env for Next.js (NEXT_PUBLIC_*)
ARG NEXT_PUBLIC_API_URL=http://localhost:4000
ARG NEXT_PUBLIC_WS_URL=http://localhost:4000
ARG NEXTAUTH_URL=http://localhost:3000
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL \
    NEXT_PUBLIC_WS_URL=$NEXT_PUBLIC_WS_URL \
    NEXTAUTH_URL=$NEXTAUTH_URL

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY frontend ./frontend
COPY packages ./packages

RUN pnpm install --frozen-lockfile && \
    pnpm --filter shared-types build && \
    pnpm --filter plugin-sdk build && \
    pnpm --filter frontend build

WORKDIR /app/frontend
EXPOSE 3000
ENV HOSTNAME=0.0.0.0
# Bind all interfaces so the container is reachable from the host / other containers
CMD ["pnpm", "exec", "next", "start", "-H", "0.0.0.0", "-p", "3000"]
