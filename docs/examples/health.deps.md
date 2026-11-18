# GET `/health/deps`

The API's own view of its dependencies: up, down, disabled (no key) or misconfigured (key refused), with each check's time. Never returns keys or error details. Cached 30 s, so it cannot multiply external calls. Added on fix/api-hardening (issue #14).

## Example: reports each dependency as up/down/disabled/misconfigured with a time, without a token

`GET http://api:9595/health/deps` → **HTTP 200** in 5.01 s

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
  "status": "degraded",
  "checked_at": "2026-11-17T12:48:36.992Z",
  "services": {
    "database": {
      "status": "up",
      "ms": 55
    },
    "open_food_facts": {
      "status": "up",
      "ms": 591
    },
    "openai": {
      "status": "up",
      "ms": 1507
    },
    "ocr": {
      "status": "down",
      "ms": 5001
    }
  }
}
```
