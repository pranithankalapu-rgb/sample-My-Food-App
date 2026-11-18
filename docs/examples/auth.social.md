# POST `/user/social/signin`

Sign in with Google/Apple/Facebook via Firebase. FIREBASE_SERVICE_ACCOUNT is not set locally, so only error paths can be exercised here.

## Example: 400 without token and provider

`POST http://api-t:9595/user/social/signin` → **HTTP 400** in 4 ms

Request body:

```json
{}
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=60, remaining=59, reset=900
ratelimit-policy: 60;w=900
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
  "details": "\"token\" is required, \"provider\" is required",
  "status": 400
}
```

## Error example: 401 for an invalid Firebase token (not 500)

`POST http://api-t:9595/user/social/signin` → **HTTP 401** in 2.19 s

Request body:

```json
{
  "token": "<redacted>",
  "provider": "google"
}
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=60, remaining=58, reset=900
ratelimit-policy: 60;w=900
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
  "message": "Invalid Firebase token."
}
```
