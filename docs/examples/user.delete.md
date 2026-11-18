# DELETE `/user/{id}`

Account deletion.

## Example: erases the account: token revoked, login fails, history gone

`POST http://api:9595/user` → **HTTP 201** in 71 ms

Request body:

```json
{
  "first_name": "Eetwoe",
  "last_name": "Tester",
  "email": "e2e-delete-202611181538303f52-3@example.test",
  "password": "<redacted>",
  "repassword": "<redacted>"
}
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=20, remaining=14, reset=3424
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
    "id": "548bb6ac-ba1d-4732-9b14-c91006e3fdb5",
    "first_name": "Eetwoe",
    "last_name": "Tester",
    "email": "e2e-delete-202611181538303f52-3@example.test",
    "email_verification_status": "PENDING",
    "is_active": true,
    "role": "user",
    "updatedAt": "2026-11-18T10:12:14.590Z",
    "createdAt": "2026-11-18T10:12:14.590Z",
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

`DELETE http://api:9595/user/117fcf0d-bcce-4521-9192-e26ac714d413` → **HTTP 403** in 4 ms

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
