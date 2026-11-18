# POST `/user`

Create an account. Email verification is not required to log in.

## Example: creates a user: 201 with the public user, no password

`POST http://api-t:9595/user` → **HTTP 201** in 101 ms

Request body:

```json
{
  "first_name": "Ada",
  "last_name": "Tester",
  "email": "e2e-signup-202611181538303f52-1@example.test",
  "password": "<redacted>",
  "repassword": "<redacted>"
}
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=20, remaining=19, reset=3600
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
    "id": "7e52294a-624a-4014-a92b-4119f55b4b75",
    "first_name": "Ada",
    "last_name": "Tester",
    "email": "e2e-signup-202611181538303f52-1@example.test",
    "email_verification_status": "PENDING",
    "is_active": true,
    "role": "user",
    "updatedAt": "2026-11-18T10:11:21.035Z",
    "createdAt": "2026-11-18T10:11:21.035Z",
    "mobile": null,
    "user_info": null,
    "type": null,
    "user_scan_count": 0,
    "last_scan_at": null,
    "deletedAt": null
  }
}
```

## Error example: 400 when first_name is missing

`POST http://api-perf:9595/user` → **HTTP 400** in 5 ms

Request body:

```json
{
  "last_name": "Tester",
  "email": "e2e-signup-202611181538303f52-3@example.test",
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
  "status": 400,
  "message": "First name, last name, email, password, and repassword are required."
}
```
