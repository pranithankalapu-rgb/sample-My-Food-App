# POST `/cms/logout`

Server-side logout (any signed-in user, not only admins).

## Example: logout ends every session of the caller

`POST http://api-perf:9595/user` → **HTTP 201** in 57 ms

Request body:

```json
{
  "first_name": "Eetwoe",
  "last_name": "Tester",
  "email": "e2e-logout-20261117154441af16-2@example.test",
  "password": "<redacted>",
  "repassword": "<redacted>"
}
```

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
  "status": 201,
  "message": "User created successfully.",
  "user": {
    "id": "45d127ac-77e9-46b7-9e76-55d187fd76ed",
    "first_name": "Eetwoe",
    "last_name": "Tester",
    "email": "e2e-logout-20261117154441af16-2@example.test",
    "email_verification_status": "PENDING",
    "is_active": true,
    "role": "user",
    "updatedAt": "2026-11-17T10:19:45.799Z",
    "createdAt": "2026-11-17T10:19:45.799Z",
    "mobile": null,
    "user_info": null,
    "type": null,
    "user_scan_count": 0,
    "last_scan_at": null,
    "deletedAt": null
  }
}
```

## Error example: 403 without a token

`POST http://api-t:9595/cms/logout` → **HTTP 403** in 1 ms

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
  "message": "A token is required for authentication"
}
```
