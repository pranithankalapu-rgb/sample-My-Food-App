# GET `/cms/product-images`

Products whose best image is below the quality threshold (smallest first).

## Example: image queue lists products with image sizes, smallest first

`GET http://api-t:9595/cms/product-images?page=1&limit=100` → **HTTP 200** in 9 ms

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
{"data":[{"code":"2098569516009","product_name":"E2E perf product 0","brands":"E2E","data_source":"cms","source_info":{"image_check":{"width":null,"height":null,"source":null,"checked_at":"2026-11-18T10:09:39.576Z"},"needs_better_image":true},"selected_images":{"uploaded_images":[]},"created_at":"2026-11-18T10:09:39.576Z","updated_at":"2026-11-18T10:09:39.576Z","image_url":null,"image_thumb_url":null,"image_width":null,"image_height":null,"image_source":null,"image_chosen_by":null,"needs_better_image":true},{"code":"2098569516016","product_name":"E2E perf product 1","brands":"E2E","data_source":"cms","source_info":{"image_check":{"width":null,"height":null,"source":null,"checked_at":"2026-11-18T10:09:39.586Z"},"needs_better_image":true},"selected_images":{"uploaded_images":[]},"created_at":"2026-11-18T10:09:39.586Z","updated_at":"2026-11-18T10:09:39.586Z","image_url":null,"image_thumb_url":null,"image_width":null,"image_height":null,"image_source":null,"image_chosen_by":null,"needs_better_image":true},{"code":"2098569516023","product_name":"E2E perf product 2","brands":"E2E","data_source":"cms","source_info":{"image_check":{"width":null,"height":null,"source":null,"checked_at":"2026-11-18T10:09:39.593Z"},"needs_better_image":true},"selected_images":{"uploaded_images":[]},"created_at":"2026-11-18T10:09:39.593Z","updated_at":"2026-11-18T10:09:39.593Z","image_url":null,"image_thumb_url":null,"image_width":null,"image_height":null,"image_source":null,"image_chosen_by":null,"needs_better_image":true},{"code":"2098569516030","product_name":"E2E perf product 3","brands":"E2E","data_source":"cms","source_info":{"image_check":{"width":null,"height":null,"source":null,"checked_at":"2026-11-18T10:09:39.602Z"},"needs_better_image":true},"selected_images":{"uploaded_images":[]},"created_at":"2026-11-18T10:09:39.602Z","updated_at":"2026-11-18T10:09:39.602Z","image_url":null,"image_thumb_url":null,"image_width":null,"image_height":null,"image_source":null,"image_chosen_by":null,"needs_better_image":true},{"code":"2098569516047","product_name":"E2E perf product 4","brands":"E2E","data_source":"cms","source_info":{"image_check":{"width":null,"height":null,"source":null,"checked_at":"2026-11-18T10:09:39.609Z"},"needs_better_image":true},"selected_images":{"uploaded_images":[]},"created_at":"2026-11-18T10:09:39.609Z","updated_at":"2026-11-18T10:09:39.609Z","image_url":null,"image_thumb_url":null,"image_width":null,"image_height":null,"image_source":null,"image_chosen_by":null,"needs_better_image":true},{"code":"2098569516054","product_name":"E2E perf product 5","brands":"E2E","data_source":"cms","source_info":{"image_check":{"width":null,"height":null,"source":null,"checked_at":"2026-11-18T10:09:39.616Z"},"needs_better_image":true},"selected_images":{"uploaded_images":[]},"created_at":"2026-11-18T10:09:39.616Z","updated_at":"2026-11-18T10:09:39.616Z","image_url":null,"image_thumb_url":null,"image_width":null,"image_height":null,"image_source":null,"image_chosen_by":null,"needs_better_image":true},{"code":"2098569516061","product_name":"E2E perf product 6","brands":"E2E","data_source":"cms","source_info":{"image_check":{"width":null,"height":null,"source":null,"checked_at":"2026-11-18T10:09:39.629Z"},"needs_better_image":true},"selected_images":{"uploaded_images":[]},"created_at":"2026-11-18T10:09:39.629Z","updated_at":"2026-11-18T10:09:39.629Z","image_url":null,"image_thumb_url":null,"image_width":null,"image_height":null,"image_source":null,"image_chosen_by":null,"needs_better_image":true},{"code":"2098569516078","product_name":"E2E perf product 7","brands":"E2E","data_source":"cms","source_info":{"image_check":{"width":null,"height":null,"source":null,"checked_at":"2026-11-18T10:09:39.639Z"},"needs_better_image":true},"selected_images":{"uploaded_images":[]},"created_at":"2026-11-18T10:09:39.639Z","updated_at":"2026-11-18T10:09:39.639Z","image_url":null,"image_thumb_url":null,"image_width":null,"image_height":null,"image_source":null,"image_ch
```

## Error example: 403 for a signed-in non-admin (wrong role)

`GET http://api-t:9595/cms/product-images` → **HTTP 403** in 4 ms

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
