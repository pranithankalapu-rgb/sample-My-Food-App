# POST `/media/upload`

CMS uploads (images kept as uploaded; unused uploads are deleted after 24 h).

## Example: stores an image (201) with its pixel size; it is served, then deleted

`POST http://api-t:9595/media/upload` → **HTTP 201** in 25 ms

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
      "file_id": "341239dd-c43b-44d7-8f51-dfeb8852c2fd",
      "url": "1794919584456-1b27ebcf92b5c20b.png",
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

`POST http://api-t:9595/media/upload` → **HTTP 403** in 4 ms

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
