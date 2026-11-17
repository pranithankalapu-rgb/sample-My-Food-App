# POST `/product/search`

Search and filter the catalogue. No brands in results.

## Example: finds a product by a word of its name

`POST http://api:9595/product/search` → **HTTP 200** in 6 ms

Request body:

```json
{
  "query": "ketchup",
  "page": 0,
  "page_size": 12
}
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=60, remaining=48, reset=60
ratelimit-policy: 60;w=60
x-content-type-options: nosniff
x-dns-prefetch-control: off
x-download-options: noopen
x-frame-options: SAMEORIGIN
x-permitted-cross-domain-policies: none
x-xss-protection: 0
```

Response body:

```json
{"page_no":0,"pageSize":12,"totalSearchResultsCount":"2","results":[{"id":"4427","code":"8402001007033","product_name":"Ketchup Zero","categories":["Plant-based foods and beverages","Plant-based foods","Fruits and vegetables based foods","Vegetable based foods and beverages","Condiments","Vegetables based foods","Tomatoes and their products","Sauces","Tomato sauces","Ketchup","Tomato ketchup"],"additives_tags":["en:e202","en:e211","en:e955"],"countries":["Portugal","Espanha"],"selected_images":{"front":{"small":{"en":"http://localhost:9595/uploads/images/off_8402001007033_front_2e75075ca24c64d9.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_8402001007033_front_2e75075ca24c64d9.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_8402001007033_front_2e75075ca24c64d9.jpg"}},"nutrition":{"small":{"en":"http://localhost:9595/uploads/images/off_8402001007033_nutrition_d082bd6a2abce6af.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_8402001007033_nutrition_d082bd6a2abce6af.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_8402001007033_nutrition_d082bd6a2abce6af.jpg"}},"ingredients":{"small":{"en":"http://localhost:9595/uploads/images/off_8402001007033_ingredients_1c38f89aadec1b9f.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_8402001007033_ingredients_1c38f89aadec1b9f.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_8402001007033_ingredients_1c38f89aadec1b9f.jpg"}},"uploaded_images":[{"url":"http://localhost:9595/uploads/images/off_8402001007033_front_2e75075ca24c64d9.jpg","width":610,"height":1580,"source":"import","file_id":"db0c66d2-17f6-53e1-8284-0313898492b8","mime_type":"image/jpeg"}]},"created_at":"2026-11-16T13:26:47.372Z","updated_at":"2026-11-16T13:26:47.372Z","deleted_at":null,"image_url":"http://localhost:9595/uploads/images/off_8402001007033_front_2e75075ca24c64d9.jpg","image_thumb_url":"http://localhost:9595/uploads/images/off_8402001007033_front_2e75075ca24c64d9.jpg","image_width":610,"image_height":1580,"image_source":"upload","image_chosen_by":"auto","needs_better_image":false},{"id":"4375","code":"8715700407760","product_name":"Tomato Ketchup BIO","categories":["Plant-based foods and beverages","Plant-based foods","Fruits and vegetables based foods","Vegetable based foods and beverages","Condiments","Vegetables based foods","Tomatoes and their products","Sauces","Tomato sauces","Ketchup"],"additives_tags":[],"countries":["Belgique","France","Allemagne","Grèce","Roumanie","Espagne","Suisse","Royaume-Uni","États-Unis"],"selected_images":{"front":{"small":{"en":"http://localhost:9595/uploads/images/off_8715700407760_front_88f5f9b85095580b.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_8715700407760_front_88f5f9b85095580b.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_8715700407760_front_88f5f9b85095580b.jpg"}},"nutrition":{"small":{"en":"http://localhost:9595/uploads/images/off_8715700407760_nutrition_c9ae217e9832d972.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_8715700407760_nutrition_c9ae217e9832d972.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_8715700407760_nutrition_c9ae217e9832d972.jpg"}},"packaging":{"small":{"en":"http://localhost:9595/uploads/images/off_8715700407760_packaging_3c86c0656e7bb605.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_8715700407760_packaging_3c86c0656e7bb605.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_8715700407760_packaging_3c86c0656e7bb605.jpg"}},"ingredients":{"small":{"en":"http://localhost:9595/uploads/images/off_8715700407760_ingredients_1806b54801494611.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_8715700407760_ingredients_1806b54801494611.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_8715700407760_ingredients_1806b54801494611.jpg"}},"uploaded_images":[{"url":"http://localhost:9595/uploads/images/off_8715700407760_front_88f5f9b85095580b.jpg","width":1200,"height"
```

## Failing case: one-character search returns results or a clear hint (not silently nothing)

`POST http://api:9595/product/search` → **HTTP 200** in 5 ms

Request body:

```json
{
  "query": "a",
  "page_size": 12
}
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=60, remaining=44, reset=60
ratelimit-policy: 60;w=60
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
  "page_no": 0,
  "pageSize": 12,
  "totalSearchResultsCount": "0",
  "results": []
}
```

Failure:

```text
one-letter query 'a' matched nothing although many names contain it: expected 0 to be greater than 0
```
