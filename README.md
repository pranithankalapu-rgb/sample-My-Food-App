# My Food App: API integration and testing app

A local web app (React, TypeScript, TanStack Query; served by nginx in Docker) that uses **every** endpoint of the My Food App API, plus a complete API and page test suite with a Test Dashboard.

It's completely separate from the backend. It has its own repo and its own Docker images, and it talks to the API **only over HTTP** through `API_BASE_URL`.

| | |
|---|---|
| Backend (separate repo) | `../api_myfoodproductapp`, run by `../docker-compose.yml` |
| Endpoints covered | 33 of 33: the typed client (`src/api/`), the API Explorer and the tests (`src/data/api-inventory.json`, `docs/api-inventory.md`) |
| Test report | `docs/api-test-report.md`, `test-results/report.html`, and the Test Dashboard at http://localhost:4200/#/tests |

## Requirements

- Docker Desktop with Compose v2. Nothing runs outside Docker: no local Node, no `npm run dev`.
- **The backend stack must be running first:**

  ```bash
  cd ..                 # the folder with the backend's docker-compose.yml
  docker compose up -d
  docker compose ps     # db, api and cms show (healthy)
  ```

## Start the app

```bash
docker compose up -d --build        # http://localhost:4200
```

The image build runs the typecheck, ESLint and the unit tests before the production build, so a broken check means no image. Stop the app with `docker compose down`; the backend keeps running.

### Pages

| Page | What it does | Endpoints |
|---|---|---|
| Status | Live health and response time of the API, the database, Open Food Facts, OpenAI and the OCR service | `/health`, `/identifiers` + nginx probes |
| Log in / Sign up | Password login, sign-up, admin (CMS) login, social sign-in, email verification, password reset | all 7 auth endpoints, `/cms/login` |
| Barcode lookup | Typed input or camera scan; EAN-8/UPC-A/EAN-13 with check-digit validation; recent scans | `GET /product/{code}`, history |
| Product detail | Image gallery with full-size viewer and zoom (placeholder when missing or broken, low-resolution note), nutrition, ingredients with highlighted allergens, countries in English, a data source badge (Open Food Facts / USDA / AI fallback / CMS) and "served from our database / fetched just now" | `GET /product/{code}` |
| Browse & search | Debounced search with country/category/additive filters, browse all, by category, by additive; lazy thumbnails, pagination and helpful empty states | `/product/search`, `/product`, `/product/category`, `/product/additives` |
| Label scan | OCR label scan and AI photo analysis, with preview, upload progress and the result | `/product/scan`, `/product/analyze` |
| Account & profile | Profile, health profile, quota, scan history, plans and subscriptions, log out everywhere, delete account | `/user/{id}` (GET/PUT/DELETE), increment-scan, history, subscriptions, identifiers, `/cms/logout` |
| Admin (admins only) | Products (edit, remove from listing), needs review, needs better image, users, media upload and delete | all admin endpoints |
| API Explorer | Every endpoint, with a form prefilled with valid examples, Send, and status, time, headers, pretty JSON and Copy as curl | all 33 |
| Test dashboard | Latest results: pass/fail per endpoint and case, timings, failures with the request and response, accuracy, Lighthouse, before/after | reads `test-results/*.json` |

## How it reaches the API

```
browser ──► http://localhost:4200  (nginx, "web" container)
              ├─ /               the built app
              ├─ /api/*     ──►  ${API_BASE_URL}/*    (http://api:9595 on the backend's Docker network)
              ├─ /probe/*   ──►  Open Food Facts / OpenAI / OCR reachability (Status page)
              └─ /test-results/  ./test-results (read-only, for the Test Dashboard)
```

The browser never calls the API cross-origin, so the backend's CORS list doesn't need to change. All HTTP goes through one typed client (`src/api/`). It has a shared `ApiError` with friendly messages, a timeout on every request (AbortController), and retries with backoff for GET/HEAD on network errors, timeouts and 502/503/504. Components read data through TanStack Query hooks (`src/api/queries.ts`).

## Environment variables

