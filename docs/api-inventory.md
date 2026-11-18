# My Food App API inventory

Backend `api_myfoodproductapp` at commit `eb7971e68f08642789e5d6f4a354469f0a061cb6`. Generated from `src/data/api-inventory.json` (the machine-readable source of truth) on 2026-11-17.

**34 endpoints**: 31 router registrations in `lib/api/content/index.js` and 3 app-level routes in `lib/app.js`. Phase 1 found 33; `GET /health/deps` (row 34) was added on `fix/api-hardening` (`25d456b`, issue #14). Swagger/OpenAPI: none (no OpenAPI/Swagger file in the backend).

Sources read:
- lib/app.js (app-level routes: /health, /uploads static, JSON 404 and error handler)
- lib/routes.js -> lib/api/content/index.js (every router registration)
- lib/middleware/{authToken,authorize,rateLimit,validate,routeValidators}.js
- lib/api/content/**/*Ops.js, userVerification.js, scanQuota.js
- lib/api/utils/{scanUpload,uploadConfig}.js, lib/responseHandler.js

## Coverage

| | Phase 1 (before the upgrade) | Now |
|---|---|---|
| Integrated in the web app | **6 of 33** | **34 of 34** (typed client, pages and API Explorer) |
| Tested by the web app's suites | **11 of 33** (9 beyond a no-token check) | **34 of 34** (vitest api + Playwright) |
| Tested by the backend's own Jest suite | 30 of 33 | 31 of 34 |
| Tested anywhere | 30 of 33 | 34 of 34 |

The per-endpoint columns below are the Phase 1 snapshot; current coverage per endpoint is in `src/data/api-inventory.json` and the Test Dashboard.

## Summary

| # | Method | Path | Auth | Rate limit | Data source | Web app page | Web app tests | Backend tests |
|---|---|---|---|---|---|---|---|---|
| 1 | GET | `/health` | public | — | none | no | e2e 01-health: 200 {status:ok}, also via /api proxy | security.test.js |
| 2 | GET | `/uploads/images/{file}` | public | — | disk (uploads volume) | Product detail (front image); Browse & search (thumbnails) | e2e 02-lookup/04-search: 200 image bytes; e2e 08-data-integrity: all 399 files | product.test.js |
| 3 | POST | `/user` | public | 20/hour per IP | DB | Login / Sign up | e2e 06-auth: 201 via UI | hardening, round3, round4, security |
| 4 | POST | `/login` | public | 30/min per IP; failed logins 100/15 min per IP and 10/15 min per email+IP | DB | Login / Sign up | e2e auth.setup + 06-auth: 200, 401 wrong password, 404 deleted user | hardening, round3, round5, round6, security |
| 5 | POST | `/user/social/signin` | public | 60/15 min per IP | Firebase, DB | no | no | hardening, round3, round4, round6, security |
| 6 | POST | `/user/verify/code` | public | 20/hour per IP, 5/hour per email+IP, 50/day per email | DB, SMTP | no | no | round4, security |
| 7 | POST | `/user/verify` | public | 30/15 min per IP, 10/15 min per email+IP; 5 wrong guesses per network, 15 per code, 30/day per email | DB | no | no | security |
| 8 | POST | `/user/forgotpassword/code` | public | 20/hour per IP, 5/hour per email+IP, 50/day per email | DB, SMTP | no | no | hardening, round3, round4, round5, security |
| 9 | POST | `/user/changepassword` | public | 30/15 min per IP, 10/15 min per email+IP | DB | no | no | hardening, round3, round4, round5, security |
| 10 | GET | `/user/{id}` | token, self or admin | — | DB | no | e2e 06-auth: 403 without token only | hardening, round3, round4, security |
| 11 | PUT | `/user/{id}` | token, self or admin | 30/min per user | DB | no | no | hardening, round4, security |
| 12 | DELETE | `/user/{id}` | token, self or admin | — | DB | no | e2e 06-auth: 200, token revoked afterwards | hardening, round4, security |
| 13 | PUT | `/user/{id}/increment-scan` | token, self or admin | — | DB | no | no | hardening, round5, security |
| 14 | GET | `/product/history/user/{id}` | token, self or admin | — | DB | no | e2e 06-auth: 403 without token only | product, security |
| 15 | GET | `/product/{code}` | token | 120/min per user; Open Food Facts share 10/min per user, 80/min per server | DB, Open Food Facts, USDA (off: no key), OpenAI (AI_LOOKUP_PROVIDER=openai) | Barcode lookup; Product detail | e2e 02-lookup: 10 random x2 phases; e2e 03: unknown barcode -> 404 | fallback, hardening, images, product, productBundle, round3, round4, round5 |
| 16 | GET | `/product` | token | 60/min per user | DB (products listing, cached) | no | no | hardening, product, round3 |
| 17 | POST | `/product/search` | token | 60/min per user | DB (products listing, full-text index, cached) | Browse & search | e2e 04-search: browse, pages 1/2/last, by name, empty | hardening, product, round5 |
| 18 | POST | `/product/category` | token | 60/min per user | DB | no | no | no |
| 19 | POST | `/product/additives` | token | 60/min per user | DB | no | no | no |
| 20 | POST | `/product/scan` | token | 20/min per user; scan quota; max 2 in flight per user, 4 per network, 16 total | OCR service (ocr.findmyproductapp.com) | Label scan | e2e 05-label-scan: upload (fails: OCR service down), no-file message | product, round3, round4 |
| 21 | POST | `/product/analyze` | token | 20/min per user; scan quota; AI budgets (500/day server, 20/day user, 4 concurrent) | OpenAI (Responses API) | no | no | fallback |
| 22 | POST | `/cms/login` | public | same as /login | DB | no | e2e 07-cms: via the CMS UI | hardening, round4, round6, security |
| 23 | POST | `/cms/logout` | token | — | DB | no | no | round4 |
| 24 | GET | `/cms/product-review` | token, admin | — | DB | no | no | fallback |
| 25 | GET | `/cms/product-images` | token, admin | — | DB | no | no | images |
| 26 | GET | `/users` | token, admin | — | DB | no | no | hardening, round4, security |
| 27 | PUT | `/product/update` | token, admin | — | DB | no | no | fallback, images, product, productBundle, round3, round4, round5, security |
| 28 | DELETE | `/product/{code}` | token, admin | — | DB | no | no | product, security |
| 29 | POST | `/media/upload` | token, admin | — | disk, DB (mediafiles) | no | no | images, product, round3, round4, security |
| 30 | DELETE | `/media/{id}` | token, admin | — | DB, disk | no | no | product |
| 31 | POST | `/subscription/add` | token | 10/min per user | DB | no | no | hardening, security |
| 32 | PUT | `/subscription/extend` | token | 10/min per user | DB | no | no | hardening, security |
| 33 | GET | `/identifiers` | public | — | DB | no | no | no |
| 34 | GET | `/health/deps` | public | — (cached 30 s) | DB, Open Food Facts, OpenAI, OCR | Status page | api 01-system, e2e 01-status | apiHardening.test.js |

## Authentication and common errors

- HS256 JWT in 'x-access-token' or 'Authorization: Bearer <token>'. Body/query tokens only when ALLOW_LEGACY_TOKEN_LOCATIONS is on.
- `none`: public
- `user`: any valid token (verifyToken also rejects deleted/disabled users and revoked token_version)
- `self_or_admin`: valid token AND (the :id in the path is the caller, or the caller is an active admin; role read from the DB)
- `admin`: valid token AND caller is an active admin (role read from the DB)

| Case | Status | Body |
|---|---|---|
| validation | 400 | `{"error":"Bad Request","message":"Please check the request inputs","details":"<joined Joi messages>"}` |
| noToken | 403 | `{"status":403,"message":"A token is required for authentication"}` |
| badToken | 401 | `{"status":401,"message":"Invalid Token"}` |
| forbidden | 403 | `{"status":403,"message":"Access forbidden."}` |
| rateLimited | 429 | `{"status":429,"message":"Too many requests. Please try again later."}` |
| scanLimit | 403 | `{"message":"Scan limit exceeded. Please subscribe.","info":{"total_scans":100,"scanned_count":100,"remaining_scans":0}}` |
| bodyParse | 400 | `{"status":400,"message":"The request body is not valid JSON."}` |
| notFoundRoute | 404 | `{"status":404,"message":"Not found."}` |
| server | 500 | `{ message: "Internal Server Error" } or { status: 500, message: "Internal server error." } (varies per handler)` |

> There is no single error format: validation uses {error, message, details}; auth and legacy handlers use {status, message}; product/OCR handlers use {message} or {error}; identifiers uses {status: "error", message}.

## System

### GET `/health`

Liveness probe used by Docker healthchecks. Not logged.

- **Auth:** public
- **Rate limit:** none
- **Data source:** none

| Status | When | Body |
|---|---|---|
| 200 | always (static; does not check the database) | `{"status":"ok"}` |

### GET `/uploads/images/{file}`

Serves product images (Open Food Facts copies and CMS uploads). Product responses carry absolute URLs: <BASE_URL>/uploads/images/<file>.

- **Auth:** public
- **Rate limit:** none
- **Data source:** disk (uploads volume)
- **Path params:** `file` string (required): stored file name, e.g. off_<code>_front_<hash>.jpg or <ts>-<hex>.jpg; dotfiles denied, no directory index

| Status | When | Body |
|---|---|---|
| 200 | file exists | `image bytes (image/jpeg, image/png, image/webp, image/gif, image/heic); Cross-Origin-Resource-Policy: cross-origin` |
| 404 | no such file | `{"status":404,"message":"Not found."}` |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "params": {
    "file": "off_8715700407760_front_88f5f9b85095580b.jpg"
  }
}
```

## Auth

### POST `/user`

Create an account. Email verification is not required to log in.

- **Auth:** public
- **Rate limit:** 20/hour per IP
- **Data source:** DB
- **Body:**
  - `first_name` string (required): <=100, letters/marks then letters, space . ' -
  - `last_name` string (required): same as first_name
  - `email` string (required): email, <=254, ASCII only, TLD not checked
  - `password` string (required): 8-128 chars
  - `repassword` string (required): must equal password
  - `mobile` number
  - `role` any: accepted and stripped; never client-assigned

| Status | When | Body |
|---|---|---|
| 201 | created | `{"status":201,"message":"User created successfully.","user":"<public user: id, first_name, last_name, email, role:'user', email_verification_status:'PENDING', is_active, user_scan_count, ...>"}` |
| 400 | missing/invalid fields, passwords differ, or email already in use | `{"status":400,"message":"Email already in use. \| Password and Re-entered password must match. \| ..."}` |
| 429 | rate limited | — |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "body": {
    "first_name": "Ada",
    "last_name": "Tester",
    "email": "e2e-ada@example.test",
    "password": "Str0ng-pass!",
    "repassword": "Str0ng-pass!"
  }
}
```

