# GET `/cms/product-review`

Products filled in by USDA/AI that no admin has confirmed yet.

## Example: review queue answers with data and pageInfo

`GET http://api-t:9595/cms/product-review?page=1&limit=20` → **HTTP 200** in 6 ms

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
{"data":[{"code":"8000500037560","product_name":"bueno","brands":"Kinder","data_source":"openfoodfacts","source_info":{"enrichment":{"ai":{"model":"gpt-6.1-terra","vendor":"openai","provider":"ai","confidence":"high","source_urls":["https://www.ferrerofoodservice.com/fr/sites/ferrerofoodservice20_fr/files/2023-04/fiche_technique_kinder_bueno_t2.pdf","https://cdn.metro-group.com/fr/fr_psh_810161001002_02.pdf","https://www.miamland.com/product/26540/buy-bueno-chocolate-coated-candy-bars-43g-kinder","https://dl.gedal.fr/docsgedal/FP/8000500037560.pdf"]}},"image_check":{"width":1792,"height":879,"source":"openfoodfacts","checked_at":"2026-11-17T10:16:37.841Z"},"ai_nutrition":true,"fallback_fields":["nutriments"],"needs_better_image":false,"enrichment_checked_at":"2026-11-17T10:16:54.364Z"},"selected_images":{"front":{"sizes":{"bg":{"400":{"h":159,"w":400},"full":{"h":810,"w":2036}},"en":{"400":{"h":196,"w":400},"full":{"h":879,"w":1792}},"es":{"400":{"h":159,"w":400},"full":{"h":810,"w":2036}},"fr":{"400":{"h":154,"w":400},"full":{"h":800,"w":2072}},"xx":{"400":{"h":191,"w":400},"full":{"h":680,"w":1424}}},"small":{"bg":"https://images.openfoodfacts.org/images/products/800/050/003/7560/front_bg.198.200.jpg","en":"https://images.openfoodfacts.org/images/products/800/050/003/7560/front_en.298.200.jpg","es":"https://images.openfoodfacts.org/images/products/800/050/003/7560/front_es.199.200.jpg","fr":"https://images.openfoodfacts.org/images/products/800/050/003/7560/front_fr.327.200.jpg","xx":"https://images.openfoodfacts.org/images/products/800/050/003/7560/front_xx.217.200.jpg"},"thumb":{"bg":"https://images.openfoodfacts.org/images/products/800/050/003/7560/front_bg.198.100.jpg","en":"https://images.openfoodfacts.org/images/products/800/050/003/7560/front_en.298.100.jpg","es":"https://images.openfoodfacts.org/images/products/800/050/003/7560/front_es.199.100.jpg","fr":"https://images.openfoodfacts.org/images/products/800/050/003/7560/front_fr.327.100.jpg","xx":"https://images.openfoodfacts.org/images/products/800/050/003/7560/front_xx.217.100.jpg"},"display":{"bg":"https://images.openfoodfacts.org/images/products/800/050/003/7560/front_bg.198.400.jpg","en":"https://images.openfoodfacts.org/images/products/800/050/003/7560/front_en.298.400.jpg","es":"https://images.openfoodfacts.org/images/products/800/050/003/7560/front_es.199.400.jpg","fr":"https://images.openfoodfacts.org/images/products/800/050/003/7560/front_fr.327.400.jpg","xx":"https://images.openfoodfacts.org/images/products/800/050/003/7560/front_xx.217.400.jpg"}},"nutrition":{"sizes":{"fr":{"400":{"h":182,"w":400},"full":{"h":463,"w":1017}}},"small":{"fr":"https://images.openfoodfacts.org/images/products/800/050/003/7560/nutrition_fr.211.200.jpg"},"thumb":{"fr":"https://images.openfoodfacts.org/images/products/800/050/003/7560/nutrition_fr.211.100.jpg"},"display":{"fr":"https://images.openfoodfacts.org/images/products/800/050/003/7560/nutrition_fr.211.400.jpg"}},"packaging":{"small":{"fr":"https://images.openfoodfacts.org/images/products/800/050/003/7560/packaging_fr.237.200.jpg"},"thumb":{"fr":"https://images.openfoodfacts.org/images/products/800/050/003/7560/packaging_fr.237.100.jpg"},"display":{"fr":"https://images.openfoodfacts.org/images/products/800/050/003/7560/packaging_fr.237.400.jpg"}},"ingredients":{"sizes":{"fr":{"400":{"h":131,"w":400},"full":{"h":992,"w":3024}}},"small":{"fr":"https://images.openfoodfacts.org/images/products/800/050/003/7560/ingredients_fr.232.200.jpg"},"thumb":{"fr":"https://images.openfoodfacts.org/images/products/800/050/003/7560/ingredients_fr.232.100.jpg"},"display":{"fr":"https://images.openfoodfacts.org/images/products/800/050/003/7560/ingredients_fr.232.400.jpg"}},"uploaded_images":[]},"created_at":"2026-11-17T10:16:37.841Z","updated_at":"2026-11-17T10:16:37.841Z","image_url":"https://images.openfoodfacts.org/images/products/800/050/003/7560/front_en.298.full.jpg","image_thumb_url":"https://images.openfoodfacts.org/images/products/800
```

## Error example: 403 for a signed-in non-admin (wrong role)

`GET http://api-t:9595/cms/product-review` → **HTTP 403** in 3 ms

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
