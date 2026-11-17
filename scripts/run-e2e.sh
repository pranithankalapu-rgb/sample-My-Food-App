#!/usr/bin/env bash
# End-to-end run of the sample frontend against the running backend stack.
#
#   ./scripts/run-e2e.sh
#
# 1. checks the backend containers (db, api, cms) are up and healthy
# 2. builds and starts this frontend (docker compose up -d --build web)
# 3. creates the run's dedicated test users through the API (one is made a
#    CMS admin with a single-row UPDATE) and reads ground-truth fixtures from
#    the database (read-only)
# 4. runs Playwright in its own container   -> e2e-report/before-restart/
# 5. `docker compose restart` on the backend (volumes kept), waits for health
# 6. runs Playwright again                  -> e2e-report/after-restart/
# 7. deletes the test users through the API, always (also on failure)
#
# Env: BACKEND_DIR (folder with the backend's docker-compose.yml, default ..),
#      API_HOST_URL (the API as seen from this machine, default http://localhost:9595)

set -uo pipefail
export MSYS_NO_PATHCONV=1 MSYS2_ARG_CONV_EXCL="*"

# on Git Bash (Windows) use C:/... paths, which docker.exe understands too
HERE="$(cd "$(dirname "$0")/.." && { pwd -W 2>/dev/null || pwd; })"
cd "$HERE"
BACKEND_DIR="${BACKEND_DIR:-$(cd "$HERE/.." && { pwd -W 2>/dev/null || pwd; })}"
BACKEND_COMPOSE="$BACKEND_DIR/docker-compose.yml"
API_HOST_URL="${API_HOST_URL:-http://localhost:9595}"
RUN_DIR="$HERE/.e2e-run"
REPORT_DIR="$HERE/e2e-report"

log() { printf '\n\033[1m== %s\033[0m\n' "$*"; }
die() { printf '\nERROR: %s\n' "$*" >&2; exit 2; }
bc() { docker compose -f "$BACKEND_COMPOSE" "$@"; }

[ -f "$BACKEND_COMPOSE" ] || die "backend compose file not found: $BACKEND_COMPOSE (set BACKEND_DIR)"

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

# psql in the backend's db container; SQL on stdin, psql variables as name=value
DB_NAME=""
sql() {
  local args=() kv
  for kv in "$@"; do args+=(-v "$kv"); done
  bc exec -T db sh -c 'db="$1"; shift; psql -U "$POSTGRES_USER" -d "$db" -At -q -v ON_ERROR_STOP=1 "$@" -f -' _ "$DB_NAME" "${args[@]}"
}

rand_hex() { head -c "$1" /dev/urandom | od -An -tx1 | tr -d ' \n'; }
json_field() { sed -n "s/.*\"$1\":\"\([^\"]*\)\".*/\1/p" | head -1; }

# EAN-13 in the in-store range (prefix 200-299): never a real retail product
unknown_ean() {
  local body="200$(printf '%09d' $(( (RANDOM * 32768 + RANDOM) % 1000000000 )))" sum=0 i d
  for i in $(seq 0 11); do
    d=${body:$i:1}
    if [ $((i % 2)) -eq 0 ]; then sum=$((sum + d)); else sum=$((sum + 3 * d)); fi
  done
  echo "${body}$(( (10 - sum % 10) % 10 ))"
}

# ---------------------------------------------------------------- preflight
log "Backend health"
for svc in db api cms; do
  printf '  %-4s %s\n' "$svc" "$(health_of "$svc")"
  [ "$(health_of "$svc")" = "healthy" ] || die "backend service '$svc' is not healthy: start it with 'docker compose up -d' in $BACKEND_DIR"
done
code=$(curl -s -o /dev/null -w '%{http_code}' "$API_HOST_URL/health")
echo "  API $API_HOST_URL/health -> HTTP $code"
[ "$code" = "200" ] || die "API health check failed"
DB_NAME="$(bc exec -T api printenv DB_NAME | tr -d '\r')"
[ -n "$DB_NAME" ] || die "could not read DB_NAME from the api container"
echo "  database: $DB_NAME"

log "Frontend: build and start"
docker compose up -d --build web || die "could not start the frontend"
deadline=$((SECONDS + 120))
until [ "$(docker inspect --format '{{.State.Health.Status}}' "$(docker compose ps -q web)")" = "healthy" ]; do
  [ $SECONDS -lt $deadline ] || die "frontend container is not healthy"
  sleep 2
done
echo "  web healthy on http://localhost:${WEB_PORT:-4200}"
docker compose --profile e2e build e2e || die "could not build the e2e image"

# ---------------------------------------------------------------- test users
RUN_ID="$(date +%Y%m%d%H%M%S)$(rand_hex 2)"
USER_EMAIL="e2e-user-${RUN_ID}@example.test"
ADMIN_EMAIL="e2e-admin-${RUN_ID}@example.test"
USER_PW="E2e-$(rand_hex 10)"
ADMIN_PW="E2e-$(rand_hex 10)"
CREATED=()

