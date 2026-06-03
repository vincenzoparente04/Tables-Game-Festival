#!/usr/bin/env bash
# Runs the full test suite (incl. DB-backed integration tests) against a
# throwaway Postgres container. Requires Docker.
set -euo pipefail

CONTAINER=gf_itest_pg
PORT=5544

cleanup() { docker rm -f "$CONTAINER" >/dev/null 2>&1 || true; }
trap cleanup EXIT
cleanup

docker run -d --name "$CONTAINER" \
  -e POSTGRES_PASSWORD=test -e POSTGRES_USER=test -e POSTGRES_DB=testdb \
  -p "$PORT:5432" postgres:16-alpine >/dev/null

export DATABASE_URL="postgres://test:test@localhost:$PORT/testdb"

echo "Waiting for Postgres..."
for _ in $(seq 1 30); do
  docker exec "$CONTAINER" pg_isready -U test >/dev/null 2>&1 && break
  sleep 1
done

npm run migrate
RUN_DB_TESTS=1 npx vitest run
