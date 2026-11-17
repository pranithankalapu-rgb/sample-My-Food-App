#!/usr/bin/env bash
# Every test, in Docker, against the running stack:
#
#   ./scripts/run-all-tests.sh [--label "Phase 3 baseline"] [--save-baseline] [--keep-test-stack]
#
#  1. checks the backend (db, api, cms) is healthy; builds and starts the web app
#  2. starts the test-only stack (docker-compose.apitest.yml): a throwaway copy
#     of the database, mailpit, and fault-injection proxies for Open Food Facts
#     and OpenAI
#  3. creates this run's dedicated users through the API (admins get the admin
#     role with a one-row UPDATE) and reads read-only fixtures from the database
#  4. unit tests, then the Vitest API tests (every endpoint), speed, accuracy
#  5. Playwright on every page + Lighthouse          -> e2e-report/before-restart
#  6. `docker compose restart` of the backend (volumes kept), Playwright again
#                                                   -> e2e-report/after-restart
#  7. always: deletes this run's users, removes the test stack
#  8. merges everything into test-results/results.json (Test Dashboard) and
#     writes docs/api-test-report.md, test-results/report.html, docs/examples/
#
# Exit code: 0 only if every test passed.

set -uo pipefail
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL="*"

HERE="$(cd "$(dirname "$0")/.." && { pwd -W 2>/dev/null || pwd; })"
cd "$HERE"
BACKEND_DIR="${BACKEND_DIR:-$(cd "$HERE/.." && { pwd -W 2>/dev/null || pwd; })}"
BACKEND_COMPOSE="$BACKEND_DIR/docker-compose.yml"
API_HOST_URL="${API_HOST_URL:-http://localhost:9595}"
TEST_API_HOST_URL="http://localhost:9598"
RUN_DIR="$HERE/.e2e-run"
LABEL="Test run"
SAVE_BASELINE=0
KEEP_STACK=0
while [ $# -gt 0 ]; do
  case "$1" in
    --label) LABEL="$2"; shift 2 ;;
    --save-baseline) SAVE_BASELINE=1; shift ;;
    --keep-test-stack) KEEP_STACK=1; shift ;;
    *) echo "unknown option $1" >&2; exit 1 ;;
  esac
done

log() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
die() { printf '\nERROR: %s\n' "$*" >&2; exit 2; }
bc() { docker compose -f "$BACKEND_COMPOSE" "$@"; }
tc() { docker compose -f docker-compose.apitest.yml "$@"; }
runner() { docker compose -f docker-compose.yml -f docker-compose.tests.yml --profile tests "$@"; }

health_of() {
  local id
  id="$(bc ps -q "$1" 2>/dev/null)"
  [ -n "$id" ] || { echo "missing"; return; }
  docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$id"
}
started_at() { docker inspect --format '{{.State.StartedAt}}' "$(bc ps -q "$1")"; }
wait_healthy() {
  local deadline=$((SECONDS + ${2:-240}))
  for svc in $1; do
    until [ "$(health_of "$svc")" = "healthy" ]; do
      [ $SECONDS -lt $deadline ] || die "$svc is not healthy (status: $(health_of "$svc"))"
      sleep 3
    done
  done
}

DB_NAME=""
# psql on the real database (SQL on stdin, variables name=value); used for
# read-only fixtures and the one-row admin promotion of this run's account
sql_real() {
  local args=() kv
  for kv in "$@"; do args+=(-v "$kv"); done
  bc exec -T db sh -c 'db="$1"; shift; psql -U "$POSTGRES_USER" -d "$db" -At -q -v ON_ERROR_STOP=1 "$@" -f -' _ "$DB_NAME" "${args[@]}"
}
sql_test() {
  local args=() kv
  for kv in "$@"; do args+=(-v "$kv"); done
  tc exec -T db-t psql -U postgres -d myfoodapp -At -q -v ON_ERROR_STOP=1 "${args[@]}" -f -
}