cleanup() {
  log "Cleanup: delete this run's test users through the API"
  local email pw body token id status
  for pair in "${CREATED[@]}"; do
    email="${pair%%|*}"; pw="${pair#*|}"
    body=$(curl -s -X POST -H 'Content-Type: application/json' \
      -d "{\"email\":\"$email\",\"password\":\"$pw\"}" "$API_HOST_URL/login")
    token=$(printf '%s' "$body" | json_field token)
    id=$(printf '%s' "$body" | sed -n 's/.*"user":{"id":"\([^"]*\)".*/\1/p' | head -1)
    if [ -z "$token" ] || [ -z "$id" ]; then
      echo "  $email: login failed ($body)"; continue
    fi
    status=$(curl -s -o /dev/null -w '%{http_code}' -X DELETE -H "x-access-token: $token" "$API_HOST_URL/user/$id")
    echo "  $email: DELETE /user/$id -> HTTP $status"
  done
  local left
  left=$(sql "run_id=$RUN_ID" < scripts/sql/leftover-users.sql | tr -d '\r')
  echo "  active e2e accounts left from run $RUN_ID: $left"
}
trap cleanup EXIT

create_user() {
  local email="$1" pw="$2" first="$3" status
  status=$(curl -s -o "$RUN_DIR/signup.json" -w '%{http_code}' -X POST -H 'Content-Type: application/json' \
    -d "{\"first_name\":\"$first\",\"last_name\":\"Tester\",\"email\":\"$email\",\"password\":\"$pw\",\"repassword\":\"$pw\"}" \
    "$API_HOST_URL/user")
  [ "$status" = "201" ] || die "creating $email failed: HTTP $status $(cat "$RUN_DIR/signup.json")"
  CREATED+=("$email|$pw")
  rm -f "$RUN_DIR/signup.json"
}

log "Test users for run $RUN_ID"
rm -rf "$RUN_DIR" && mkdir -p "$RUN_DIR"
create_user "$USER_EMAIL" "$USER_PW" "Eetwoe"
create_user "$ADMIN_EMAIL" "$ADMIN_PW" "Admin"
promoted=$(sql "email=$ADMIN_EMAIL" < scripts/sql/promote-admin.sql | tr -d '\r' | grep -c .)
[ "$promoted" = "1" ] || die "promoting $ADMIN_EMAIL to admin changed $promoted rows"
echo "  $USER_EMAIL (user), $ADMIN_EMAIL (admin)"

write_fixtures() {
  local phase="$1" data
  mkdir -p "$RUN_DIR/$phase"
  data=$(sql < scripts/sql/fixtures.sql | tr -d '\r')
  [ "${data:0:1}" = "{" ] || die "could not read fixtures from the database: $data"
  # the run's fields, then the database object's own keys (its leading "{" dropped)
  printf '{"runId":"%s","phase":"%s","unknownBarcode":"%s","user":{"email":"%s","password":"%s"},"admin":{"email":"%s","password":"%s"},%s\n' \
    "$RUN_ID" "$phase" "$(unknown_ean)" "$USER_EMAIL" "$USER_PW" "$ADMIN_EMAIL" "$ADMIN_PW" "${data:1}" \
    > "$RUN_DIR/$phase/fixtures.json"
}

snapshot() {
  local name="$1" counts files
  counts=$(sql < scripts/sql/counts.sql | tr -d '\r')
  files=$(bc exec -T api sh -c 'ls -1 uploads/images | wc -l' | tr -d '\r ')
  cat > "$RUN_DIR/$name.json" <<EOF
{"takenAt":"$(date -u +%Y-%m-%dT%H:%M:%SZ)","counts":$counts,"uploadFileCount":$files,
 "startedAt":{"api":"$(started_at api)","db":"$(started_at db)","cms":"$(started_at cms)"},
 "health":{"api":"$(health_of api)","db":"$(health_of db)","cms":"$(health_of cms)"}}
EOF
  echo "  $name: $(tr -d '\n' < "$RUN_DIR/$name.json")"
}

run_phase() {
  local phase="$1"
  log "Playwright: $phase"
  rm -rf "$REPORT_DIR/$phase"
  PHASE="$phase" docker compose --profile e2e run --rm e2e
}

# ---------------------------------------------------------------- phases
write_fixtures before-restart
run_phase before-restart; BEFORE=$?

log "Backend restart (docker compose restart, volumes kept)"
snapshot snapshot-before-restart
bc restart || die "backend restart failed"
wait_healthy "db api cms" 300
until [ "$(curl -s -o /dev/null -w '%{http_code}' "$API_HOST_URL/health")" = "200" ]; do sleep 2; done
snapshot snapshot-after-restart

write_fixtures after-restart
run_phase after-restart; AFTER=$?

log "Result"
echo "  before-restart: $([ $BEFORE -eq 0 ] && echo PASS || echo "FAIL (exit $BEFORE)")"
echo "  after-restart:  $([ $AFTER -eq 0 ] && echo PASS || echo "FAIL (exit $AFTER)")"
echo "  reports: $REPORT_DIR/<phase>/html/index.html, screenshots in $REPORT_DIR/<phase>/screenshots"
[ $BEFORE -eq 0 ] && [ $AFTER -eq 0 ]
