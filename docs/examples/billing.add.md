# POST `/subscription/add`

Record a purchase (ledger row).

## Example: records a pending purchase (201)

`POST http://api-t:9595/subscription/add` → **HTTP 201** in 19 ms

Request body:

```json
{
  "from_date": "2026-11-17T12:47:09.492Z",
  "to_date": "2026-12-17T12:47:09.492Z",
  "payment_status": "pending",
  "transaction_id": "e2e-20261117181235ad65-1"
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
    "id": "e93f97d9-744c-4790-8b3a-1ce085b88ef0",
    "user_id": "335eb8c1-8000-405e-8c40-55ea88fbc390",
    "from_date": "2026-11-17T12:47:09.492Z",
    "to_date": "2026-12-17T12:47:09.492Z",
    "payment_status": "pending",
    "transaction_id": "e2e-20261117181235ad65-1",
    "updatedAt": "2026-11-17T12:47:09.505Z",
    "createdAt": "2026-11-17T12:47:09.505Z",
    "deletedAt": null
  }
}
```

## Failing case: a client cannot grant itself a paid subscription (payment_status from the app is not trusted)

`POST http://api-t:9595/subscription/add` → **HTTP 201** in 7 ms

Request body:

```json
{
  "from_date": "2026-11-17T12:47:09.540Z",
  "to_date": "2026-12-17T12:47:09.540Z",
  "payment_status": "completed",
  "transaction_id": "e2e-20261117181235ad65-3"
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
    "id": "408bcaf8-4e98-437a-8cef-6d6c8e3a0cb4",
    "user_id": "e48673a4-3c53-4e51-96c8-b037f80ac046",
    "from_date": "2026-11-17T12:47:09.540Z",
    "to_date": "2026-12-17T12:47:09.540Z",
    "payment_status": "completed",
    "transaction_id": "e2e-20261117181235ad65-3",
    "updatedAt": "2026-11-17T12:47:09.545Z",
    "createdAt": "2026-11-17T12:47:09.545Z",
    "deletedAt": null
  }
}
```

Failure:

```text
stored as completed: unlimited scans without any purchase verification: expected 'completed' not to be 'completed' // Object.is equality
```
