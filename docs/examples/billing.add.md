# POST `/subscription/add`

Record a purchase (ledger row).

## Example: records a pending purchase (201)

`POST http://api-t:9595/subscription/add` → **HTTP 201** in 8 ms

Request body:

```json
{
  "from_date": "2026-11-17T10:20:33.762Z",
  "to_date": "2026-12-17T10:20:33.762Z",
  "payment_status": "pending",
  "transaction_id": "e2e-20261117154441af16-1"
}
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=10, remaining=9, reset=60
ratelimit-policy: 10;w=60
x-content-type-options: nosniff
x-dns-prefetch-control: off
x-download-options: noopen
x-frame-options: SAMEORIGIN
x-permitted-cross-domain-policies: none
x-xss-protection: 0
```

Response body:

```json
{
  "message": "Subscription added successfully",
  "subscription": {
    "id": "fab0f152-1c7e-4218-9bb1-38ca9d292a9b",
    "user_id": "41486112-298f-490f-a0a4-e415813e078d",
    "from_date": "2026-11-17T10:20:33.762Z",
    "to_date": "2026-12-17T10:20:33.762Z",
    "payment_status": "pending",
    "transaction_id": "e2e-20261117154441af16-1",
    "updatedAt": "2026-11-17T10:20:33.768Z",
    "createdAt": "2026-11-17T10:20:33.768Z",
    "deletedAt": null
  }
}
```

## Failing case: a client cannot grant itself a paid subscription (payment_status from the app is not trusted)

`POST http://api-t:9595/subscription/add` → **HTTP 201** in 5 ms

Request body:

```json
{
  "from_date": "2026-11-17T10:20:33.786Z",
  "to_date": "2026-12-17T10:20:33.786Z",
  "payment_status": "completed",
  "transaction_id": "e2e-20261117154441af16-3"
}
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=10, remaining=9, reset=60
ratelimit-policy: 10;w=60
x-content-type-options: nosniff
x-dns-prefetch-control: off
x-download-options: noopen
x-frame-options: SAMEORIGIN
x-permitted-cross-domain-policies: none
x-xss-protection: 0
```

Response body:

```json
{
  "message": "Subscription added successfully",
  "subscription": {
    "id": "aa343275-146e-4fd9-a0ce-42475baca66b",
    "user_id": "9e5a4335-919e-4ba2-9237-2ba7b8b4295d",
    "from_date": "2026-11-17T10:20:33.786Z",
    "to_date": "2026-12-17T10:20:33.786Z",
    "payment_status": "completed",
    "transaction_id": "e2e-20261117154441af16-3",
    "updatedAt": "2026-11-17T10:20:33.789Z",
    "createdAt": "2026-11-17T10:20:33.789Z",
    "deletedAt": null
  }
}
```

Failure:

```text
stored as completed: unlimited scans without any purchase verification: expected 'completed' not to be 'completed' // Object.is equality
```