### POST `/login`

Password login for app users (and admins).

- **Auth:** public
- **Rate limit:** 30/min per IP; failed logins 100/15 min per IP and 10/15 min per email+IP
- **Data source:** DB
- **Body:**
  - `email` string (required): <=254
  - `password` string (required): <=128

| Status | When | Body |
|---|---|---|
| 200 | credentials match | `{"status":200,"message":"Login successful.","user":"<public user>","token":"<JWT>"}` |
| 401 | wrong password | `{"status":401,"message":"Invalid email or password."}` |
| 403 | account disabled (after a correct password) | `{"status":403,"message":"Account disabled."}` |
| 404 | unknown email (kept for older app builds) | `{"status":404,"message":"User not found."}` |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "body": {
    "email": "e2e-ada@example.test",
    "password": "Str0ng-pass!"
  }
}
```

### POST `/user/social/signin`

Sign in with Google/Apple/Facebook via Firebase. FIREBASE_SERVICE_ACCOUNT is not set locally, so only error paths can be exercised here.

- **Auth:** public
- **Rate limit:** 60/15 min per IP
- **Data source:** Firebase, DB
- **Body:**
  - `token` string (required): Firebase ID token, <=8192
  - `provider` string (required): <=32 (google, apple, facebook)

| Status | When | Body |
|---|---|---|
| 200 | token verified | `{"status":200,"message":"SignIn successful.","user":"<public user>","token":"<JWT>"}` |
| 400 | missing token/provider | — |
| 401 | invalid Firebase token | `{"status":401,"message":"Invalid Firebase token."}` |
| 403 | account disabled | — |
| 409 | email has a password account / concurrent first sign-in | — |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "body": {
    "token": "<firebase-id-token>",
    "provider": "google"
  }
}
```

