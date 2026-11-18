# POST `/user/verify`

Confirm the email address with the emailed code.

## Example: the emailed code verifies the account

`POST http://api-perf:9595/user` → **HTTP 201** in 70 ms

Request body:

```json
{
  "first_name": "Eetwoe",
  "last_name": "Tester",
  "email": "e2e-verify-20261117181235ad65-3@example.test",
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
    "id": "f78c58bb-d892-4e2a-b277-617624f77f8d",
    "first_name": "Eetwoe",
    "last_name": "Tester",
    "email": "e2e-verify-20261117181235ad65-3@example.test",
    "email_verification_status": "PENDING",
    "is_active": true,
    "role": "user",
    "updatedAt": "2026-11-17T12:46:22.158Z",
    "createdAt": "2026-11-17T12:46:22.158Z",
    "mobile": null,
    "user_info": null,
    "type": null,
    "user_scan_count": 0,
    "last_scan_at": null,
    "deletedAt": null
  }
}
```

## Error example: 400 for a 17-character code

`POST http://api-t:9595/user/verify` → **HTTP 400** in 2 ms

Request body:

```json
{
  "email": "e2e-x-20261117181235ad65-22@example.test",
  "code": "<redacted>"
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
  "error": "Bad Request",
  "message": "Please check the request inputs",
  "details": "\"code\" length must be less than or equal to 16 characters long",
  "status": 400
}
```
