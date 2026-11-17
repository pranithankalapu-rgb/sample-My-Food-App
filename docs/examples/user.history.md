# GET `/product/history/user/{id}`

The user's recently scanned products (admins are never recorded).

## Example: lists a looked-up product once, newest first; the scan is counted once

`GET http://api:9595/user/b6aa6d4b-d8da-4218-afae-a318e6c916f5` → **HTTP 200** in 3 ms

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
    "id": "b6aa6d4b-d8da-4218-afae-a318e6c916f5",
    "first_name": "Eetwoe",
    "last_name": "Tester",
    "email": "e2e-user-20261117154441af16-1@example.test",
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
    "createdAt": "2026-11-17T10:20:32.256Z",
    "updatedAt": "2026-11-17T10:20:32.556Z",
    "deletedAt": null,
    "total_scan_limit": 100,
    "subscription_details": [],
    "active_subscription": null
  }
}
```

## Error example: 403 for another user's history

`GET http://api:9595/product/history/user/46257fb3-516e-441f-876d-97ee554aa146` → **HTTP 403** in 2 ms

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