### POST `/user/verify/code`

Email a 6-digit account verification code (only to PENDING accounts; re-sends the active code).

- **Auth:** public
- **Rate limit:** 20/hour per IP, 5/hour per email+IP, 50/day per email
- **Data source:** DB, SMTP
- **Body:**
  - `email` string (required): <=254

| Status | When | Body |
|---|---|---|
| 200 | always for a well-formed email (same answer for unknown, verified or pending accounts) | `{"message":"Verification code sent successfully."}` |
| 500 | unexpected error | — |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "body": {
    "email": "e2e-ada@example.test"
  }
}
```

### POST `/user/verify`

Confirm the email address with the emailed code.

- **Auth:** public
- **Rate limit:** 30/15 min per IP, 10/15 min per email+IP; 5 wrong guesses per network, 15 per code, 30/day per email
- **Data source:** DB
- **Body:**
  - `email` string (required): <=254
  - `code` string (required): <=16

| Status | When | Body |
|---|---|---|
| 200 | code valid | `{"status":"success","message":"User verification successful"}` |
| 401 | wrong/expired code | `{"status":"error","message":"Verification details not found"}` |
| 500 | could not mark verified | — |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "body": {
    "email": "e2e-ada@example.test",
    "code": "123456"
  }
}
```

### POST `/user/forgotpassword/code`

