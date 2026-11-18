# POST `/user/changepassword`

Reset the password with the emailed code (bumps token_version).

## Example: the emailed code changes the password and ends old sessions

`POST http://api-perf:9595/user` → **HTTP 201** in 79 ms

Request body:

```json
{
  "first_name": "Eetwoe",
  "last_name": "Tester",
  "email": "e2e-reset-20261117181235ad65-5@example.test",
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
    "id": "28e79e12-957a-46cc-a187-29abd2b683d3",
    "first_name": "Eetwoe",
    "last_name": "Tester",
    "email": "e2e-reset-20261117181235ad65-5@example.test",
    "email_verification_status": "PENDING",
    "is_active": true,
    "role": "user",
    "updatedAt": "2026-11-17T12:46:22.500Z",
    "createdAt": "2026-11-17T12:46:22.500Z",
    "mobile": null,
    "user_info": null,
    "type": null,
    "user_scan_count": 0,
    "last_scan_at": null,
    "deletedAt": null
  }
}
```

## Error example: 404 for a wrong code

`POST http://api-t:9595/user/changepassword` → **HTTP 404** in 3 ms

Request body:

```json
{
  "email": "e2e-x-20261117181235ad65-24@example.test",
  "code": "<redacted>",
  "new_password": "<redacted>"
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
  "status": "error",
  "message": "Invalid email or verification code or code expired"
}
```
