# GET `/product/history/user/{id}`

The user's recently scanned products (admins are never recorded).

## Example: lists a looked-up product once, newest first; the scan is counted once

`GET http://api:9595/user/9e7d2d52-ebff-4a73-8c61-23a2b115bf8e` → **HTTP 200** in 8 ms

Response headers:

```text
content-type: application/json; charset=utf-8
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
  "status": 200,
  "user": {
    "id": "9e7d2d52-ebff-4a73-8c61-23a2b115bf8e",
    "first_name": "Eetwoe",
    "last_name": "Tester",
    "email": "e2e-user-20261117181235ad65-1@example.test",
    "mobile": null,
    "email_verification_status": "PENDING",
    "user_info": {
      "notes": "Zoë's \"no-nuts\" diet; DROP TABLE users;--",
      "allergens": [
        "en:milk"
      ],
      "allergies": [
        "milk"
      ],
      "health_conditions": [
        "diabetes"
      ]
    },
    "role": "user",
    "is_active": true,
    "type": null,
    "user_scan_count": 0,
    "last_scan_at": null,
    "createdAt": "2026-11-17T12:47:07.432Z",
    "updatedAt": "2026-11-17T12:47:07.800Z",
    "deletedAt": null,
    "total_scan_limit": 100,
    "subscription_details": [],
    "active_subscription": null
  }
}
```

## Error example: 403 for another user's history

`GET http://api:9595/product/history/user/30b0172d-b5fa-4803-9885-05429fb2e760` → **HTTP 403** in 5 ms

Response headers:

```text
content-type: application/json; charset=utf-8
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
  "status": 403,
  "message": "Access forbidden."
}
```
