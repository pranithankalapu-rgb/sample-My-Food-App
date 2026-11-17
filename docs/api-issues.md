# API issues found by the test suite

Baseline run `20261117154441af16`, backend `eb7971e`: **441 cases, 421 passed, 20 failed**, all 33 endpoints tested. The full results are in [api-test-report.md](api-test-report.md), on the Test Dashboard (http://localhost:4200/#/tests) and in `test-results/results.json`.

Every failure below is real: backend behaviour, stored data, an external service, or the CMS. None comes from the test harness. Harness problems found while building the suite (rate-limited setup, selectors, my own documentation error on the verdict shape, an Open Food Facts rate limit misread as "not found") were fixed before this baseline.

**Status** is either **Open** (waiting for approval, Checkpoint 2) or **Fixed** (with the commit on `fix/api-hardening`).

| # | Severity | Endpoint | Problem | Evidence | Status |
|---|---|---|---|---|---|
| 1 | **High** | `POST /subscription/add`, `PUT /subscription/extend` | A client can give itself a paid subscription: `payment_status: "completed"` sent by the app is stored as sent (`SUBSCRIPTION_VERIFICATION=client`), which means unlimited scans with no purchase check | `POST /subscription/add {payment_status:"completed"}` → 201, then `GET /user/{id}` shows `active_subscription` set | Open |
| 2 | **High** | `GET /product/{code}` | No barcode validation before external lookups. Letters, wrong lengths and bad check digits go to Open Food Facts **and the paid AI fallback**, and junk can be stored | `GET /product/ABCDEFGH` → 404 after an OpenAI call (~10k tokens). `GET /product/1234` → **200**, a product named "Barcode 1234 ist nur ein Platzhalter, nicht ausfüllen" is stored. `GET /product/8715700407761` (typo, check digit should be 0) → OpenAI call | Open |
| 3 | Medium | `POST /product/analyze` (and every AI path) | The background fill-in of missing images/nutrition spends the AI budget on its own; a user's photo analysis was then refused | Test-stack log: AI lookup for `8000500037560` (`found:true`) that no test asked for; `POST /product/analyze` → **429** "Too many photo analyses" | Open |
| 4 | Medium | `GET /product`, `/product/search`, `GET /product/{code}` | `image_thumb_url` is the full-size original for uploaded images | 80 of 103 thumbnails are originals; **65 MB** for all thumbnails; Lighthouse product page LCP 11 s (desktop, simulated throttling) | Open |
| 5 | Medium | `GET /product/{code}` (stored data) | Ingredient lists: 14 of 20 sampled have problems | 6 end with a separator (e.g. Tomato Ketchup BIO "…garlic powder,"); 2 are **not English although Open Food Facts has English** (Fibres `7300400481588`, Solero `8712100889288`: "Ingrédients LAIT écrémé…" vs OFF "reconstituted skimmed milk…"); 5 have no English version anywhere (fr/es/lb); 1 contains Open Food Facts markup `_oat_` (Flocons d'avoine) | Open |
| 6 | Medium | `GET /product/{code}` | Accuracy vs live Open Food Facts: 2 of 20 differ, both on ingredient language (see #5); name, brand, 5 nutrients and images match for all 20 | Solero 13% word overlap, Pur beurre de cacahuète 8% (stored French, OFF has English) | Open |
| 7 | Medium | `POST /product/search` (filters), listing data | Country names in the listing mix languages, so a country filter misses products | `filters:[{countries:"Allemagne"}]` → 17 products that `"Germany"` (10) does not return; also Maroc, Suisse, Belgique, Espagne | Open |
| 8 | Medium | `POST /product/scan` | The OCR service is down, and the API reports it as **500** "OCR failed" after ~21 s. It should be 502/503 with Retry-After, and fail faster | `POST /product/scan` → 500 `{"error":"OCR failed"}`; p50 21.1 s, p95 22.1 s; the host itself times out | Open (service outside this repo) |
| 9 | Medium | `GET /product/{code}` (AI path) | A barcode nobody knows takes 9–11 s (Open Food Facts miss + OpenAI) and up to 25 s before "still looking" | AI fallback p50 8.9 s, p95 11.0 s; slow-OpenAI test answers 404 `lookup_pending` after 25.5 s (by design: `FALLBACK_WAIT_MS`) | Open (recommendation) |
| 10 | Low | `POST /product/search` | One-letter and stopword searches return nothing, with no hint | `{query:"a"}` → `totalSearchResultsCount:"0"` | Open |
| 11 | Low | `POST /product/category`, `/product/additives` | Results have no image fields, unlike browse and search | Response rows lack `image_url` / `image_thumb_url` | Open |
| 12 | Low | CMS (`cms_myfoodproductapp`) | The product list shows no thumbnails | `.products-grid .card img` not found (both phases) | Open (CMS repo, not the API) |
| 13 | Low | many | Five different error body shapes (`{error,message,details}`, `{status,message}`, `{message}`, `{error}`, `{status:"error",message}`) | Phase 1 audit; the app's client handles all five | Open |
| 14 | Low | `GET /health` | Static `{status:"ok"}`: it doesn't check the database, Open Food Facts or OpenAI | Phase 1 audit | Open |
| 15 | Low | `DELETE /media/{id}` | Deletes a file even when a product still uses it (broken image URL afterwards) | Phase 1 code audit (not exercised destructively) | Open |

## What works well (verified)

- **Auth and authorization:** every protected route refuses no token (403), forged, expired or garbage tokens (401) and the wrong role (403). Logout and password reset revoke old tokens. Deleted accounts can't log in and free their email. Email verification and reset work end to end (mailpit).
- **Validation:** missing, wrong-type, too-long, HTML/script and SQL-like input are refused with 400, never a 500. Malformed JSON gets a fixed message.
- **Fallback order and resilience:** DB first (served with Open Food Facts down), then Open Food Facts (labelled and stored), then OpenAI. A definite miss is cached, and outages are not cached as misses. Open Food Facts down, slow or silent gives 503 with Retry-After within the 8 s timeout. OpenAI slow gives `lookup_pending` instead of hanging.
- **Speed:** every database-only endpoint has p95 ≤ 83 ms (bcrypt logins the slowest). An Open Food Facts first lookup takes p50 247 ms, p95 451 ms.
- **Rate limits:** failed logins per email and network (429 on the 11th) and catalogue queries per user (60/min) both work.
- **Persistence:** after `docker compose restart` of the backend, row counts and all 399 image files are unchanged, and every page test passes again.
- **The web app:** Lighthouse accessibility 96–100 and best practices 96–100 on every page. axe finds no serious violations. No horizontal overflow on phones.