Email a password-reset code.

- **Auth:** public
- **Rate limit:** 20/hour per IP, 5/hour per email+IP, 50/day per email
- **Data source:** DB, SMTP
- **Body:**
  - `email` string (required): <=254

| Status | When | Body |
|---|---|---|
| 200 | always for a well-formed email | `{"status":"success","message":"Forgot password verification code sent successfully"}` |
| 500 | unexpected error | — |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "body": {
    "email": "e2e-ada@example.test"
  }
}
```

### POST `/user/changepassword`

Reset the password with the emailed code (bumps token_version).

- **Auth:** public
- **Rate limit:** 30/15 min per IP, 10/15 min per email+IP
- **Data source:** DB
- **Body:**
  - `email` string (required): <=254
  - `code` string (required): <=16
  - `new_password` string (required): 8-128

| Status | When | Body |
|---|---|---|
| 200 | code valid; password changed, all sessions revoked | `{"status":200,"message":"Password changed successfully"}` |
| 404 | wrong/expired code or unknown email | `{"status":"error","message":"Invalid email or verification code or code expired"}` |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "body": {
    "email": "e2e-ada@example.test",
    "code": "123456",
    "new_password": "N3w-pass-word!"
  }
}
```

## User

### GET `/user/{id}`

Profile, scan quota and subscriptions.

- **Auth:** token, self or admin
- **Rate limit:** none
- **Data source:** DB
- **Path params:** `id` uuid v4 (required)

| Status | When | Body |
|---|---|---|
| 200 | found | `{"status":200,"user":"<public user + total_scan_limit, subscription_details[], active_subscription\|null; user_info only for self>"}` |
| 404 | no such user | `{"status":404,"message":"User not found."}` |
| 401 / 403 | invalid or missing token, or not allowed (403 Access forbidden.) | see common errors |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "params": {
    "id": "<own user id>"
  }
}
```

### PUT `/user/{id}`

Save the health profile used for personal verdicts.

- **Auth:** token, self or admin
- **Rate limit:** 30/min per user
- **Data source:** DB
- **Path params:** `id` uuid v4 (required)
- **Body:**
  - `user_info` object (required): health profile; health_conditions/allergies/allergens: string[] (<=50 items, <=100 chars); other keys allowed; whole object <=16 KB; merged into the stored object

| Status | When | Body |
|---|---|---|
| 200 | merged | `{"status":200,"message":"User details updated successfully."}` |
| 400 | profile too large after merge | `{"status":400,"message":"Profile is too large."}` |
| 404 | no such user | — |
| 401 / 403 | invalid or missing token, or not allowed (403 Access forbidden.) | see common errors |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "params": {
    "id": "<own user id>"
  },
  "body": {
    "user_info": {
      "health_conditions": [
        "diabetes"
      ],
      "allergies": [
        "peanuts"
      ]
    }
  }
}
```

### DELETE `/user/{id}`

Account deletion.

- **Auth:** token, self or admin
- **Rate limit:** none
- **Data source:** DB
- **Path params:** `id` uuid v4 (required)

