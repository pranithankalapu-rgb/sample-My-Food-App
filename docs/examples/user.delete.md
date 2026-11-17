# DELETE `/user/{id}`

Account deletion.

## Example: erases the account: token revoked, login fails, history gone

`POST http://api:9595/user` → **HTTP 201** in 57 ms

Request body:

```json
{
  "first_name": "Eetwoe",
  "last_name": "Tester",
  "email": "e2e-delete-20261117154441af16-3@example.test",
  "password": "<redacted>",
  "repassword": "<redacted>"
}
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=20, remaining=14, reset=3298
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
    "id": "c3e4c530-9620-47aa-8861-2df304d3b1ee",
    "first_name": "Eetwoe",
    "last_name": "Tester",
    "email": "e2e-delete-20261117154441af16-3@example.test",
    "email_verification_status": "PENDING",
    "is_active": true,
    "role": "user",
    "updatedAt": "2026-11-17T10:20:32.666Z",
    "createdAt": "2026-11-17T10:20:32.666Z",
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

`DELETE http://api:9595/user/46257fb3-516e-441f-876d-97ee554aa146` → **HTTP 403** in 2 ms

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
