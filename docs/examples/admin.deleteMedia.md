# DELETE `/media/{id}`

Delete an uploaded file (does not check whether a product still references it).

## Example: 403 for a signed-in non-admin (wrong role)

`DELETE http://api-t:9595/media/8a1c2a5e-1111-4bbb-8ccc-000000000000` → **HTTP 403** in 3 ms

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

## Error example: 400 for an id that is not a UUID

`DELETE http://api-t:9595/media/not-a-uuid` → **HTTP 400** in 2 ms

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
  "error": "Bad Request",
  "message": "Please check the request inputs",
  "details": "\"id\" must be a valid GUID",
  "status": 400
}
```