| Status | When | Body |
|---|---|---|
| 200 | erased (soft delete: personal data cleared, email freed, tokens revoked, history removed) | `{"status":200,"message":"User deleted successfully."}` |
| 404 | no such user | — |
| 401 / 403 | invalid or missing token, or not allowed (403 Access forbidden.) | see common errors |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "params": {
    "id": "<own user id>"
  }
}
```

### PUT `/user/{id}/increment-scan`

Legacy: reports the scan quota. Scans are counted by the lookup itself; this never counts one.

- **Auth:** token, self or admin
- **Rate limit:** none
- **Data source:** DB
- **Path params:** `id` uuid v4 (required)

| Status | When | Body |
|---|---|---|
| 200 | quota left (or the limit was reached by a scan in the last 120 s) | `{"message":"Scan recorded successfully.","info":{"total_scans":100,"scanned_count":3,"remaining_scans":97}}` |
| 403 | over the free limit | `{"message":"Scan limit exceeded. Please subscribe.","info":"..."}` |
| 401 / 403 | invalid or missing token, or not allowed (403 Access forbidden.) | see common errors |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "params": {
    "id": "<own user id>"
  }
}
```

### GET `/product/history/user/{id}`

The user's recently scanned products (admins are never recorded).

- **Auth:** token, self or admin
- **Rate limit:** none
- **Data source:** DB
- **Path params:** `id` uuid v4 (required)

| Status | When | Body |
|---|---|---|
| 200 | always | `{"productHistory":"[{ id, product_code, user_id, product_name, created_at, updated_at }] newest first, max 500"}` |
| 401 / 403 | invalid or missing token, or not allowed (403 Access forbidden.) | see common errors |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "params": {
    "id": "<own user id>"
  }
}
```

## Product

### GET `/product/{code}`

Barcode scan: DB first, then Open Food Facts (stored), then fallbacks (stored). Counts a scan (free re-open within 10 min), writes history, scores against the user's profile.

- **Auth:** token
- **Rate limit:** 120/min per user; Open Food Facts share 10/min per user, 80/min per server
- **Data source:** DB, Open Food Facts, USDA (off: no key), OpenAI (AI_LOOKUP_PROVIDER=openai)
- **Path params:** `code` string (required): ^[A-Za-z0-9._-]{1,64}$ (no check-digit validation)

| Status | When | Body |
|---|---|---|
| 200 | found in DB, on Open Food Facts, or by the fallback | `{"product":"<productdetails row + isRecommended { recommended: boolean, verdict: 'recommended'\|'not_recommended'\|'insufficient_data', report, missing_data, unsupported_conditions? }, defaults for missing fields, selected_images (uploaded_images with absolute URLs), image_url, image_thumb_url, image_width, image_height, image_source, image_chosen_by, needs_better_image, data_source, source_info>"}` |
| 403 | scan limit reached (non-admin) | `{"message":"Scan limit exceeded. Please subscribe.","info":"..."}` |
| 404 | not on Open Food Facts and the fallback found nothing (or is disabled) | `{"message":"Product not found in external API."}` |
| 404 | fallback still running after FALLBACK_WAIT_MS (25 s) | `{"message":"We are still looking this product up. Please try again in a minute.","lookup_pending":true}` (headers: Retry-After: 30) |
| 429 | per-user Open Food Facts share used up | — (headers: Retry-After: 60) |
| 503 | Open Food Facts unreachable/timeout (8 s) | `{"message":"Product data is temporarily unavailable. Please try again."}` (headers: Retry-After: 30) |
| 401 / 403 | invalid or missing token | see common errors |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "params": {
    "code": "8715700407760"
  }
}
```

### GET `/product`

Browse the catalogue page by page.

- **Auth:** token
- **Rate limit:** 60/min per user
- **Data source:** DB (products listing, cached)
- **Query:** `page` integer (required): >=0 (0 treated as 1), clamped to 500; `limit` integer (required): >=1, clamped to 100

| Status | When | Body |
|---|---|---|
| 200 | page has rows | `{"data":"[listing rows with image fields]","pageInfo":{"total":103,"page":1,"pages":9}}` |
| 404 | page beyond the last | `{"message":"No products found"}` |
| 401 / 403 | invalid or missing token | see common errors |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "query": {
    "page": 1,
    "limit": 12
  }
}
```

### POST `/product/search`

Search and filter the catalogue. No brands in results.

- **Auth:** token
- **Rate limit:** 60/min per user
- **Data source:** DB (products listing, full-text index, cached)
- **Body:**
  - `query` string|null: <=2000, cut to 200; full-text (plainto_tsquery english)
  - `filters` array: <=10 of {name, value: string|string[]}; honoured names: product_name (exact), categories, additives_tags, countries (array overlap)
  - `page` integer: 0-based, clamped to 500
  - `page_size` integer: default 10, clamped to 100

| Status | When | Body |
|---|---|---|
| 200 | always (empty results allowed) | `{"page_no":0,"pageSize":12,"totalSearchResultsCount":"\"103\" (string; capped for filtered searches)","results":"[id, code, product_name, categories, additives_tags, countries, selected_images, image fields, ...]"}` |
| 401 / 403 | invalid or missing token | see common errors |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "body": {
    "query": "ketchup",
    "filters": [],
    "page": 0,
    "page_size": 12
  }
}
```

