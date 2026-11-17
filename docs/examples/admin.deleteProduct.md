# DELETE `/product/{code}`

Remove a product from listings and search.

## Example: removes the product from listings; scans still work; a second delete is 404

`DELETE http://api-t:9595/product/2099107853914` → **HTTP 200** in 3 ms

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
  "message": "Product deleted Successfully"
}
```

## Error example: 403 for a signed-in non-admin (wrong role)

`DELETE http://api-t:9595/product/8715700407760` → **HTTP 403** in 3 ms

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
