# PUT `/user/{id}`

Save the health profile used for personal verdicts.

## Example: merges the health profile

`PUT http://api:9595/user/9e7d2d52-ebff-4a73-8c61-23a2b115bf8e` → **HTTP 200** in 9 ms

Request body:

```json
{
  "user_info": {
    "health_conditions": [
      "diabetes"
    ],
    "allergies": [
      "milk"
    ]
  }
}
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=30, remaining=29, reset=60
ratelimit-policy: 30;w=60
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
  "message": "User details updated successfully."
}
```

## Error example: 400 without user_info

`PUT http://api:9595/user/9e7d2d52-ebff-4a73-8c61-23a2b115bf8e` → **HTTP 400** in 5 ms

Request body:

```json
{}
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=30, remaining=27, reset=60
ratelimit-policy: 30;w=60
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
  "details": "\"user_info\" is required",
  "status": 400
}
```
