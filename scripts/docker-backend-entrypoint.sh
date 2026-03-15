#!/bin/sh
set -e
cd /app/backend || exit 1
# Migrations right after DB is ready (compose already waits for postgres healthy; retry briefly for slow disks)
n=0
until npx prisma migrate deploy; do
  n=$((n + 1))
  if [ "$n" -ge 12 ]; then
    echo "migrate deploy failed after 12 attempts"
    exit 1
  fi
  echo "migrate deploy retry $n..."
  sleep 3
done
exec node dist/server.js
