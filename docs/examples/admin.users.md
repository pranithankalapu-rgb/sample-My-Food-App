# GET `/users`

User management list for the CMS.

## Example: users list without secrets or health data

`GET http://api-t:9595/users?page=1&limit=10` → **HTTP 200** in 8 ms

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
  "data": [
    {
      "id": "b07e8f65-3729-48cc-9949-82f777374ea1",
      "first_name": "Eetwoe",
      "last_name": "Tester",
      "email": "e2e-admin-user-20261117181235ad65-1@example.test",
      "mobile": null,
      "email_verification_status": "PENDING",
      "role": "user",
      "is_active": true,
      "type": null,
      "user_scan_count": 0,
      "last_scan_at": null,
      "createdAt": "2026-11-17T12:46:23.747Z",
      "updatedAt": "2026-11-17T12:46:23.747Z",
      "deletedAt": null
    },
    {
      "id": "fbcdc63e-0111-457c-98c6-b10b9bdea822",
      "first_name": "Admin",
      "last_name": "Tester",
      "email": "e2e-admin-t20261117181235ad65@example.test",
      "mobile": null,
      "email_verification_status": "PENDING",
      "role": "admin",
      "is_active": true,
      "type": null,
      "user_scan_count": 0,
      "last_scan_at": null,
      "createdAt": "2026-11-17T12:43:20.278Z",
      "updatedAt": "2026-11-17T12:43:20.278Z",
      "deletedAt": null
    },
    {
      "id": "17f124ae-2e07-4998-a230-1d3abcd79f3a",
      "first_name": "Eetwoe",
      "last_name": "Tester",
      "email": "e2e-tuser-20261117181235ad65@example.test",
      "mobile": null,
      "email_verification_status": "PENDING",
      "role": "user",
      "is_active": true,
      "type": null,
      "user_scan_count": 0,
      "last_scan_at": null,
      "createdAt": "2026-11-17T12:43:19.823Z",
      "updatedAt": "2026-11-17T12:43:19.823Z",
      "deletedAt": null
    },
    {
      "id": "64a5a7a4-6650-4053-a78a-a4594b792777",
      "first_name": "Test",
      "last_name": "Admin",
      "email": "admin@myfoodapp.test",
      "mobile": null,
      "email_verification_status": "PENDING",
      "role": "admin",
      "is_active": true,
      "type": null,
      "user_scan_count": 0,
      "last_scan_at": null,
      "createdAt": "2026-11-14T02:48:51.309Z",
      "updatedAt": "2026-11-14T13:33:20.027Z",
      "deletedAt": null
    }
  ],
  "pagination": {
    "totalUsers": 4,
    "currentPage": 1,
    "totalPages": 1
  }
}
```

## Error example: 400 for limit 101 or page 0

`GET http://api-t:9595/users?limit=101` → **HTTP 400** in 3 ms

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
  "error": "Bad Request",
  "message": "Please check the request inputs",
  "details": "\"limit\" must be less than or equal to 100",
  "status": 400
}
```
