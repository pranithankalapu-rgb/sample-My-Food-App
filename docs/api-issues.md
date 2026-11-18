# API issues found by the test suite

**Before:** baseline run `20261117154441af16`, backend `eb7971e`: **441 cases, 421 passed, 20 failed**, 33 endpoints.
**After:** run `20261117181235ad65`, backend `92ca6d9` (`fix/api-hardening`): **446 cases, 430 passed, 16 failed**, 34 endpoints (`GET /health/deps` added). Full results: [api-test-report.md](api-test-report.md) (with a before/after section), `test-results/report.html` and the Test Dashboard (http://localhost:4200/#/tests).

Every failure is real: backend behaviour, stored data, an external service or the CMS. Test changes after the baseline only follow agreed behaviour changes, and none of them loosens a check:
- the endpoint count went from 33 to 34;
- a country filter may now return the country's other stored names;
- the old country check is now two: a filter check, and a strict check that stored names are a single language, which still fails;
- the speed-test API's AI cap went from 3 to 5, so `/product/analyze` is actually measured;
- barcode, OCR and `/health/deps` expectations follow the approved changes.

**Status:**
- **Fixed:** commit on `fix/api-hardening`, unit or integration tests in the backend; Jest passes 459 of 459.
- **Partly fixed:** see the evidence.
- **Not fixed:** the reason is given.

| # | Severity | Endpoint | Problem (before) | After (evidence) | Status |
|---|---|---|---|---|---|
| 1 | **High** | `POST /subscription/add`, `PUT /subscription/extend` | A client can give itself a paid subscription: `payment_status: "completed"` is stored as sent | Unchanged on purpose. Strict mode stays off (decision at Checkpoint 2). The risk, a read-only check query and an 8-step receipt verification plan are in the backend's `docs/BILLING.md` (`92ca6d9`) | **Not fixed**: documented, planned as separate work |
| 2 | **High** | `GET /product/{code}` | No barcode validation before Open Food Facts and the paid AI; `1234` stored a junk product | Letters, wrong lengths and bad check digits → 404 `reason:"invalid_barcode"` in < 500 ms, no external call (3 tests now pass) | **Fixed** `da3f901` |
| 3 | Medium | `POST /product/analyze` (every AI path) | The background fill-in spent the user's AI budget, so the user was refused (429) | Background calls have their own daily cap (`AI_ENRICH_MAX_PER_DAY`). All 5 photo tests pass on `api-t`. The speed sample now returns 200 in 6.35 s | **Fixed** `859e643` |
| 4 | Medium | `GET /product`, `/product/search`, `GET /product/{code}` | `image_thumb_url` was the full-size original (65 MB of thumbnails) | Real 400 px WebP thumbnails on first request; "thumbnails are smaller than the full image" passes | **Fixed** `288d028` |
| 5 | Medium | `GET /product/{code}` (stored data) | Ingredient lists: markup, trailing separators, not English | New lookups and imports are cleaned (`16c3d10`). Stored lists were cleaned on 2026-11-18 by `z/clean_ingredients_text.js`: 38 of 103 changed, 0 admin-edited skipped, a dry run afterwards finds 0 left, and the old texts are backed up in `../backups/ingredients-backup-20261118T055142Z.json`. The after-run above predates this cleanup. Lists Open Food Facts has only in French or Spanish, or whose "English" field is another language or another recipe, stay as they are: there is nothing correct to replace them with | **Partly fixed** |
| 6 | Medium | `GET /product/{code}` | Accuracy vs live Open Food Facts: 2 of 20 differ (ingredient language) | 20 of 20 match (name, brand, 5 nutrients, ingredients, image) | **Fixed** `16c3d10` |
| 7 | Medium | `POST /product/search` (filters) | A country filter missed products stored under another language ("Allemagne" vs "Germany") | Filters match every known name of the country; "Germany" finds all 38. Stored names are still mixed (17 of 38 German products say "Allemagne"), which the strict check still reports | **Fixed** (filter) `c258e31`; stored names not changed |
| 8 | Medium | `POST /product/scan` | OCR down → **500** after ~22 s | **503** + `Retry-After: 30`, `reason:"ocr_unavailable"`, after 10 s (p95 22.08 s → 10.04 s). The OCR service itself is still down | **Fixed** (API side) `5d38253`; service outside this repo |
| 9 | Medium | `GET /product/{code}` (AI path) | Unknown barcodes take 9–11 s (Open Food Facts miss + OpenAI) | p95 11.46 s, unchanged | **Not fixed**: recommendation (below) |
| 10 | Low | `POST /product/search` | One-letter and stopword searches returned nothing | They match names starting with the text | **Fixed** `8e6da15` |
| 11 | Low | `POST /product/category`, `/product/additives` | No image fields | `image_url` / `image_thumb_url` added (additive) | **Fixed** `1acfc10` |
| 12 | Low | CMS (`cms_myfoodproductapp`) | The product list shows no thumbnails | Unchanged | **Not fixed**: CMS repo, out of scope |
| 13 | Low | many | Five error body shapes | Every JSON error now also carries a numeric `status` and a `message` (additive, nothing removed) | **Fixed** `26e35d0` |
| 14 | Low | `GET /health` | Static; checks nothing | New `GET /health/deps`: database, Open Food Facts, OpenAI, OCR (up/down/disabled/misconfigured, cached 30 s). `/health` unchanged | **Fixed** `25d456b` |
| 15 | Low | `DELETE /media/{id}` | Deleted files still used by a product | 409 with the product code | **Fixed** `b80e02e` |
| 16 | Low | Listing data | Country values that are not country names (JSON fragments, and the same country in several languages) | Found while testing #7; data only | **Not fixed**: data cleanup to plan |

### Failures in the after-run that are not product issues

The after-run also has 3 fallback failures that are not on the list above:
- "3. OpenAI last" and "4. a definite miss is remembered": a 503 instead of a 404.
- "OFF down … the outage is not remembered" (a 4th, "OFF slow", failed in its toxiproxy reset hook).

All four passed in the previous run against the **same backend image** (`92ca6d9`), and the test file was not changed. In this run Open Food Facts answered the test API with a 503 in 0.5 s while no fault was injected, the first Open Food Facts lookup took 65 s, and the toxiproxy admin call timed out. **Likely cause:** Open Food Facts degraded or rate-limited during the run. This is not confirmed by a re-run; the next full run will show whether these tests pass again.

**Lighthouse (desktop):** Search best practices 100 → 96, and Test Dashboard performance 52 → 34 (the dashboard renders a larger `results.json`). These have not been investigated yet. Every other page is the same or within ±5.

## Recommendations, ranked by impact and effort

| Rank | Recommendation | Impact | Effort |
|---|---|---|---|
| 1 | **Verify purchases on the server** (#1): App Store / Play receipt validation, then turn on strict mode (plan in `docs/BILLING.md`) | High: free unlimited scans for anyone who edits a request | 3–5 days |
| 2 | **Restore or replace the OCR service** (#8): label scans fail for every user while it is down; `/health/deps` now shows it | High | Ops, outside the API |
| 3 | **Re-check ingredient lists** (#5): the stored cleanup ran on 2026-11-18; the next full run should show the trailing-separator and markup problems gone | Medium | One test run |
| 4 | **Faster AI path** (#9): answer `lookup_pending` sooner (lower `FALLBACK_WAIT_MS`), let the app poll, and use a faster model for barcode lookups | Medium: 10 s waits for unknown barcodes | 1–2 days |
| 5 | **Normalise stored country names** (#7, #16) to the English list, with a migration and backup; the filter already copes | Low–medium | 1 day |
| 6 | **CMS thumbnails** (#12): show `image_thumb_url` on the CMS product cards | Low | Hours (CMS repo) |
| 7 | **Monitor `/health/deps`** and alert on "down" or "misconfigured" | Medium | Hours |
| 8 | **Product page image** (Lighthouse 69 desktop): serve a resized display image instead of the original | Low–medium | Hours |

## What works well (verified)

- **Auth and authorization:** every protected route refuses no token (403), forged, expired or garbage tokens (401) and the wrong role (403). Logout and password reset revoke old tokens. Deleted accounts can't log in and free their email. Email verification and reset work end to end (mailpit).
- **Validation:** missing, wrong-type, too-long, HTML/script and SQL-like input are refused with 400, never a 500. Malformed JSON gets a fixed message.
- **Fallback order and resilience:** DB first (served with Open Food Facts down), then Open Food Facts (labelled and stored), then OpenAI. A definite miss is cached, and outages are not cached as misses. Open Food Facts down, slow or silent gives 503 with Retry-After within the 8 s timeout. OpenAI slow gives `lookup_pending` instead of hanging.
- **Speed:** every database-only endpoint has p95 ≤ 83 ms (bcrypt logins the slowest). An Open Food Facts first lookup takes p50 247 ms, p95 451 ms.
- **Rate limits:** failed logins per email and network (429 on the 11th) and catalogue queries per user (60/min) both work.
- **Persistence:** after `docker compose restart` of the backend, row counts and all 399 image files are unchanged, and every page test passes again.
- **The web app:** Lighthouse accessibility 96–100 and best practices 96–100 on every page. axe finds no serious violations. No horizontal overflow on phones.
