# POST `/product/category`

Products in any of the given categories.

## Example: returns products of any listed category

`POST http://api:9595/product/category` → **HTTP 200** in 7 ms

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
ratelimit: limit=60, remaining=31, reset=60
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
{"data":[{"id":"1","code":"3017624010701","product_name":"Nutella","categories":["Breakfasts","Spreads","Sweet spreads","Hazelnut spreads","Chocolate spreads","Cocoa and hazelnuts spreads"],"additives_tags":[],"countries":["France","United Kingdom"],"selected_images":{"front":{"sizes":{"de":{"400":{"h":400,"w":281},"full":{"h":1024,"w":719}},"en":{"400":{"h":400,"w":281},"full":{"h":1024,"w":719}},"it":{"400":{"h":400,"w":281},"full":{"h":1024,"w":719}},"ro":{"400":{"h":400,"w":281},"full":{"h":1024,"w":719}}},"small":{"de":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_de.98.200.jpg","en":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_en.100.200.jpg","it":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_it.99.200.jpg","ro":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_ro.101.200.jpg"},"thumb":{"de":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_de.98.100.jpg","en":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_en.100.100.jpg","it":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_it.99.100.jpg","ro":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_ro.101.100.jpg"},"display":{"de":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_de.98.400.jpg","en":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_en.100.400.jpg","it":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_it.99.400.jpg","ro":"https://images.openfoodfacts.org/images/products/301/762/401/0701/front_ro.101.400.jpg"}},"nutrition":{"sizes":{"en":{"400":{"h":400,"w":363},"full":{"h":1945,"w":1764}}},"small":{"en":"https://images.openfoodfacts.org/images/products/301/762/401/0701/nutrition_en.63.200.jpg"},"thumb":{"en":"https://images.openfoodfacts.org/images/products/301/762/401/0701/nutrition_en.63.100.jpg"},"display":{"en":"https://images.openfoodfacts.org/images/products/301/762/401/0701/nutrition_en.63.400.jpg"}},"packaging":{"small":{"en":"https://images.openfoodfacts.org/images/products/301/762/401/0701/packaging_en.65.200.jpg"},"thumb":{"en":"https://images.openfoodfacts.org/images/products/301/762/401/0701/packaging_en.65.100.jpg"},"display":{"en":"https://images.openfoodfacts.org/images/products/301/762/401/0701/packaging_en.65.400.jpg"}},"ingredients":{"sizes":{"en":{"400":{"h":322,"w":400},"full":{"h":1825,"w":2268}}},"small":{"en":"https://images.openfoodfacts.org/images/products/301/762/401/0701/ingredients_en.60.200.jpg"},"thumb":{"en":"https://images.openfoodfacts.org/images/products/301/762/401/0701/ingredients_en.60.100.jpg"},"display":{"en":"https://images.openfoodfacts.org/images/products/301/762/401/0701/ingredients_en.60.400.jpg"}}},"createdAt":"2026-11-14T02:48:54.720Z","updatedAt":"2026-11-15T15:37:36.418Z","deletedAt":null},{"id":"5","code":"8000500310427","product_name":"Biscuits NUTELLA Biscuits Noisettes et Cacao x22 - 304g","categories":["Snacks","Sweet snacks","Biscuits and cakes","Biscuits and crackers","Biscuits","Biscuits cookies shelf stable","Biscotti","Snack dolci"],"additives_tags":["en:e322","en:e322i","en:e450","en:e450i","en:e500","en:e500ii","en:e503","en:e503ii"],"countries":["Algeria","Cyprus","France","Germany","Greece","Italy","Morocco","Portugal","Romania","Spain","Switzerland","United States"],"selected_images":{"main":{"lang":"fr"},"front":{"sizes":{"de":{"400":{"h":400,"w":321},"full":{"h":3597,"w":2883}},"es":{"400":{"h":400,"w":285},"full":{"h":1592,"w":1135}},"fr":{"400":{"h":384,"w":400},"full":{"h":2882,"w":3000}},"it":{"400":{"h":400,"w":225},"full":{"h":4000,"w":2252}},"pt":{"400":{"h":400,"w":337},"full":{"h":2539,"w":2140}}},"small":{"de":"https://images.openfoodfacts.org/images/products/800/050/031/0427/front_de.344.200.jpg","es":"https://images.openfoodfacts.org/images/products/800/050/031/0427/front_es.477.200.jpg","fr":"https://images.openfoodf
```

## Failing case: results carry image URLs like the other listings

`POST http://api:9595/product/category` → **HTTP 200** in 5 ms

Request body:

```json
{
  "category": [
    "Snacks"
  ]
}
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=60, remaining=26, reset=60
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
{"data":[{"id":"5","code":"8000500310427","product_name":"Biscuits NUTELLA Biscuits Noisettes et Cacao x22 - 304g","categories":["Snacks","Sweet snacks","Biscuits and cakes","Biscuits and crackers","Biscuits","Biscuits cookies shelf stable","Biscotti","Snack dolci"],"additives_tags":["en:e322","en:e322i","en:e450","en:e450i","en:e500","en:e500ii","en:e503","en:e503ii"],"countries":["Algeria","Cyprus","France","Germany","Greece","Italy","Morocco","Portugal","Romania","Spain","Switzerland","United States"],"selected_images":{"main":{"lang":"fr"},"front":{"sizes":{"de":{"400":{"h":400,"w":321},"full":{"h":3597,"w":2883}},"es":{"400":{"h":400,"w":285},"full":{"h":1592,"w":1135}},"fr":{"400":{"h":384,"w":400},"full":{"h":2882,"w":3000}},"it":{"400":{"h":400,"w":225},"full":{"h":4000,"w":2252}},"pt":{"400":{"h":400,"w":337},"full":{"h":2539,"w":2140}}},"small":{"de":"https://images.openfoodfacts.org/images/products/800/050/031/0427/front_de.344.200.jpg","es":"https://images.openfoodfacts.org/images/products/800/050/031/0427/front_es.477.200.jpg","fr":"https://images.openfoodfacts.org/images/products/800/050/031/0427/front_fr.593.200.jpg","it":"https://images.openfoodfacts.org/images/products/800/050/031/0427/front_it.571.200.jpg","pt":"https://images.openfoodfacts.org/images/products/800/050/031/0427/front_pt.325.200.jpg"},"thumb":{"de":"https://images.openfoodfacts.org/images/products/800/050/031/0427/front_de.344.100.jpg","es":"https://images.openfoodfacts.org/images/products/800/050/031/0427/front_es.477.100.jpg","fr":"https://images.openfoodfacts.org/images/products/800/050/031/0427/front_fr.593.100.jpg","it":"https://images.openfoodfacts.org/images/products/800/050/031/0427/front_it.571.100.jpg","pt":"https://images.openfoodfacts.org/images/products/800/050/031/0427/front_pt.325.100.jpg"},"display":{"de":"https://images.openfoodfacts.org/images/products/800/050/031/0427/front_de.344.400.jpg","es":"https://images.openfoodfacts.org/images/products/800/050/031/0427/front_es.477.400.jpg","fr":"https://images.openfoodfacts.org/images/products/800/050/031/0427/front_fr.593.400.jpg","it":"https://images.openfoodfacts.org/images/products/800/050/031/0427/front_it.571.400.jpg","pt":"https://images.openfoodfacts.org/images/products/800/050/031/0427/front_pt.325.400.jpg"}},"nutrition":{"sizes":{"de":{"400":{"h":279,"w":400},"full":{"h":2174,"w":3113}},"fr":{"400":{"h":400,"w":185},"full":{"h":1280,"w":592}},"it":{"400":{"h":400,"w":300},"full":{"h":4624,"w":3468}},"pt":{"400":{"h":305,"w":400},"full":{"h":1415,"w":1856}}},"small":{"de":"https://images.openfoodfacts.org/images/products/800/050/031/0427/nutrition_de.316.200.jpg","fr":"https://images.openfoodfacts.org/images/products/800/050/031/0427/nutrition_fr.457.200.jpg","it":"https://images.openfoodfacts.org/images/products/800/050/031/0427/nutrition_it.546.200.jpg","pt":"https://images.openfoodfacts.org/images/products/800/050/031/0427/nutrition_pt.329.200.jpg"},"thumb":{"de":"https://images.openfoodfacts.org/images/products/800/050/031/0427/nutrition_de.316.100.jpg","fr":"https://images.openfoodfacts.org/images/products/800/050/031/0427/nutrition_fr.457.100.jpg","it":"https://images.openfoodfacts.org/images/products/800/050/031/0427/nutrition_it.546.100.jpg","pt":"https://images.openfoodfacts.org/images/products/800/050/031/0427/nutrition_pt.329.100.jpg"},"display":{"de":"https://images.openfoodfacts.org/images/products/800/050/031/0427/nutrition_de.316.400.jpg","fr":"https://images.openfoodfacts.org/images/products/800/050/031/0427/nutrition_fr.457.400.jpg","it":"https://images.openfoodfacts.org/images/products/800/050/031/0427/nutrition_it.546.400.jpg","pt":"https://images.openfoodfacts.org/images/products/800/050/031/0427/nutrition_pt.329.400.jpg"}},"packaging":{"small":{"fr":"https://images.openfoodfacts.org/images/products/800/050/031/0427/packaging_fr.260.200.jpg","it":"https://images.openfoodfacts.org/images/products/800/050/031/0427/packaging_it.548.200.jpg"},"thumb":{"fr":"h
```

Failure:

```text
category results have no image_thumb_url (browse and search do): expected { Object (id, code, ...) } to have property "image_thumb_url"
```