### POST `/product/category`

Products in any of the given categories.

- **Auth:** token
- **Rate limit:** 60/min per user
- **Data source:** DB
- **Body:**
  - `category` string[] (required): <=50 items, <=500 chars each; matched against listing categories (overlap)

| Status | When | Body |
|---|---|---|
| 200 | matches | `{"data":"[raw listing rows, max 100, no image URL fields]"}` |
| 404 | no match | `{"message":"No products found for category: <list>"}` |
| 401 / 403 | invalid or missing token | see common errors |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "body": {
    "category": [
      "Sauces"
    ]
  }
}
```

### POST `/product/additives`

Products containing any of the given additives.

- **Auth:** token
- **Rate limit:** 60/min per user
- **Data source:** DB
- **Body:**
  - `additives_tags` string[] (required): <=50 items, <=500 chars each (e.g. en:e330)

| Status | When | Body |
|---|---|---|
| 200 | matches | `{"data":"[raw listing rows, max 100]"}` |
| 404 | no match | `{"message":"No products found with additives tag: <list>"}` |
| 401 / 403 | invalid or missing token | see common errors |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "body": {
    "additives_tags": [
      "en:e330"
    ]
  }
}
```

### POST `/product/scan`

Read a food label photo. Sends the image and the user's user_info to the OCR service (30 s timeout).

- **Auth:** token
- **Rate limit:** 20/min per user; scan quota; max 2 in flight per user, 4 per network, 16 total
- **Data source:** OCR service (ocr.findmyproductapp.com)
- **Content type:** multipart/form-data
- **Body:**
  - `images` file (required): one JPEG/PNG/WebP/HEIC (magic bytes checked), <=10 MB, upload deadline 120 s

| Status | When | Body |
|---|---|---|
| 200 | OCR service answered | `{"ocrData":"<OCR service response, passed through>"}` |
| 400 | no file / not an image / too large | `{"error":"No image file uploaded \| The file is not a JPEG, PNG, WebP or HEIC image \| Image is too large (10 MB maximum)."}` |
| 403 | scan limit reached | — |
| 408 | upload slower than 120 s | — |
| 500 | OCR service failed or unreachable (scan refunded) | `{"error":"OCR failed"}` |
| 503 | too many scans in flight | — (headers: Retry-After: 5) |
| 401 / 403 | invalid or missing token | see common errors |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "body": {
    "images": "<label.jpg>"
  }
}
```

### POST `/product/analyze`

AI report for a photo of any food; the verdict is scored on the server, never by the AI. Nothing is stored.

- **Auth:** token
- **Rate limit:** 20/min per user; scan quota; AI budgets (500/day server, 20/day user, 4 concurrent)
- **Data source:** OpenAI (Responses API)
- **Content type:** multipart/form-data
- **Body:**
  - `images` file (required): one JPEG/PNG/WebP, <=10 MB

| Status | When | Body |
|---|---|---|
| 200 | food recognised | `{"report":"{ is_food, kind, confidence, name, brand, description, barcode, known_product, items, categories, is_drink, quantity, ingredients{text,source}, allergens{contains,may_contain}, nutrition{basis,source,values,serving}, nova_group, additives, health_notes, safety_notes, verdict { recommended, verdict, report, missing_data }, disclaimer }","model":"<model id>"}` |
| 200 | not food | `{"report":{"is_food":false,"kind":"not_food","description":"...","disclaimer":"..."}}` |
| 400 | no file / not JPEG, PNG or WebP | — |
| 422 | AI returned no usable analysis (refunded) | — |
| 429 | AI budget used up (refunded) | — (headers: Retry-After: 60) |
| 503 | no OpenAI key, or OpenAI failed/timeout 60 s (refunded) | — |
| 401 / 403 | invalid or missing token | see common errors |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "body": {
    "images": "<photo.jpg>"
  }
}
```

## Admin

