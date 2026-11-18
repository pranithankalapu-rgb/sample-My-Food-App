# GET `/uploads/images/{file}`

Serves product images (Open Food Facts copies and CMS uploads). Product responses carry absolute URLs: <BASE_URL>/uploads/images/<file>.

## Example: serves a product image with an image content type

`GET http://api:9595/uploads/images/off_8715700407760_front_88f5f9b85095580b.jpg` → **HTTP 200** in 8 ms

Response headers:

```text
content-type: image/jpeg
x-content-type-options: nosniff
x-dns-prefetch-control: off
x-download-options: noopen
x-frame-options: SAMEORIGIN
x-permitted-cross-domain-policies: none
x-xss-protection: 0
```

Response body:

```json
<image/jpeg 126796 bytes>
```

## Error example: answers 404 JSON for a file that does not exist

`GET http://api:9595/uploads/images/does-not-exist-e2e.jpg` → **HTTP 404** in 6 ms

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
<application/json;charset=utf-8 37 bytes>
```
