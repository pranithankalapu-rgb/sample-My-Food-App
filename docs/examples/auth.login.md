# POST `/login`

Password login for app users (and admins).

## Example: returns a token and the public user

`POST http://api:9595/user` → **HTTP 201** in 85 ms

Request body:

```json
{
  "first_name": "Eetwoe",
  "last_name": "Tester",
  "email": "e2e-login-202611181538303f52-1@example.test",
  "password": "<redacted>",
  "repassword": "<redacted>"
}
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=20, remaining=18, reset=3477
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
    "id": "d42b05a9-fb43-4f11-bf9a-ac78571971c5",
    "first_name": "Eetwoe",
    "last_name": "Tester",
    "email": "e2e-login-202611181538303f52-1@example.test",
    "email_verification_status": "PENDING",
    "is_active": true,
    "role": "user",
    "updatedAt": "2026-11-18T10:11:21.669Z",
    "createdAt": "2026-11-18T10:11:21.669Z",
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

`POST http://api:9595/login` → **HTTP 404** in 57 ms

Request body:

```json
{
  "email": "e2e-nobody-202611181538303f52-19@example.test",
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