| Variable | Where | Default | Meaning |
|---|---|---|---|
| `API_BASE_URL` | `web` container (run time) | `http://api:9595` | The API as seen from the web container |
| `WEB_PORT` | compose | `4200` | Host port of the app |
| `BACKEND_NETWORK` | compose | `myfoodapp_default` | The backend's Docker network (external) |
| `VITE_API_PATH` | build time | `/api` | Path the browser uses for API calls |
| `VITE_REQUEST_TIMEOUT_MS` | build time | `20000` | Default request timeout (lookups and uploads use longer ones) |
| `BACKEND_DIR` | scripts | `..` | Folder with the backend's `docker-compose.yml` |
| `API_HOST_URL` | scripts | `http://localhost:9595` | The API as seen from your machine |

There's no `.env` to fill in. The test-only stack reads the backend's own `../api_myfoodproductapp/.env` and the optional `../openai-test.env`; Compose reads them, and they're never copied into this repo.

## Tests

```bash
./scripts/run-all-tests.sh                  # Git Bash on Windows, or any bash
./scripts/run-all-tests.sh --label "after fixes"
./scripts/run-all-tests.sh --save-baseline   # make this run the "before" of before/after
```

What runs, all in Docker:

1. **Unit tests** (Vitest): barcode check digits, allergen highlighting, countries, the gallery, the HTTP client against a real local server (timeouts, retries, every backend error shape), and **client coverage**, which checks that every inventory endpoint has a typed function with the same method and path.
2. **API tests** (Vitest, `tests/api/`), using the app's own typed client: every endpoint, including success and response shape, missing, wrong-type, empty, too long, special-character and injection-like input, no/invalid/forged/expired token and wrong role, invalid and unknown barcodes, missing and low-resolution images, empty results and pagination edges, rate limits, the **DB → Open Food Facts → OpenAI** order and caching, **outages** (Open Food Facts and OpenAI down, slow, silent), **speed** (p50/p95 over 20 calls per endpoint), **accuracy** against live Open Food Facts (20 random products) and **ingredient lists** (20 products).
3. **Page tests** (Playwright, `e2e/tests/`): every page, accessibility (axe), phone layout, keyboard use, placeholders and the outage recovery in the UI. They run before and after a `docker compose restart` of the backend.
4. **Lighthouse** on every page, desktop and mobile.

Results go to `test-results/results.json`, which the Test Dashboard shows. The runner also writes `docs/api-test-report.md`, `test-results/report.html` and `docs/examples/` (request/response pairs per endpoint, plus screenshots of every page).

### The test-only backend stack

Destructive and fault-injection tests never touch your data. `scripts/apitest-stack.sh up` (run automatically) starts `docker-compose.apitest.yml`, which uses the **unchanged backend image** and:

- a **throwaway copy** of your database (read-only `pg_dump`, restored into a tmpfs Postgres) and of the image files
- `api-t` on :9598, the API with its normal settings, and `api-perf` on :9599, the same API with `RATE_LIMIT=off` for speed sampling only
- **mailpit** on :8025, which catches verification and reset emails so the code flows can be tested
- **toxiproxy** in front of Open Food Facts and OpenAI (via `extra_hosts`; TLS passes through untouched). These are the deliberate outage simulations, and the suite's only mocks.
- `web-t` on :4201, this app pointed at `api-t`
- **AI cost cap:** at most 12 + 3 OpenAI calls per run (the API's own per-instance budgets)

Tests on the **real** stack only read data, or use this run's dedicated users. They create the users through the API; the admin account gets its role with a one-row `UPDATE`. Every user is deleted through the API at the end, even when tests fail. The stack is removed afterwards (`--keep-test-stack` keeps it).

### Other checks

```bash
docker compose -f docker-compose.yml -f docker-compose.tests.yml --profile tests run --rm tools npm run check   # typecheck, lint, format, unit
```

## Project layout

```
src/api/            typed client: http.ts (timeout, retry), errors.ts, types.ts, endpoints.ts (33 functions + registry), queries.ts, probes.ts
src/pages/          Status, Login, Lookup, Product, Search, Scan, Profile, Admin, Explorer, Test dashboard, Not found
src/components/     layout, route error boundary, toasts, skeletons, image with placeholder, gallery/zoom, tables
src/data/           api-inventory.json (source of truth), results.ts (results format)
tests/unit, tests/api   Vitest
e2e/                Playwright (Docker image, port forwarder, Lighthouse)
scripts/            run-all-tests.sh, apitest-stack.sh, merge-results.mjs, report.mjs, sql/
docs/               api-inventory.md, api-test-report.md, examples/
```
