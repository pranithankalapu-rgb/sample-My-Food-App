# My Food App: sample frontend

A small web app (React + Vite, served by nginx) that uses the **My Food App API** the way the mobile app does, plus a Playwright end-to-end suite that tests the whole stack.

It is completely separate from the backend. It has its own repo, Dockerfile and compose project, and it talks to the API **only over HTTP**.

## Requirements

- Docker Desktop (Docker Compose v2). Everything runs in containers; no local Node is needed.
- **The backend stack must be running first.** It's the workspace `docker-compose.yml` next to this folder, with `db`, `api` and `cms`:

  ```bash
  cd ..                 # the folder with the backend's docker-compose.yml
  docker compose up -d
  docker compose ps     # db, api, cms: (healthy)
  ```

  This frontend joins the backend's Docker network (`myfoodapp_default`), so that network has to exist.

## Start the frontend

```bash
docker compose up -d --build web
```

Open <http://localhost:4200>, sign up or log in, then:

| Screen | What it does | API |
|---|---|---|
| Log in / Sign up | Create an account, then log in | `POST /user`, `POST /login` |
| Barcode lookup | Type a barcode (8, 12, 13 or 14 digits) or scan it with the camera ([@zxing/browser](https://github.com/zxing-js/browser)) | `GET /product/:code` |
| Product detail | Name, brand, full-size front image, nutrition per 100 g, ingredients, countries, data source (Open Food Facts / USDA / AI fallback), personal verdict | `GET /product/:code` |
| Browse & search | Product list with thumbnails, search by name, pagination (12 per page) | `POST /product/search` |
| Label scan | Upload a label photo; shows the text the OCR service extracted | `POST /product/scan` (multipart field `images`) |

Loading, "not found", "still looking" (AI fallback running), validation and error states are all shown on screen. Errors include the HTTP status and the API's own message.

Stop it with `docker compose down`. That only stops this project's containers; the backend keeps running.

The camera needs a secure context: `http://localhost` works, but a plain-HTTP LAN address does not.

## How it reaches the API

```
browser ──► http://localhost:4200  (nginx in the "web" container)
              ├─ /            the built React app
              └─ /api/*  ──►  ${API_BASE_URL}/*   e.g. http://api:9595 on the backend network
```

The app only calls the relative path `/api`. nginx forwards it to `API_BASE_URL`, resolved at request time, so the frontend starts even while the backend is down. The browser therefore never makes a cross-origin call, and the backend's CORS allowlist (`CORS_ORIGINS`, currently only the CMS on `http://localhost:3000`) doesn't need to change.

If you'd rather call the API straight from the browser, add `http://localhost:4200` to `CORS_ORIGINS` in the backend's env, and point `VITE_API_PATH` at the API's public URL at build time.

Product image URLs come from the API as absolute URLs (`<BASE_URL>/uploads/images/...`, by default `http://localhost:9595/...`), so the browser loads them straight from the API.

## Environment variables

| Variable | Where | Default | Meaning |
|---|---|---|---|
| `API_BASE_URL` | `web` container (run time) | `http://api:9595` | The API as seen from the frontend container |
| `WEB_PORT` | compose | `4200` | Host port of the frontend |
| `BACKEND_NETWORK` | compose | `myfoodapp_default` | The backend's Docker network (external) |
| `VITE_API_PATH` | build time (optional) | `/api` | Base path or URL the browser uses for API calls |
| `BACKEND_DIR` | `scripts/run-e2e.sh` | `..` | Folder with the backend's `docker-compose.yml` |
| `API_HOST_URL` | `scripts/run-e2e.sh` | `http://localhost:9595` | The API as seen from your machine (used to create and delete the test users) |

There's no `.env` file to fill in. Override any of these in your shell or in a local `.env`, which git ignores.

## End-to-end tests

```bash
./scripts/run-e2e.sh        # Git Bash on Windows, or any bash
```

What it does:

1. Checks that `db`, `api` and `cms` are healthy and `GET /health` returns 200. If not, it stops and tells you to start the backend.
2. Builds and starts `web`, and builds the Playwright image (`mcr.microsoft.com/playwright:v1.65.1-noble`).
3. Creates two **dedicated test users** for this run through the API: `e2e-user-<run>@example.test` and `e2e-admin-<run>@example.test`. The API never lets a client set a role, so the admin account gets the `admin` role with one `UPDATE` on that single row (`scripts/sql/promote-admin.sql`).
4. Reads ground truth from the database, read-only (`scripts/sql/fixtures.sql`): 10 random products, the number of listed products, and every uploaded image file.
5. Runs Playwright in its own container on the backend network. Inside that container `localhost:4200`, `:9595` and `:3000` are forwarded to `web`, `api` and `cms`, so the browser uses the same URLs you do. Results go to `e2e-report/before-restart/`.
6. Runs `docker compose restart` on the backend (volumes are kept), waits until everything is healthy, compares row counts and image files before and after, then runs the whole suite again. Results go to `e2e-report/after-restart/`.
7. **Always** deletes the run's test users through the API (`DELETE /user/:id`), even when tests fail, and checks that none is left active.

Reports, one per phase:

- `e2e-report/<phase>/html/index.html`: the Playwright HTML report, with a screenshot of every test and traces for failures
- `e2e-report/<phase>/screenshots/`: the key screens (lookup, product detail, search, label scan, CMS, ...)
- `e2e-report/<phase>/results.json`: machine-readable results

What's covered:

| Spec | Checks |
|---|---|
| `01-health` | API `/health`, CMS, frontend and its `/api` proxy |
| `02-lookup` | 10 random barcodes: name, brand and data source match the database; every stored nutrient is shown; the front image decodes and its request is a 200 `image/*` with real bytes |
| `03-unknown-and-invalid` | Unknown barcode (in-store EAN range 200…) goes through Open Food Facts and the AI fallback and ends in a result or a clear not-found, never a crash; letters, too short and empty input show a validation message and make no API call |
| `04-search` | Browsing lists every listed product, pages 1, 2 and the last page are correct and disjoint, every thumbnail loads; searching by name finds the product; no-match state |
| `05-label-scan` | A label image (rendered by the browser) is uploaded and extracted text comes back |
| `06-auth` | Sign up, log in, log out; protected endpoints refuse a missing token (403) and a bad token (401); wrong password (401); the user is deleted and its token revoked |
| `07-cms` | Admin logs into the CMS; the product list shows products with thumbnails; a product's image loads on its edit page |
| `08-data-integrity` | Every image file listed in the database is served (200, image bytes) |
| `09-restart` | (after the restart) the containers really restarted and are healthy; row counts and image files are unchanged |

**External services:** the unknown-barcode test calls Open Food Facts and, if the API has an AI key configured, one AI lookup per run (capped by the API's own AI budgets). The label-scan test sends the sample label to the API's OCR service. Nothing is mocked.

The tests share one test user's scan quota (100 free scans), so they run one at a time. A full run uses about 15 scans per phase.

## Project layout

```
Dockerfile, nginx/        production image: Vite build served by nginx + /api proxy
src/                      React app (api.js is the only file that talks HTTP)
docker-compose.yml        web (port 4200) + e2e (profile "e2e"), backend network as external
e2e/                      Playwright: Dockerfile, config, forwarder, tests/
scripts/run-e2e.sh        the full e2e run (users, fixtures, both phases, restart, cleanup)
scripts/sql/              read-only fixture and count queries, plus the single-row admin promotion
```
