# POST `/product/additives`

Products containing any of the given additives.

## Example: returns products with an additive

`POST http://api:9595/product/additives` → **HTTP 200** in 4 ms

Request body:

```json
{
  "additives_tags": [
    "en:e330"
  ]
}
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=60, remaining=25, reset=60
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
{"data":[{"id":"4347","code":"8902080000227","product_name":"Sting Energy","categories":["Beverages and beverages preparations","Beverages","Non alcoholic beverages","Functional drinks","Energy drinks","Energy drink with sugar"],"additives_tags":["en:e129","en:e202","en:e211","en:e330","en:e331","en:e385","en:e452","en:e950","en:e955"],"countries":["India"],"selected_images":{"front":{"small":{"en":"http://localhost:9595/uploads/images/off_8902080000227_front_e98c387212f8a241.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_8902080000227_front_e98c387212f8a241.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_8902080000227_front_e98c387212f8a241.jpg"}},"nutrition":{"small":{"en":"http://localhost:9595/uploads/images/off_8902080000227_nutrition_695cfcc2fc12132f.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_8902080000227_nutrition_695cfcc2fc12132f.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_8902080000227_nutrition_695cfcc2fc12132f.jpg"}},"packaging":{"small":{"en":"http://localhost:9595/uploads/images/off_8902080000227_packaging_510c0d3c09c0c7b8.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_8902080000227_packaging_510c0d3c09c0c7b8.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_8902080000227_packaging_510c0d3c09c0c7b8.jpg"}},"ingredients":{"small":{"en":"http://localhost:9595/uploads/images/off_8902080000227_ingredients_5707135eaf45158d.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_8902080000227_ingredients_5707135eaf45158d.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_8902080000227_ingredients_5707135eaf45158d.jpg"}},"uploaded_images":[{"url":"off_8902080000227_front_e98c387212f8a241.jpg","width":2088,"height":4090,"source":"import","file_id":"cd068b29-27d8-5303-998f-878ab8e2d154","mime_type":"image/jpeg"}]},"createdAt":"2026-11-16T13:26:47.372Z","updatedAt":"2026-11-16T13:26:47.372Z","deletedAt":null},{"id":"4354","code":"5411188119098","product_name":"Natur mit Kokosnuss","categories":["Plant-based foods and beverages","Fermented foods","Desserts","Dairy substitutes","Vegan products","Non dairy desserts","Non dairy fermented foods","Non dairy yogurts","Soy milk yogurts"],"additives_tags":["en:e304","en:e307b","en:e330","en:e331","en:e440"],"countries":["Andorra","Österreich","Belgien","Finnland","Frankreich","Deutschland","Italien","Portugal","Spanien","Schweiz","Vereinigtes Königreich"],"selected_images":{"front":{"small":{"en":"http://localhost:9595/uploads/images/off_5411188119098_front_b1979287fa279cd1.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_5411188119098_front_b1979287fa279cd1.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_5411188119098_front_b1979287fa279cd1.jpg"}},"nutrition":{"small":{"en":"http://localhost:9595/uploads/images/off_5411188119098_nutrition_b46145c381a1c9ab.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_5411188119098_nutrition_b46145c381a1c9ab.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_5411188119098_nutrition_b46145c381a1c9ab.jpg"}},"packaging":{"small":{"en":"http://localhost:9595/uploads/images/off_5411188119098_packaging_6fa32aefc710293e.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_5411188119098_packaging_6fa32aefc710293e.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_5411188119098_packaging_6fa32aefc710293e.jpg"}},"ingredients":{"small":{"en":"http://localhost:9595/uploads/images/off_5411188119098_ingredients_bb176743db546582.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_5411188119098_ingredients_bb176743db546582.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_5411188119098_ingredients_bb176743db546582.jpg"}},"uploaded_images":[{"url":"off_5411188119098_front_b1979287fa279cd1.jpg","width":2177,"height":3813,"source":"import","file_id":"8569e789-8319-51b3-b89f-cc32935f7f91","mime_type":"image/jpeg"}]},"createdAt":"2026-11-16T13:26:47.37
```

## Error example: 404 when nothing matches

`POST http://api:9595/product/additives` → **HTTP 404** in 5 ms

Request body:

```json
{
  "additives_tags": [
    "en:e9999"
  ]
}
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=60, remaining=24, reset=60
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
  "message": "No products found with additives tag: en:e9999"
}
```
