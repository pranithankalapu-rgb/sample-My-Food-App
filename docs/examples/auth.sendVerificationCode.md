# POST `/user/verify/code`

Email a 6-digit account verification code (only to PENDING accounts; re-sends the active code).

## Example: same 200 answer for an unknown address (no account enumeration)

`POST http://api-t:9595/user/verify/code` → **HTTP 200** in 11 ms

Request body:

```json
{
  "email": "e2e-unknown-20261117154441af16-21@example.test"
}
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=50, remaining=49, reset=86400
ratelimit-policy: 50;w=86400
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
  "message": "Verification code sent successfully."
}
```

## Error example: 400 without an email

`POST http://api-t:9595/user/verify/code` → **HTTP 400** in 2 ms

Request body:

```json
{}
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=20, remaining=18, reset=3600
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
  "error": "Bad Request",
  "message": "Please check the request inputs",
  "details": "\"email\" is required"
}
```