### POST `/cms/login`

Admin login for the CMS (short token lifetime).

- **Auth:** public
- **Rate limit:** same as /login
- **Data source:** DB
- **Body:**
  - `email` string (required): <=254
  - `password` string (required): <=128

| Status | When | Body |
|---|---|---|
| 200 | active admin | `{"status":200,"message":"Login successful.","user":"<public user>","token":"<short-lived JWT>"}` |
| 401 | any failure (unknown, wrong password, not admin, disabled: same answer) | `{"status":401,"message":"Invalid email or password."}` |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "body": {
    "email": "e2e-admin@example.test",
    "password": "<password>"
  }
}
```

### POST `/cms/logout`

Server-side logout (any signed-in user, not only admins).

- **Auth:** token
- **Rate limit:** none
- **Data source:** DB

| Status | When | Body |
|---|---|---|
| 200 | token_version bumped: every session of the caller ends | `{"status":200,"message":"Logged out."}` |
| 401 / 403 | invalid or missing token | see common errors |

### GET `/cms/product-review`

Products filled in by USDA/AI that no admin has confirmed yet.

- **Auth:** token, admin
- **Rate limit:** none
- **Data source:** DB
- **Query:** `page` integer: 1-500, default 1; `limit` integer: 1-100, default 20

| Status | When | Body |
|---|---|---|
| 200 | always | `{"data":"[code, product_name, brands, data_source, source_info, selected_images, image fields, created_at, updated_at]","pageInfo":{"total":0,"page":1,"pages":0}}` |
| 401 / 403 | invalid or missing token, or not allowed (403 Access forbidden.) | see common errors |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "query": {
    "page": 1,
    "limit": 20
  }
}
```

### GET `/cms/product-images`

Products whose best image is below the quality threshold (smallest first).

- **Auth:** token, admin
- **Rate limit:** none
- **Data source:** DB
- **Query:** `page` integer: 1-500, default 1; `limit` integer: 1-100, default 20

| Status | When | Body |
|---|---|---|
| 200 | always | `{"data":"[same shape as review queue]","pageInfo":"{ total, page, pages }"}` |
| 401 / 403 | invalid or missing token, or not allowed (403 Access forbidden.) | see common errors |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "query": {
    "page": 1,
    "limit": 20
  }
}
```

### GET `/users`

User management list for the CMS.

- **Auth:** token, admin
- **Rate limit:** none
- **Data source:** DB
- **Query:** `page` integer: 1-100000, default 1; `limit` integer: 1-100, default 10

| Status | When | Body |
|---|---|---|
| 200 | page has users | `{"status":200,"data":"[users without password, social_token, user_info, token_version]","pagination":{"totalUsers":8,"currentPage":1,"totalPages":1}}` |
| 404 | no users on that page | `{"status":404,"message":"No users found."}` |
| 401 / 403 | invalid or missing token, or not allowed (403 Access forbidden.) | see common errors |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "query": {
    "page": 1,
    "limit": 10
  }
}
```

### PUT `/product/update`

CMS edit/create of a product (also updates the listing row, clears caches).

- **Auth:** token, admin
- **Rate limit:** none
- **Data source:** DB
- **Body:**
  - `product_code` string (required): ^[A-Za-z0-9._-]{1,64}$
  - `product_details` object (required): known product fields only, type-coerced; product_name non-empty, <=500; body up to 2 MB
  - `expected_updated_at` ISO date: optimistic lock: 409 if the stored updatedAt differs
  - `mark_verified` boolean: confirms USDA/AI data (sets verified_at)

| Status | When | Body |
|---|---|---|
| 200 | updated | `{"message":"Product details updated successfully!"}` |
| 201 | created (data_source 'cms') | `{"message":"Product created successfully!"}` |
| 400 | invalid field values / empty name | `{"message":"Some product fields have invalid values.","fields":["..."]}` |
| 409 | stale expected_updated_at | `{"message":"This product was changed by someone else. Reload it and try again."}` |
| 401 / 403 | invalid or missing token, or not allowed (403 Access forbidden.) | see common errors |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "body": {
    "product_code": "E2ETEST0001",
    "product_details": {
      "product_name": "E2E Test Product",
      "brands": "E2E"
    }
  }
}
```

### DELETE `/product/{code}`

Remove a product from listings and search.

- **Auth:** token, admin
- **Rate limit:** none
- **Data source:** DB
- **Path params:** `code` string (required): ^[A-Za-z0-9._-]{1,64}$

| Status | When | Body |
|---|---|---|
| 200 | removed from listing/search (soft delete; details kept, scans still work) | `{"message":"Product deleted Successfully"}` |
| 404 | not listed | `{"message":"Product not found"}` |
| 401 / 403 | invalid or missing token, or not allowed (403 Access forbidden.) | see common errors |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "params": {
    "code": "E2ETEST0001"
  }
}
```

