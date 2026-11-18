# POST `/product/category`

Products in any of the given categories.

## Example: returns products of any listed category

`POST http://api:9595/product/category` → **HTTP 200** in 9 ms

Request body:

```json
{
  "category": [
    "Snacks",
    "Breakfasts"
  ]
}
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=60, remaining=29, reset=60
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
{"data":[{"id":"1","code":"3017624010701","product_name":"Nutella","categories":["Breakfasts","Spreads","Sweet spreads","Hazelnut spreads","Chocolate spreads","Cocoa and hazelnuts spreads"],"additives_tags":[],"countries":["France","United Kingdom"],"selected_images":{"front":{"sizes":{"de":{"400":{"h":400,"w":281},"full":{"h":1024,"w":719}},"en":{"400":{"h":400,"w":281},"full":{"h":1024,"w":719}},"it":{"400":{"h":400,"w":281},"full":{"h":1024,"w":719}},"ro":{"400":{"h":400,"w":281},"full":{"h":1024,"w":719}}},"small":{"de":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_de.98.200.jpg","en":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_en.100.200.jpg","it":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_it.99.200.jpg","ro":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_ro.101.200.jpg"},"thumb":{"de":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_de.98.100.jpg","en":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_en.100.100.jpg","it":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_it.99.100.jpg","ro":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_ro.101.100.jpg"},"display":{"de":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_de.98.400.jpg","en":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_en.100.400.jpg","it":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_it.99.400.jpg","ro":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_ro.101.400.jpg"}},"nutrition":{"sizes":{"en":{"400":{"h":400,"w":363},"full":{"h":1945,"w":1764}}},"small":{"en":"https://images.openfoodfacts.org/images/products/301/762/401/0701/nutrition_en.63.200.jpg"},"thumb":{"en":"https://images.openfoodfacts.org/images/products/301/762/401/0701/nutrition_en.63.100.jpg"},"display":{"en":"https://images.openfoodfacts.org/images/products/301/762/401/0701/nutrition_en.63.400.jpg"}},"packaging":{"small":{"en":"https://images.openfoodfacts.org/images/products/301/762/401/0701/packaging_en.65.200.jpg"},"thumb":{"en":"https://images.openfoodfacts.org/images/products/301/762/401/0701/packaging_en.65.100.jpg"},"display":{"en":"https://images.openfoodfacts.org/images/products/301/762/401/0701/packaging_en.65.400.jpg"}},"ingredients":{"sizes":{"en":{"400":{"h":322,"w":400},"full":{"h":1825,"w":2268}}},"small":{"en":"https://images.openfoodfacts.org/images/products/301/762/401/0701/ingredients_en.60.200.jpg"},"thumb":{"en":"https://images.openfoodfacts.org/images/products/301/762/401/0701/ingredients_en.60.100.jpg"},"display":{"en":"https://images.openfoodfacts.org/images/products/301/762/401/0701/ingredients_en.60.400.jpg"}},"uploaded_images":[]},"createdAt":"2026-11-14T02:48:54.720Z","updatedAt":"2026-11-15T15:37:36.418Z","deletedAt":null,"image_url":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_en.100.full.jpg","image_thumb_url":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_en.100.400.jpg","image_width":719,"image_height":1024,"image_source":"openfoodfacts","image_chosen_by":"auto","needs_better_image":false},{"id":"5","code":"8000500310427","product_name":"Biscuits NUTELLA Biscuits Noisettes et Cacao x22 - 304g","categories":["Snacks","Sweet snacks","Biscuits and cakes","Biscuits and crackers","Biscuits","Biscuits cookies shelf stable","Biscotti","Snack dolci"],"additives_tags":["en:e322","en:e322i","en:e450","en:e450i","en:e500","en:e500ii","en:e503","en:e503ii"],"countries":["Algeria","Cyprus","France","Germany","Greece","Italy","Morocco","Portugal","Romania","Spain","Switzerland","United States"],"selected_images":{"main":{"lang":"fr"},"front":{"sizes":{"de":{"400":{"h":400,"w":321},"full":{"h":3597,"w":2883}},"es":{"400":{"h":400,"w":285},"full":{"h":1592,"w":1135}},"fr":{"400":{"h":384,"w":400},"full":{"h":2882,"w":
```

## Error example: 404 with a message when nothing matches

`POST http://api:9595/product/category` → **HTTP 404** in 17 ms

Request body:

```json
{
  "category": [
    "No such category e2e"
  ]
}
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=60, remaining=28, reset=60
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
  "message": "No products found for category: No such category e2e",
  "status": 404
}
```
