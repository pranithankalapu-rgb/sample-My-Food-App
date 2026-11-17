#!/usr/bin/env bash
# Test-only backend stack (docker-compose.apitest.yml).
#
#   ./scripts/apitest-stack.sh up     # create, seed from the real DB (read-only pg_dump), start
#   ./scripts/apitest-stack.sh down   # stop and delete it (its volumes only)
#   ./scripts/apitest-stack.sh status
#
# The real database is only read (pg_dump). The copy lives in a tmpfs
# Postgres and disappears with "down".

set -uo pipefail
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL="*"

HERE="$(cd "$(dirname "$0")/.." && { pwd -W 2>/dev/null || pwd; })"
cd "$HERE"
BACKEND_DIR="${BACKEND_DIR:-$(cd "$HERE/.." && { pwd -W 2>/dev/null || pwd; })}"
BACKEND_COMPOSE="$BACKEND_DIR/docker-compose.yml"

die() { printf '\nERROR: %s\n' "$*" >&2; exit 2; }
bc() { docker compose -f "$BACKEND_COMPOSE" "$@"; }
tc() { docker compose -f docker-compose.apitest.yml "$@"; }

health() {
  local id
  id="$(tc ps -q "$1" 2>/dev/null)"
  [ -n "$id" ] || { echo missing; return; }
  docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$id"
}

wait_healthy() {
  local deadline=$((SECONDS + ${2:-180}))
  for svc in $1; do
    until [ "$(health "$svc")" = "healthy" ]; do
      [ $SECONDS -lt $deadline ] || { tc logs --tail 40 "$svc"; die "$svc is not healthy (status: $(health "$svc"))"; }
      sleep 2
    done
  done
}

case "${1:-}" in
  up)
    docker image inspect myfoodapp-api:local >/dev/null 2>&1 || die "backend image myfoodapp-api:local not found (build the backend stack first)"
    docker image inspect myfoodapp-sample-frontend:local >/dev/null 2>&1 || docker compose build web || die "could not build the web image"
    echo "== starting db, mail, fault proxies"
    tc up -d certs mailpit db-t tox-off tox-ai || die "could not start the test stack"
    wait_healthy "db-t" 120

    DB_NAME="$(bc exec -T api printenv DB_NAME | tr -d '\r')"
    [ -n "$DB_NAME" ] || die "could not read DB_NAME from the backend api container"
    echo "== seeding db-t from a read-only pg_dump of '$DB_NAME'"
    tc exec -T db-t psql -U postgres -d postgres -qc "DROP DATABASE IF EXISTS myfoodapp WITH (FORCE)" >/dev/null &&
      tc exec -T db-t psql -U postgres -d postgres -qc "CREATE DATABASE myfoodapp" >/dev/null || die "could not reset db-t"
    bc exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -Fc --no-owner --no-acl -d "$1"' _ "$DB_NAME" \
      | tc exec -T db-t pg_restore -U postgres -d myfoodapp --no-owner --no-acl --exit-on-error \
      || die "seeding db-t failed"
    echo "   products in the copy: $(tc exec -T db-t psql -U postgres -d myfoodapp -Atc 'select count(*) from productdetails' | tr -d '\r')"

    echo "== copying product images into the test image storage"
    tc create api-t api-perf web-t >/dev/null 2>&1 || die "could not create the test API containers"
    docker run --rm -v myfoodapp_api_uploads:/from:ro -v myfoodapp-apitest_uploads_t:/to alpine:3.20 \
      sh -c 'rm -rf /to/* && cp -a /from/. /to/ && chown -R 1000:1000 /to' || die "copying images failed"

    echo "== starting api-t, api-perf, web-t"
    tc up -d api-t api-perf web-t || die "could not start the test APIs"
    wait_healthy "api-t api-perf" 180
    echo "test stack ready: api-t http://localhost:9598, api-perf :9599, web-t :4201, mailpit :8025"
    ;;
  down)
    tc down -v --remove-orphans
    ;;
  status)
    tc ps
    ;;
  *)
    echo "usage: $0 up|down|status" >&2
    exit 1
    ;;
esac
