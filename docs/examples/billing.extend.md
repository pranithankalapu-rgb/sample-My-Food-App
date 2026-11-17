# PUT `/subscription/extend`

Extend from the current end date.

## Example: without an active period it records a new one (201)

`PUT http://api-t:9595/subscription/extend` → **HTTP 201** in 6 ms

Request body:

```json
{
  "additional_days": 30,
  "payment_status": "pending",
  "transaction_id": "e2e-20261117154441af16-9"
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
  "message": "New subscription created successfully",
  "new_subscription": {
    "id": "7b49d0bc-b6cc-4e29-baae-22b4cf49bead",
    "user_id": "4545d918-ca0a-4051-b770-73fb453234d9",
    "from_date": "2026-11-17T10:20:33.826Z",
    "to_date": "2026-12-17T10:20:33.826Z",
    "payment_status": "pending",
    "transaction_id": "e2e-20261117154441af16-9",
    "updatedAt": "2026-11-17T10:20:33.827Z",
    "createdAt": "2026-11-17T10:20:33.827Z",
    "deletedAt": null
  }
}
```

## Error example: 400 for 0 or 401 days

`PUT http://api-t:9595/subscription/extend` → **HTTP 400** in 2 ms

Request body:

```json
{
  "additional_days": 0,
  "payment_status": "pending",
  "transaction_id": "e2e-20261117154441af16-10"
}
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=10, remaining=8, reset=60
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
  "error": "Bad Request",
  "message": "Please check the request inputs",
  "details": "\"additional_days\" must be greater than or equal to 1"
}
```
