# GET `/cms/product-images`

Products whose best image is below the quality threshold (smallest first).

## Example: image queue lists products with image sizes, smallest first

`GET http://api-t:9595/cms/product-images?page=1&limit=100` → **HTTP 200** in 7 ms

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
{"data":[{"code":"2098422058004","product_name":"E2E perf product 0","brands":"E2E","data_source":"cms","source_info":{"image_check":{"width":null,"height":null,"source":null,"checked_at":"2026-11-17T12:43:52.392Z"},"needs_better_image":true},"selected_images":{"uploaded_images":[]},"created_at":"2026-11-17T12:43:52.392Z","updated_at":"2026-11-17T12:43:52.392Z","image_url":null,"image_thumb_url":null,"image_width":null,"image_height":null,"image_source":null,"image_chosen_by":null,"needs_better_image":true},{"code":"2098422058011","product_name":"E2E perf product 1","brands":"E2E","data_source":"cms","source_info":{"image_check":{"width":null,"height":null,"source":null,"checked_at":"2026-11-17T12:43:52.405Z"},"needs_better_image":true},"selected_images":{"uploaded_images":[]},"created_at":"2026-11-17T12:43:52.405Z","updated_at":"2026-11-17T12:43:52.405Z","image_url":null,"image_thumb_url":null,"image_width":null,"image_height":null,"image_source":null,"image_chosen_by":null,"needs_better_image":true},{"code":"2098422058028","product_name":"E2E perf product 2","brands":"E2E","data_source":"cms","source_info":{"image_check":{"width":null,"height":null,"source":null,"checked_at":"2026-11-17T12:43:52.415Z"},"needs_better_image":true},"selected_images":{"uploaded_images":[]},"created_at":"2026-11-17T12:43:52.415Z","updated_at":"2026-11-17T12:43:52.415Z","image_url":null,"image_thumb_url":null,"image_width":null,"image_height":null,"image_source":null,"image_chosen_by":null,"needs_better_image":true},{"code":"2098422058035","product_name":"E2E perf product 3","brands":"E2E","data_source":"cms","source_info":{"image_check":{"width":null,"height":null,"source":null,"checked_at":"2026-11-17T12:43:52.425Z"},"needs_better_image":true},"selected_images":{"uploaded_images":[]},"created_at":"2026-11-17T12:43:52.425Z","updated_at":"2026-11-17T12:43:52.425Z","image_url":null,"image_thumb_url":null,"image_width":null,"image_height":null,"image_source":null,"image_chosen_by":null,"needs_better_image":true},{"code":"2098422058042","product_name":"E2E perf product 4","brands":"E2E","data_source":"cms","source_info":{"image_check":{"width":null,"height":null,"source":null,"checked_at":"2026-11-17T12:43:52.434Z"},"needs_better_image":true},"selected_images":{"uploaded_images":[]},"created_at":"2026-11-17T12:43:52.434Z","updated_at":"2026-11-17T12:43:52.434Z","image_url":null,"image_thumb_url":null,"image_width":null,"image_height":null,"image_source":null,"image_chosen_by":null,"needs_better_image":true},{"code":"2098422058059","product_name":"E2E perf product 5","brands":"E2E","data_source":"cms","source_info":{"image_check":{"width":null,"height":null,"source":null,"checked_at":"2026-11-17T12:43:52.444Z"},"needs_better_image":true},"selected_images":{"uploaded_images":[]},"created_at":"2026-11-17T12:43:52.443Z","updated_at":"2026-11-17T12:43:52.443Z","image_url":null,"image_thumb_url":null,"image_width":null,"image_height":null,"image_source":null,"image_chosen_by":null,"needs_better_image":true},{"code":"2098422058066","product_name":"E2E perf product 6","brands":"E2E","data_source":"cms","source_info":{"image_check":{"width":null,"height":null,"source":null,"checked_at":"2026-11-17T12:43:52.455Z"},"needs_better_image":true},"selected_images":{"uploaded_images":[]},"created_at":"2026-11-17T12:43:52.454Z","updated_at":"2026-11-17T12:43:52.454Z","image_url":null,"image_thumb_url":null,"image_width":null,"image_height":null,"image_source":null,"image_chosen_by":null,"needs_better_image":true},{"code":"2098422058073","product_name":"E2E perf product 7","brands":"E2E","data_source":"cms","source_info":{"image_check":{"width":null,"height":null,"source":null,"checked_at":"2026-11-17T12:43:52.465Z"},"needs_better_image":true},"selected_images":{"uploaded_images":[]},"created_at":"2026-11-17T12:43:52.465Z","updated_at":"2026-11-17T12:43:52.465Z","image_url":null,"image_thumb_url":null,"image_width":null,"image_height":null,"image_source":null,"image_ch
```

## Error example: 403 for a signed-in non-admin (wrong role)

`GET http://api-t:9595/cms/product-images` → **HTTP 403** in 3 ms

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
