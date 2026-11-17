# GET `/cms/product-images`

Products whose best image is below the quality threshold (smallest first).

## Example: image queue lists products with image sizes, smallest first

`GET http://api-t:9595/cms/product-images?page=1&limit=100` → **HTTP 200** in 5 ms

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
{"data":[{"code":"2098579152006","product_name":"E2E perf product 0","brands":"E2E","data_source":"cms","source_info":{"image_check":{"width":null,"height":null,"source":null,"checked_at":"2026-11-17T10:16:29.513Z"},"needs_better_image":true},"selected_images":{"uploaded_images":[]},"created_at":"2026-11-17T10:16:29.513Z","updated_at":"2026-11-17T10:16:29.513Z","image_url":null,"image_thumb_url":null,"image_width":null,"image_height":null,"image_source":null,"image_chosen_by":null,"needs_better_image":true},{"code":"2098579152013","product_name":"E2E perf product 1","brands":"E2E","data_source":"cms","source_info":{"image_check":{"width":null,"height":null,"source":null,"checked_at":"2026-11-17T10:16:29.521Z"},"needs_better_image":true},"selected_images":{"uploaded_images":[]},"created_at":"2026-11-17T10:16:29.521Z","updated_at":"2026-11-17T10:16:29.521Z","image_url":null,"image_thumb_url":null,"image_width":null,"image_height":null,"image_source":null,"image_chosen_by":null,"needs_better_image":true},{"code":"2098579152020","product_name":"E2E perf product 2","brands":"E2E","data_source":"cms","source_info":{"image_check":{"width":null,"height":null,"source":null,"checked_at":"2026-11-17T10:16:29.528Z"},"needs_better_image":true},"selected_images":{"uploaded_images":[]},"created_at":"2026-11-17T10:16:29.528Z","updated_at":"2026-11-17T10:16:29.528Z","image_url":null,"image_thumb_url":null,"image_width":null,"image_height":null,"image_source":null,"image_chosen_by":null,"needs_better_image":true},{"code":"2098579152037","product_name":"E2E perf product 3","brands":"E2E","data_source":"cms","source_info":{"image_check":{"width":null,"height":null,"source":null,"checked_at":"2026-11-17T10:16:29.537Z"},"needs_better_image":true},"selected_images":{"uploaded_images":[]},"created_at":"2026-11-17T10:16:29.537Z","updated_at":"2026-11-17T10:16:29.537Z","image_url":null,"image_thumb_url":null,"image_width":null,"image_height":null,"image_source":null,"image_chosen_by":null,"needs_better_image":true},{"code":"2098579152044","product_name":"E2E perf product 4","brands":"E2E","data_source":"cms","source_info":{"image_check":{"width":null,"height":null,"source":null,"checked_at":"2026-11-17T10:16:29.549Z"},"needs_better_image":true},"selected_images":{"uploaded_images":[]},"created_at":"2026-11-17T10:16:29.549Z","updated_at":"2026-11-17T10:16:29.549Z","image_url":null,"image_thumb_url":null,"image_width":null,"image_height":null,"image_source":null,"image_chosen_by":null,"needs_better_image":true},{"code":"2098579152051","product_name":"E2E perf product 5","brands":"E2E","data_source":"cms","source_info":{"image_check":{"width":null,"height":null,"source":null,"checked_at":"2026-11-17T10:16:29.555Z"},"needs_better_image":true},"selected_images":{"uploaded_images":[]},"created_at":"2026-11-17T10:16:29.554Z","updated_at":"2026-11-17T10:16:29.554Z","image_url":null,"image_thumb_url":null,"image_width":null,"image_height":null,"image_source":null,"image_chosen_by":null,"needs_better_image":true},{"code":"2098579152068","product_name":"E2E perf product 6","brands":"E2E","data_source":"cms","source_info":{"image_check":{"width":null,"height":null,"source":null,"checked_at":"2026-11-17T10:16:29.560Z"},"needs_better_image":true},"selected_images":{"uploaded_images":[]},"created_at":"2026-11-17T10:16:29.560Z","updated_at":"2026-11-17T10:16:29.560Z","image_url":null,"image_thumb_url":null,"image_width":null,"image_height":null,"image_source":null,"image_chosen_by":null,"needs_better_image":true},{"code":"2098579152075","product_name":"E2E perf product 7","brands":"E2E","data_source":"cms","source_info":{"image_check":{"width":null,"height":null,"source":null,"checked_at":"2026-11-17T10:16:29.565Z"},"needs_better_image":true},"selected_images":{"uploaded_images":[]},"created_at":"2026-11-17T10:16:29.565Z","updated_at":"2026-11-17T10:16:29.565Z","image_url":null,"image_thumb_url":null,"image_width":null,"image_height":null,"image_source":null,"image_ch
```

## Error example: 403 for a signed-in non-admin (wrong role)

`GET http://api-t:9595/cms/product-images` → **HTTP 403** in 2 ms

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