rand_hex() { head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'; }
json_field() { sed -n "s/.*\"$1\":\"\([^\"]*\)\".*/\1/p" | head -1; }

# ---------------------------------------------------------------- preflight
log "Backend health"
for svc in db api cms; do
  printf '  %-4s %s\n' "$svc" "$(health_of "$svc")"
  [ "$(health_of "$svc")" = "healthy" ] || die "backend service '$svc' is not healthy: start it with 'docker compose up -d' in $BACKEND_DIR"
done
[ "$(curl -s -o /dev/null -w '%{http_code}' "$API_HOST_URL/health")" = "200" ] || die "API health check failed"
DB_NAME="$(bc exec -T api printenv DB_NAME | tr -d '\r')"
BACKEND_COMMIT="$(git -C "$BACKEND_DIR/api_myfoodproductapp" rev-parse HEAD 2>/dev/null || echo unknown)"
FRONTEND_COMMIT="$(git rev-parse HEAD 2>/dev/null || echo unknown)"
RUN_ID="$(date +%Y%m%d%H%M%S)$(rand_hex 2)"
export RUN_ID
echo "  database $DB_NAME, backend $BACKEND_COMMIT, run $RUN_ID"

log "Web app: build (typecheck, lint, unit tests, build) and start"
docker compose up -d --build web || die "could not build/start the web app"
runner build tools e2e || die "could not build the test runner images"

log "Test-only stack"
./scripts/apitest-stack.sh up || die "could not start the test stack"

# ---------------------------------------------------------------- users
rm -rf "$RUN_DIR" && mkdir -p "$RUN_DIR"
rm -rf test-results/raw && mkdir -p test-results/raw
CREATED=()   # "base|email|password"

create_user() { # base email password first
  local status
  status=$(curl -s -o "$RUN_DIR/signup.json" -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
    -d "{\"first_name\":\"$4\",\"last_name\":\"Tester\",\"email\":\"$2\",\"password\":\"$3\",\"repassword\":\"$3\"}" "$1/user")
  [ "$status" = "201" ] || die "creating $2 on $1 failed: HTTP $status $(cat "$RUN_DIR/signup.json")"
  CREATED+=("$1|$2|$3")
  rm -f "$RUN_DIR/signup.json"
}

cleanup() {
  log "Cleanup: delete this run's users through the API"
  local entry base email pw body token id status
  for entry in "${CREATED[@]}"; do
    IFS='|' read -r base email pw <<<"$entry"
    body=$(curl -s -X POST -H 'Content-Type: application/json' -d "{\"email\":\"$email\",\"password\":\"$pw\"}" "$base/login")
    token=$(printf '%s' "$body" | json_field token)
    id=$(printf '%s' "$body" | sed -n 's/.*"user":{"id":"\([^"]*\)".*/\1/p' | head -1)
    if [ -z "$token" ] || [ -z "$id" ]; then echo "  $email: already gone"; continue; fi
    status=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE -H "x-access-token: $token" "$base/user/$id")
    echo "  $email: DELETE -> HTTP $status"
  done
  # accounts the tests signed up themselves on the real API are deleted by the
  # tests; report any that are still active
  local left
  left=$(sql_real "run_id=$RUN_ID" < scripts/sql/leftover-users.sql | tr -d '\r')
  echo "  active e2e accounts left on the real database from run $RUN_ID: $left"
  # server-side evidence for the report (the API logs no bodies, tokens or health data)
  mkdir -p test-results/raw
  tc logs --no-color --timestamps api-t api-perf > test-results/raw/logs-test-stack.txt 2>&1 || true
  bc logs --no-color --timestamps --since "$STARTED_AT" api > test-results/raw/logs-real-api.txt 2>&1 || true
  if [ "$KEEP_STACK" = "0" ]; then ./scripts/apitest-stack.sh down >/dev/null 2>&1 && echo "  test stack removed"; fi
}
trap cleanup EXIT

log "Users for run $RUN_ID"
R_USER="e2e-user-${RUN_ID}@example.test";  R_USER_PW="E2e-$(rand_hex 10)"
R_ADMIN="e2e-admin-${RUN_ID}@example.test"; R_ADMIN_PW="E2e-$(rand_hex 10)"
T_USER="e2e-tuser-${RUN_ID}@example.test";  T_USER_PW="E2e-$(rand_hex 10)"
T_ADMIN="e2e-admin-t${RUN_ID}@example.test"; T_ADMIN_PW="E2e-$(rand_hex 10)"
create_user "$API_HOST_URL" "$R_USER" "$R_USER_PW" "Eetwoe"
create_user "$API_HOST_URL" "$R_ADMIN" "$R_ADMIN_PW" "Admin"
create_user "$TEST_API_HOST_URL" "$T_USER" "$T_USER_PW" "Eetwoe"
create_user "$TEST_API_HOST_URL" "$T_ADMIN" "$T_ADMIN_PW" "Admin"
[ "$(sql_real "email=$R_ADMIN" < scripts/sql/promote-admin.sql | tr -d '\r' | grep -c .)" = "1" ] || die "could not promote $R_ADMIN"
[ "$(sql_test "email=$T_ADMIN" < scripts/sql/promote-admin.sql | tr -d '\r' | grep -c .)" = "1" ] || die "could not promote $T_ADMIN"
cat > "$RUN_DIR/creds.json" <<EOF
{"real":{"user":{"email":"$R_USER","password":"$R_USER_PW"},"admin":{"email":"$R_ADMIN","password":"$R_ADMIN_PW"}},
 "test":{"user":{"email":"$T_USER","password":"$T_USER_PW"},"admin":{"email":"$T_ADMIN","password":"$T_ADMIN_PW"}}}
EOF
echo "  real: $R_USER, $R_ADMIN (admin) · test stack: $T_USER, $T_ADMIN (admin)"

