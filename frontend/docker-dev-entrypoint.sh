#!/bin/sh
set -e
# Ensure frontend node_modules exists when using a volume (docker-compose.dev).
# pnpm install from monorepo root populates workspace deps.
cd /app
pnpm install --frozen-lockfile
cd /app/frontend
exec pnpm exec next dev -H 0.0.0.0 -p 3000
