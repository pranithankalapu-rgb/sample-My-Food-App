# DELETE `/user/{id}`

Account deletion.

## Example: erases the account: token revoked, login fails, history gone

`POST http://api:9595/user` → **HTTP 201** in 71 ms

Request body:

```json
{
  "first_name": "Eetwoe",
  "last_name": "Tester",
  "email": "e2e-delete-20261117181235ad65-3@example.test",
  "password": "<redacted>",
  "repassword": "<redacted>"
}
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=20, remaining=14, reset=3383
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
    "id": "2118813a-5e59-4c1d-af7e-c523dd1dd7de",
    "first_name": "Eetwoe",
    "last_name": "Tester",
    "email": "e2e-delete-20261117181235ad65-3@example.test",
    "email_verification_status": "PENDING",
    "is_active": true,
    "role": "user",
    "updatedAt": "2026-11-17T12:47:07.972Z",
    "createdAt": "2026-11-17T12:47:07.972Z",
    "mobile": null,
    "user_info": null,
    "type": null,
    "user_scan_count": 0,
    "last_scan_at": null,
    "deletedAt": null
  }
}
```

## Error example: 403 when deleting another user

`DELETE http://api:9595/user/30b0172d-b5fa-4803-9885-05429fb2e760` → **HTTP 403** in 3 ms

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
