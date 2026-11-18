# GET `/user/{id}`

Profile, scan quota and subscriptions.

## Example: returns the caller's profile with quota and subscriptions

`GET http://api:9595/user/39c08095-1235-49d7-9338-591a5b0b9fee` → **HTTP 200** in 5 ms

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
    "id": "39c08095-1235-49d7-9338-591a5b0b9fee",
    "first_name": "Eetwoe",
    "last_name": "Tester",
    "email": "e2e-user-202611181538303f52-1@example.test",
    "mobile": null,
    "email_verification_status": "PENDING",
    "user_info": null,
    "role": "user",
    "is_active": true,
    "type": null,
    "user_scan_count": 0,
    "last_scan_at": null,
    "createdAt": "2026-11-18T10:12:14.128Z",
    "updatedAt": "2026-11-18T10:12:14.128Z",
    "deletedAt": null,
    "total_scan_limit": 100,
    "subscription_details": [],
    "active_subscription": null
  }
}
```

## Error example: 403 for another user's profile

`GET http://api:9595/user/117fcf0d-bcce-4521-9192-e26ac714d413` → **HTTP 403** in 3 ms

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
