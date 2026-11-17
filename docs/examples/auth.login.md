# POST `/login`

Password login for app users (and admins).

## Example: returns a token and the public user

`POST http://api:9595/user` → **HTTP 201** in 67 ms

Request body:

```json
{
  "first_name": "Eetwoe",
  "last_name": "Tester",
  "email": "e2e-login-20261117154441af16-1@example.test",
  "password": "<redacted>",
  "repassword": "<redacted>"
}
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=20, remaining=18, reset=3349
ratelimit-policy: 20;w=3600
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
    "id": "75bea866-357f-4f77-bb4d-3c5ad0ddc95c",
    "first_name": "Eetwoe",
    "last_name": "Tester",
    "email": "e2e-login-20261117154441af16-1@example.test",
    "email_verification_status": "PENDING",
    "is_active": true,
    "role": "user",
    "updatedAt": "2026-11-17T10:19:41.361Z",
    "createdAt": "2026-11-17T10:19:41.361Z",
    "mobile": null,
    "user_info": null,
    "type": null,
    "user_scan_count": 0,
    "last_scan_at": null,
    "deletedAt": null
  }
}
```

## Error example: 404 for an unknown email (kept for old app builds)

`POST http://api:9595/login` → **HTTP 404** in 62 ms

Request body:

```json
{
  "email": "e2e-nobody-20261117154441af16-19@example.test",
  "password": "<redacted>"
}
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=10, remaining=9, reset=900
ratelimit-policy: 10;w=900
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
  "status": 404,
  "message": "User not found."
}
```
