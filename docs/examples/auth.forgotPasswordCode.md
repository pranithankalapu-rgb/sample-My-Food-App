# POST `/user/forgotpassword/code`

Email a password-reset code.

## Example: same 200 answer for an unknown address

`POST http://api-t:9595/user/forgotpassword/code` → **HTTP 200** in 4 ms

Request body:

```json
{
  "email": "e2e-unknown-20261117181235ad65-23@example.test"
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
  "status": "success",
  "message": "Forgot password verification code sent successfully"
}
```

## Error example: 400 without an email

`POST http://api-t:9595/user/forgotpassword/code` → **HTTP 400** in 2 ms

Request body:

```json
{}
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=20, remaining=15, reset=3600
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
  "details": "\"email\" is required",
  "status": 400
}
```
