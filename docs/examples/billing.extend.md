# PUT `/subscription/extend`

Extend from the current end date.

## Example: without an active period it records a new one (201)

`PUT http://api-t:9595/subscription/extend` → **HTTP 201** in 9 ms

Request body:

```json
{
  "additional_days": 30,
  "payment_status": "pending",
  "transaction_id": "e2e-20261117181235ad65-9"
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
    "id": "138e3bff-5a98-4443-affc-a869a33ba989",
    "user_id": "8b0c74fa-b158-46c3-b550-732190f08fdb",
    "from_date": "2026-11-17T12:47:09.593Z",
    "to_date": "2026-12-17T12:47:09.593Z",
    "payment_status": "pending",
    "transaction_id": "e2e-20261117181235ad65-9",
    "updatedAt": "2026-11-17T12:47:09.593Z",
    "createdAt": "2026-11-17T12:47:09.593Z",
    "deletedAt": null
  }
}
```

## Error example: 400 for 0 or 401 days

`PUT http://api-t:9595/subscription/extend` → **HTTP 400** in 9 ms

Request body:

```json
{
  "additional_days": 0,
  "payment_status": "pending",
  "transaction_id": "e2e-20261117181235ad65-10"
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
  "details": "\"additional_days\" must be greater than or equal to 1",
  "status": 400
}
```
