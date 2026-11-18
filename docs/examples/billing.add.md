# POST `/subscription/add`

Record a purchase (ledger row).

## Example: records a pending purchase (201)

`POST http://api-t:9595/subscription/add` → **HTTP 201** in 9 ms

Request body:

```json
{
  "from_date": "2026-11-18T10:12:15.728Z",
  "to_date": "2026-12-18T10:12:15.728Z",
  "payment_status": "pending",
  "transaction_id": "e2e-202611181538303f52-1"
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
    "id": "09419df3-3ca1-4778-af2d-ab59314a726f",
    "user_id": "9dfc3e59-669d-4c1a-87f6-e073b6a4a5bd",
    "from_date": "2026-11-18T10:12:15.728Z",
    "to_date": "2026-12-18T10:12:15.728Z",
    "payment_status": "pending",
    "transaction_id": "e2e-202611181538303f52-1",
    "updatedAt": "2026-11-18T10:12:15.734Z",
    "createdAt": "2026-11-18T10:12:15.734Z",
    "deletedAt": null
  }
}
```

## Failing case: a client cannot grant itself a paid subscription (payment_status from the app is not trusted)

`POST http://api-t:9595/subscription/add` → **HTTP 201** in 6 ms

Request body:

```json
{
  "from_date": "2026-11-18T10:12:15.754Z",
  "to_date": "2026-12-18T10:12:15.754Z",
  "payment_status": "completed",
  "transaction_id": "e2e-202611181538303f52-3"
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
    "id": "95539d77-15a6-4c9e-8aeb-cb63f484769e",
    "user_id": "1fe439fc-d120-4560-beb0-8c87ee92badf",
    "from_date": "2026-11-18T10:12:15.754Z",
    "to_date": "2026-12-18T10:12:15.754Z",
    "payment_status": "completed",
    "transaction_id": "e2e-202611181538303f52-3",
    "updatedAt": "2026-11-18T10:12:15.758Z",
    "createdAt": "2026-11-18T10:12:15.758Z",
    "deletedAt": null
  }
}
```

Failure:

```text
stored as completed: unlimited scans without any purchase verification: expected 'completed' not to be 'completed' // Object.is equality
```
