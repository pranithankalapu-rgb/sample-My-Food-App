# GET `/health`

Liveness probe used by Docker healthchecks. Not logged.

## Example: returns 200 {status: ok} without a token

`GET http://api:9595/health` → **HTTP 200** in 47 ms

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
  "status": "ok"
}
```
