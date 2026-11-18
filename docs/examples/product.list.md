# GET `/product`

Browse the catalogue page by page.

## Example: returns a page with pageInfo

`GET http://api:9595/product?page=1&limit=12` → **HTTP 200** in 10 ms

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=60, remaining=59, reset=60
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
{"data":[{"id":"4372","code":"3029330022428","product_name":"14 Maxi Tranches complet sans sucres ajoutés","categories":["Plant-based foods and beverages","Plant-based foods","Cereals and potatoes","Cereals and their products","Breads","Sliced breads","Wholemeal breads","Wholemeal sliced breads"],"additives_tags":[],"countries":["France","Suisse"],"selected_images":{"front":{"small":{"en":"http://localhost:9595/uploads/images/off_3029330022428_front_85b905fcf9511432.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_3029330022428_front_85b905fcf9511432.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_3029330022428_front_85b905fcf9511432.jpg"}},"nutrition":{"small":{"en":"http://localhost:9595/uploads/images/off_3029330022428_nutrition_0dfa9cd3f5f332c8.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_3029330022428_nutrition_0dfa9cd3f5f332c8.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_3029330022428_nutrition_0dfa9cd3f5f332c8.jpg"}},"ingredients":{"small":{"en":"http://localhost:9595/uploads/images/off_3029330022428_ingredients_9deced8a7578b3f7.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_3029330022428_ingredients_9deced8a7578b3f7.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_3029330022428_ingredients_9deced8a7578b3f7.jpg"}},"uploaded_images":[{"url":"http://localhost:9595/uploads/images/off_3029330022428_front_85b905fcf9511432.jpg","width":3060,"height":4080,"source":"import","file_id":"7a5705bd-c068-56c8-9247-afbdb711a169","mime_type":"image/jpeg"}]},"createdAt":"2026-11-16T13:26:47.372Z","updatedAt":"2026-11-16T13:26:47.372Z","deletedAt":null,"image_url":"http://localhost:9595/uploads/images/off_3029330022428_front_85b905fcf9511432.jpg","image_thumb_url":"http://localhost:9595/uploads/thumbs/off_3029330022428_front_85b905fcf9511432.jpg.webp","image_width":3060,"image_height":4080,"image_source":"upload","image_chosen_by":"auto","needs_better_image":false},{"id":"4401","code":"3252755150005","product_name":"20 madeleines longues aux œufs frais","categories":["Snacks","Desserts","Sweet snacks","Biscuits and cakes","Cakes","Pound cake","Madeleines","Long madeleines"],"additives_tags":["en:e412","en:e415","en:e422","en:e450","en:e471","en:e500"],"countries":["Canada","France","Allemagne"],"selected_images":{"main":null,"front":{"small":{"en":"http://localhost:9595/uploads/images/off_3252755150005_front_5186414c0f67a5df.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_3252755150005_front_5186414c0f67a5df.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_3252755150005_front_5186414c0f67a5df.jpg"}},"nutrition":{"small":{"en":"http://localhost:9595/uploads/images/off_3252755150005_nutrition_7fd46ffcf500e372.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_3252755150005_nutrition_7fd46ffcf500e372.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_3252755150005_nutrition_7fd46ffcf500e372.jpg"}},"ingredients":{"small":{"en":"http://localhost:9595/uploads/images/off_3252755150005_ingredients_7f64f92d034bd3fb.jpg"},"thumb":{"en":"http://localhost:9595/uploads/images/off_3252755150005_ingredients_7f64f92d034bd3fb.jpg"},"display":{"en":"http://localhost:9595/uploads/images/off_3252755150005_ingredients_7f64f92d034bd3fb.jpg"}},"uploaded_images":[{"url":"http://localhost:9595/uploads/images/1794846298462-1d519fdbf9adaf3d.png","width":887,"height":1774,"file_id":"5ba8a52a-8bf5-45e8-a227-ff994a849533","mime_type":"image/png","original_filename":"French Madeleines Biscuit Box.png"}]},"createdAt":"2026-11-16T13:26:47.372Z","updatedAt":"2026-11-16T16:24:58.602Z","deletedAt":null,"image_url":"http://localhost:9595/uploads/images/1794846298462-1d519fdbf9adaf3d.png","image_thumb_url":"http://localhost:9595/uploads/thumbs/1794846298462-1d519fdbf9adaf3d.png.webp","image_width":887,"image_height":1774,"image_source":"upload","image_chosen_by":"auto","needs_better_image":false},{"id":"4363","code":"730040048159
```

## Error example: 404 past the last page

`GET http://api:9595/product?page=400&limit=100` → **HTTP 404** in 8 ms

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=60, remaining=52, reset=60
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
  "message": "No products found",
  "status": 404
}
```
