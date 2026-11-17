# POST `/cms/login`

Admin login for the CMS (short token lifetime).

## Example: an admin gets a token

`POST http://api-t:9595/cms/login` → **HTTP 200** in 57 ms

Request body:

```json
{
  "email": "e2e-admin-t20261117154441af16@example.test",
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
  "status": 200,
  "message": "Login successful.",
  "user": {
    "id": "658b5c72-96c7-4824-b074-4b9d8fed391f",
    "first_name": "Admin",
    "last_name": "Tester",
    "email": "e2e-admin-t20261117154441af16@example.test",
    "mobile": null,
    "email_verification_status": "PENDING",
    "user_info": null,
    "role": "admin",
    "is_active": true,
    "type": null,
    "user_scan_count": 0,
    "last_scan_at": null,
    "createdAt": "2026-11-17T10:15:20.336Z",
    "updatedAt": "2026-11-17T10:15:20.336Z",
    "deletedAt": null
  },
  "token": "<redacted>"
}
```

## Error example: a normal user gets the same 401 as a wrong password

`POST http://api-t:9595/cms/login` → **HTTP 401** in 58 ms

Request body:

```json
{
  "email": "e2e-admin-user-20261117154441af16-1@example.test",
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
  "status": 401,
  "message": "Invalid email or password."
}
```
