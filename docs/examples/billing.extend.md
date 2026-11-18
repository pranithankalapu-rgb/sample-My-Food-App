# PUT `/subscription/extend`

Extend from the current end date.

## Example: without an active period it records a new one (201)

`PUT http://api-t:9595/subscription/extend` → **HTTP 201** in 7 ms

Request body:

```json
{
  "additional_days": 30,
  "payment_status": "pending",
  "transaction_id": "e2e-202611181538303f52-9"
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
    "id": "58d15e8f-488f-4e59-84cd-e597f4c7c4ad",
    "user_id": "1d498bbd-e1b6-438f-8067-a774d5edd1d2",
    "from_date": "2026-11-18T10:12:15.799Z",
    "to_date": "2026-12-18T10:12:15.799Z",
    "payment_status": "pending",
    "transaction_id": "e2e-202611181538303f52-9",
    "updatedAt": "2026-11-18T10:12:15.799Z",
    "createdAt": "2026-11-18T10:12:15.799Z",
    "deletedAt": null
  }
}
```

## Error example: 400 for 0 or 401 days

`PUT http://api-t:9595/subscription/extend` → **HTTP 400** in 3 ms

Request body:

```json
{
  "additional_days": 0,
  "payment_status": "pending",
  "transaction_id": "e2e-202611181538303f52-10"
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
