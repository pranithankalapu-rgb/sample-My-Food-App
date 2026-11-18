# PUT `/product/update`

CMS edit/create of a product (also updates the listing row, clears caches).

## Example: creates a CMS product (201), then updates it (200)

`PUT http://api-t:9595/product/update` → **HTTP 201** in 16 ms

Request body:

```json
{
  "product_code": "2099195835793",
  "product_details": {
    "product_name": "E2E Test Muesli",
    "brands": "E2E Foods",
    "ingredients_text": "Oats, wheat flakes, honey"
  }
}
```

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
  "message": "Product created successfully!"
}
```

## Error example: 403 for a signed-in non-admin (wrong role)

`PUT http://api-t:9595/product/update` → **HTTP 403** in 3 ms

Request body:

```json
{
  "product_code": "2099195835793",
  "product_details": {
    "product_name": "x"
  }
}
```

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
