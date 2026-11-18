# POST `/product/search`

Search and filter the catalogue. No brands in results.

## Example: finds a product by a word of its name

`POST http://api:9595/product/search` → **HTTP 200** in 14 ms

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
{"page_no":0,"pageSize":12,"totalSearchResultsCount":"2","results":[{"id":"4427","code":"8402001007033","product_name":"Ketchup Zero","categories":["Plant-based foods and beverages","Plant-based foods","Fruits and vegetables based foods","Vegetable based foods and beverages","Condiments","Vegetables based foods","Tomatoes and their products","Sauces","Tomato sauces","Ketchup","Tomato ketchup"],"additives_tags":["en:e202","en:e211","en:e955"],"countries":["Portugal","Espanha"],"selected_images":{"front":{"small":{"en":"http://localhost:9595/uploads/images/off_8402001007033_front_2e75075ca24c64d9.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_8402001007033_front_2e75075ca24c64d9.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_8402001007033_front_2e75075ca24c64d9.jpg"}},"nutrition":{"small":{"en":"http://localhost:9595/uploads/images/off_8402001007033_nutrition_d082bd6a2abce6af.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_8402001007033_nutrition_d082bd6a2abce6af.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_8402001007033_nutrition_d082bd6a2abce6af.jpg"}},"ingredients":{"small":{"en":"http://localhost:9595/uploads/images/off_8402001007033_ingredients_1c38f89aadec1b9f.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_8402001007033_ingredients_1c38f89aadec1b9f.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_8402001007033_ingredients_1c38f89aadec1b9f.jpg"}},"uploaded_images":[{"url":"http://localhost:9595/uploads/images/off_8402001007033_front_2e75075ca24c64d9.jpg","width":610,"height":1580,"source":"import","file_id":"db0c66d2-17f6-53e1-8284-0313898492b8","mime_type":"image/jpeg"}]},"created_at":"2026-11-16T13:26:47.372Z","updated_at":"2026-11-16T13:26:47.372Z","deleted_at":null,"image_url":"http://localhost:9595/uploads/images/off_8402001007033_front_2e75075ca24c64d9.jpg","image_thumb_url":"http://localhost:9595/uploads/thumbs/off_8402001007033_front_2e75075ca24c64d9.jpg.webp","image_width":610,"image_height":1580,"image_source":"upload","image_chosen_by":"auto","needs_better_image":false},{"id":"4375","code":"8715700407760","product_name":"Tomato Ketchup BIO","categories":["Plant-based foods and beverages","Plant-based foods","Fruits and vegetables based foods","Vegetable based foods and beverages","Condiments","Vegetables based foods","Tomatoes and their products","Sauces","Tomato sauces","Ketchup"],"additives_tags":[],"countries":["Belgique","France","Allemagne","Grèce","Roumanie","Espagne","Suisse","Royaume-Uni","États-Unis"],"selected_images":{"front":{"small":{"en":"http://localhost:9595/uploads/images/off_8715700407760_front_88f5f9b85095580b.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_8715700407760_front_88f5f9b85095580b.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_8715700407760_front_88f5f9b85095580b.jpg"}},"nutrition":{"small":{"en":"http://localhost:9595/uploads/images/off_8715700407760_nutrition_c9ae217e9832d972.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_8715700407760_nutrition_c9ae217e9832d972.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_8715700407760_nutrition_c9ae217e9832d972.jpg"}},"packaging":{"small":{"en":"http://localhost:9595/uploads/images/off_8715700407760_packaging_3c86c0656e7bb605.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_8715700407760_packaging_3c86c0656e7bb605.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_8715700407760_packaging_3c86c0656e7bb605.jpg"}},"ingredients":{"small":{"en":"http://localhost:9595/uploads/images/off_8715700407760_ingredients_1806b54801494611.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_8715700407760_ingredients_1806b54801494611.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_8715700407760_ingredients_1806b54801494611.jpg"}},"uploaded_images":[{"url":"http://localhost:9595/uploads/images/off_8715700407760_front_88f5f9b85095580b.jpg","width":1200,"he
```

## Failing case: stored country names are not mixed languages

`POST http://api:9595/product/search` → **HTTP 200** in 7 ms

Request body:

```json
{
  "filters": [
    {
      "name": "countries",
      "value": "Germany"
    }
  ],
  "page_size": 100
}
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=60, remaining=32, reset=60
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
{"page_no":0,"pageSize":100,"totalSearchResultsCount":"38","results":[{"id":"4401","code":"3252755150005","product_name":"20 madeleines longues aux œufs frais","categories":["Snacks","Desserts","Sweet snacks","Biscuits and cakes","Cakes","Pound cake","Madeleines","Long madeleines"],"additives_tags":["en:e412","en:e415","en:e422","en:e450","en:e471","en:e500"],"countries":["Canada","France","Allemagne"],"selected_images":{"main":null,"front":{"small":{"en":"http://localhost:9595/uploads/images/off_3252755150005_front_5186414c0f67a5df.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_3252755150005_front_5186414c0f67a5df.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_3252755150005_front_5186414c0f67a5df.jpg"}},"nutrition":{"small":{"en":"http://localhost:9595/uploads/images/off_3252755150005_nutrition_7fd46ffcf500e372.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_3252755150005_nutrition_7fd46ffcf500e372.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_3252755150005_nutrition_7fd46ffcf500e372.jpg"}},"ingredients":{"small":{"en":"http://localhost:9595/uploads/images/off_3252755150005_ingredients_7f64f92d034bd3fb.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_3252755150005_ingredients_7f64f92d034bd3fb.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_3252755150005_ingredients_7f64f92d034bd3fb.jpg"}},"uploaded_images":[{"url":"http://localhost:9595/uploads/images/1794846298462-1d519fdbf9adaf3d.png","width":887,"height":1774,"file_id":"5ba8a52a-8bf5-45e8-a227-ff994a849533","mime_type":"image/png","original_filename":"French Madeleines Biscuit Box.png"}]},"created_at":"2026-11-16T13:26:47.372Z","updated_at":"2026-11-16T16:24:58.602Z","deleted_at":null,"image_url":"http://localhost:9595/uploads/images/1794846298462-1d519fdbf9adaf3d.png","image_thumb_url":"http://localhost:9595/uploads/thumbs/1794846298462-1d519fdbf9adaf3d.png.webp","image_width":887,"image_height":1774,"image_source":"upload","image_chosen_by":"auto","needs_better_image":false},{"id":"4368","code":"5000157024671","product_name":"Beanz in a rich tomato sauce","categories":["Plant-based foods and beverages","Plant-based foods","Legumes and their products","Fruits and vegetables based foods","Legumes","Vegetable based foods and beverages","Canned foods","Vegetables based foods","Canned plant-based foods","Prepared vegetables","Baked beans in tomato sauce","Canned legumes","Canned common beans"],"additives_tags":[],"countries":["Bulgaria","Czech Republic","France","Germany","Italy","Portugal","Spain","Sweden","United Kingdom"],"selected_images":{"front":{"small":{"en":"http://localhost:9595/uploads/images/off_5000157024671_front_0a0b92c6b49ca0a7.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_5000157024671_front_0a0b92c6b49ca0a7.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_5000157024671_front_0a0b92c6b49ca0a7.jpg"}},"nutrition":{"small":{"en":"http://localhost:9595/uploads/images/off_5000157024671_nutrition_a3037feeb86df237.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_5000157024671_nutrition_a3037feeb86df237.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_5000157024671_nutrition_a3037feeb86df237.jpg"}},"packaging":{"small":{"en":"http://localhost:9595/uploads/images/off_5000157024671_packaging_0b6968f3ad686026.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_5000157024671_packaging_0b6968f3ad686026.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_5000157024671_packaging_0b6968f3ad686026.jpg"}},"ingredients":{"small":{"en":"http://localhost:9595/uploads/images/off_5000157024671_ingredients_0cbfa3638762e381.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_5000157024671_ingredients_0cbfa3638762e381.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_5000157024671_ingredients_0cbfa3638762e381.jpg"}},"uploaded_images":[{"url":"http://localhost:9595/uploads/images/off_5000157
```

Failure:

```text
"Allemagne" (French for Germany) is the stored name for 17 of 38 German products: expected 17 to be +0 // Object.is equality
```
