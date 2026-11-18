# POST `/media/upload`

CMS uploads (images kept as uploaded; unused uploads are deleted after 24 h).

## Example: stores an image (201) with its pixel size; it is served, then deleted

`POST http://api-t:9595/media/upload` → **HTTP 201** in 15 ms

Request body:

```json
<multipart form>
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
  "uploadedFiles": [
    {
      "file_id": "c001aa33-951e-4954-887d-e9aa5024e023",
      "url": "1794996686755-543eb15bfbb97309.png",
      "mime_type": "image/png",
      "original_filename": "images-1",
      "width": 640,
      "height": 480
    }
  ],
  "message": "Files uploaded successfully"
}
```

## Error example: 403 for a signed-in non-admin (wrong role)

`POST http://api-t:9595/media/upload` → **HTTP 403** in 3 ms

Request body:

```json
<multipart form>
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
