# GET `/users`

User management list for the CMS.

## Example: users list without secrets or health data

`GET http://api-t:9595/users?page=1&limit=10` → **HTTP 200** in 6 ms

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
      "id": "fceeeffc-1967-45ed-b0b6-0deb2e3d70ed",
      "first_name": "Eetwoe",
      "last_name": "Tester",
      "email": "e2e-admin-user-202611181538303f52-1@example.test",
      "mobile": null,
      "email_verification_status": "PENDING",
      "role": "user",
      "is_active": true,
      "type": null,
      "user_scan_count": 0,
      "last_scan_at": null,
      "createdAt": "2026-11-18T10:11:26.088Z",
      "updatedAt": "2026-11-18T10:11:26.088Z",
      "deletedAt": null
    },
    {
      "id": "99d263fe-c22c-497c-9e87-a6c9be385197",
      "first_name": "Admin",
      "last_name": "Tester",
      "email": "e2e-admin-t202611181538303f52@example.test",
      "mobile": null,
      "email_verification_status": "PENDING",
      "role": "admin",
      "is_active": true,
      "type": null,
      "user_scan_count": 0,
      "last_scan_at": null,
      "createdAt": "2026-11-18T10:09:07.397Z",
      "updatedAt": "2026-11-18T10:09:07.397Z",
      "deletedAt": null
    },
    {
      "id": "c6037787-86a2-4aed-a197-09574c7a9249",
      "first_name": "Eetwoe",
      "last_name": "Tester",
      "email": "e2e-tuser-202611181538303f52@example.test",
      "mobile": null,
      "email_verification_status": "PENDING",
      "role": "user",
      "is_active": true,
      "type": null,
      "user_scan_count": 0,
      "last_scan_at": null,
      "createdAt": "2026-11-18T10:09:06.958Z",
      "updatedAt": "2026-11-18T10:09:06.958Z",
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
