# POST `/product/scan`

Read a food label photo. Sends the image and the user's user_info to the OCR service (30 s timeout).

## Example: 400 without a file

`POST http://api:9595/product/scan` → **HTTP 400** in 7 ms

Request body:

```json
<multipart form>
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=20, remaining=18, reset=50
ratelimit-policy: 20;w=60
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
  "error": "No image file uploaded",
  "status": 400,
  "message": "No image file uploaded"
}
```

## Failing case: a label photo returns the OCR result

`POST http://api:9595/product/scan` → **HTTP 503** in 10.03 s

Request body:

```json
<multipart form>
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=20, remaining=19, reset=60
ratelimit-policy: 20;w=60
retry-after: 30
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
  "error": "OCR failed",
  "message": "The label reader is temporarily unavailable. Please try again shortly.",
  "reason": "ocr_unavailable",
  "status": 503
}
```

Failure:

```text
The label reader is temporarily unavailable. Please try again shortly.
```