### POST `/media/upload`

CMS uploads (images kept as uploaded; unused uploads are deleted after 24 h).

- **Auth:** token, admin
- **Rate limit:** none
- **Data source:** disk, DB (mediafiles)
- **Content type:** multipart/form-data
- **Body:**
  - `images` file[]: <=10; JPEG/PNG/WebP/GIF/HEIC/HEIF (MIME + magic bytes)
  - `videos` file[]: <=5; MP4/MOV/WebM
  - `pdfs` file[]: <=5; PDF

| Status | When | Body |
|---|---|---|
| 201 | stored | `{"uploadedFiles":"[{ file_id, url, mime_type, original_filename, width?, height? }]","message":"Files uploaded successfully"}` |
| 400 | wrong type / signature / too many | `{"success":false,"message":"File upload failed","error":"<reason>"}` |
| 401 / 403 | invalid or missing token, or not allowed (403 Access forbidden.) | see common errors |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "body": {
    "images": "<front.jpg>"
  }
}
```

### DELETE `/media/{id}`

Delete an uploaded file (does not check whether a product still references it).

- **Auth:** token, admin
- **Rate limit:** none
- **Data source:** DB, disk
- **Path params:** `id` uuid (required)

| Status | When | Body |
|---|---|---|
| 200 | record and file removed | `{"message":"Media file deleted successfully"}` |
| 404 | no such file | `{"message":"File not found"}` |
| 401 / 403 | invalid or missing token, or not allowed (403 Access forbidden.) | see common errors |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "params": {
    "id": "<file_id from upload>"
  }
}
```

## Billing

### POST `/subscription/add`

Record a purchase (ledger row).

- **Auth:** token
- **Rate limit:** 10/min per user
- **Data source:** DB
- **Body:**
  - `from_date` ISO date (required): not more than 1 day in the past
  - `to_date` ISO date (required): > from_date, period <= 400 days
  - `payment_status` string (required): pending | completed | failed (trusted as sent while SUBSCRIPTION_VERIFICATION=client)
  - `transaction_id` string (required): <=255, unique

| Status | When | Body |
|---|---|---|
| 201 | recorded | `{"message":"Subscription added successfully","subscription":"<row>"}` |
| 400 | invalid period | `{"message":"Invalid subscription period"}` |
| 409 | already active / duplicate transaction_id | — |
| 401 / 403 | invalid or missing token | see common errors |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "body": {
    "from_date": "<now ISO>",
    "to_date": "<now+30d ISO>",
    "payment_status": "pending",
    "transaction_id": "e2e-<run>-1"
  }
}
```

### PUT `/subscription/extend`

Extend from the current end date.

- **Auth:** token
- **Rate limit:** 10/min per user
- **Data source:** DB
- **Body:**
  - `additional_days` integer (required): 1-400
  - `payment_status` string (required): pending | completed | failed
  - `transaction_id` string (required): <=255, unique

| Status | When | Body |
|---|---|---|
| 200 | paid extension of an active period | `{"message":"Subscription extended successfully","new_end_date":"<ISO>"}` |
| 201 | no active period (or not completed): new row | `{"message":"New subscription created successfully","new_subscription":"<row>"}` |
| 400 | period too long | — |
| 409 | duplicate transaction_id | — |
| 401 / 403 | invalid or missing token | see common errors |
| 400 | Joi validation failed | see common errors |

Example:

```json
{
  "body": {
    "additional_days": 30,
    "payment_status": "pending",
    "transaction_id": "e2e-<run>-2"
  }
}
```

### GET `/identifiers`

In-app purchase product identifiers and prices.

- **Auth:** public
- **Rate limit:** none
- **Data source:** DB

| Status | When | Body |
|---|---|---|
| 200 | always | `{"identifiers":"[{ id, identifier: 'com.myfoodapp.tierN', price, created_at, updated_at, deleted_at }]"}` |
| 500 | DB error | `{"status":"error","message":"Internal server error"}` |