# Open Food Facts search allows only 10 calls a minute: one search per run
# gives every test that needs real-but-not-yet-stored barcodes its candidates
log "Open Food Facts barcode candidates (one search per run)"
# search.openfoodfacts.org (Search-a-licious); the classic /api/v2/search is
# often "temporarily unavailable" for automated clients
: > "$RUN_DIR/off-search.json"
for page in 1 2; do
  curl -s -m 60 -A "MyFoodApp-sample-frontend-tests/1.0" \
    "https://search.openfoodfacts.org/search?q=countries_tags:%22en:united-states%22&page_size=100&page=$page&fields=code,product_name&sort_by=-unique_scans_n" \
    >> "$RUN_DIR/off-search.json" || die "Open Food Facts search failed"
done
grep -q '"hits"' "$RUN_DIR/off-search.json" || die "Open Food Facts search did not return JSON: $(head -c 200 "$RUN_DIR/off-search.json")"
tr ',' '\n' < "$RUN_DIR/off-search.json" | sed -n 's/.*"code":"\([0-9]\{13\}\)".*/\1/p' | awk 'BEGIN{printf "["} {printf "%s\"%s\"", (NR>1?",":""), $1} END{print "]"}' > "$RUN_DIR/off-candidates.json"
echo "  $(tr ',' '\n' < "$RUN_DIR/off-candidates.json" | grep -c .) candidate barcodes"

write_fixtures() {
  local phase="$1" data
  mkdir -p "$RUN_DIR/$phase"
  data=$(sql_real < scripts/sql/fixtures.sql | tr -d '\r')
  [ "${data:0:1}" = "{" ] || die "could not read fixtures: $data"
  printf '{"runId":"%s","phase":"%s","user":{"email":"%s","password":"%s"},"admin":{"email":"%s","password":"%s"},"testUser":{"email":"%s","password":"%s"},"testAdmin":{"email":"%s","password":"%s"},%s\n' \
    "$RUN_ID" "$phase" "$R_USER" "$R_USER_PW" "$R_ADMIN" "$R_ADMIN_PW" "$T_USER" "$T_USER_PW" "$T_ADMIN" "$T_ADMIN_PW" "${data:1}" > "$RUN_DIR/$phase/fixtures.json"
}

snapshot() {
  local name="$1" counts files
  counts=$(sql_real < scripts/sql/counts.sql | tr -d '\r')
  files=$(bc exec -T api sh -c 'ls -1 uploads/images | wc -l' | tr -d '\r ')
  cat > "$RUN_DIR/$name.json" <<EOF
{"takenAt":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","counts":$counts,"uploadFileCount":$files,
 "startedAt":{"api":"$(started_at api)","db":"$(started_at db)","cms":"$(started_at cms)"},
 "health":{"api":"$(health_of api)","db":"$(health_of db)","cms":"$(health_of cms)"}}
EOF
}

STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
FAILED=0

# ---------------------------------------------------------------- unit + API
log "Unit tests"
runner run --rm -T tools npx vitest run --project unit --reporter=default --reporter=json --outputFile=test-results/raw/vitest-unit.json || FAILED=1

log "API tests (every endpoint, speed, accuracy, outages)"
runner run --rm -T tools npx vitest run --project api --reporter=default --reporter=json --outputFile=test-results/raw/vitest-api.json || FAILED=1

# ---------------------------------------------------------------- pages
write_fixtures before-restart
log "Playwright: every page (before restart)"
rm -rf e2e-report/before-restart
PHASE=before-restart runner run --rm -T e2e || FAILED=1

log "Lighthouse"
runner run --rm -T --entrypoint sh e2e /e2e/lighthouse.sh || FAILED=1

log "Backend restart (docker compose restart, volumes kept)"
snapshot snapshot-before-restart
bc restart || die "backend restart failed"
wait_healthy "db api cms" 300
until [ "$(curl -s -o /dev/null -w '%{http_code}' "$API_HOST_URL/health")" = "200" ]; do sleep 2; done
snapshot snapshot-after-restart
write_fixtures after-restart
log "Playwright: every page (after restart)"
rm -rf e2e-report/after-restart
PHASE=after-restart runner run --rm -T e2e || FAILED=1

# ---------------------------------------------------------------- results
log "Results"
FINISHED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
runner run --rm -T tools node scripts/merge-results.mjs \
  --run-id "$RUN_ID" --label "$LABEL" --started "$STARTED_AT" --finished "$FINISHED_AT" \
  --backend "$BACKEND_COMMIT" --frontend "$FRONTEND_COMMIT" $([ "$SAVE_BASELINE" = "1" ] && echo --save-baseline) || FAILED=1
runner run --rm -T tools node scripts/report.mjs || FAILED=1
echo "  dashboard: http://localhost:4200/#/tests · report: docs/api-test-report.md, test-results/report.html"
exit $FAILED
