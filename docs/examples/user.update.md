# PUT `/user/{id}`

Save the health profile used for personal verdicts.

## Example: merges the health profile

`PUT http://api:9595/user/b6aa6d4b-d8da-4218-afae-a318e6c916f5` → **HTTP 200** in 5 ms

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

`PUT http://api:9595/user/b6aa6d4b-d8da-4218-afae-a318e6c916f5` → **HTTP 400** in 3 ms

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
  "details": "\"user_info\" is required"
}
```
