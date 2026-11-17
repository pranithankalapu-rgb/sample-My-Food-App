# POST `/product/analyze`

AI report for a photo of any food; the verdict is scored on the server, never by the AI. Nothing is stored.

## Example: a food photo gets a full report with a server-scored verdict and a disclaimer

`POST http://api-t:9595/product/analyze` → **HTTP 200** in 5.11 s

Request body:

```json
<multipart form>
```

Response headers:

```text
content-type: application/json; charset=utf-8
ratelimit: limit=20, remaining=19, reset=60
ratelimit-policy: 20;w=60
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
  "report": {
    "is_food": true,
    "kind": "packaged_product",
    "confidence": "high",
    "name": "Tomato Ketchup Bio",
    "brand": "Heinz",
    "description": "Organic tomato ketchup in a squeeze bottle.",
    "barcode": null,
    "known_product": false,
    "items": [],
    "categories": [
      "condiments",
      "ketchup",
      "organic products"
    ],
    "is_drink": false,
    "quantity": null,
    "ingredients": {
      "text": null,
      "source": "unknown"
    },
    "allergens": {
      "contains": [],
      "may_contain": []
    },
    "nutrition": {
      "basis": "per 100 g",
      "source": "unknown",
      "values": {},
      "serving": null
    },
    "nova_group": null,
    "additives": [],
    "health_notes": [
      "Ketchup typically contains sugar and salt; the nutrition label is not visible."
    ],
    "safety_notes": [],
    "verdict": {
      "recommended": false,
      "verdict": "insufficient_data",
      "report": {
        "goodPoints": [],
        "badPoints": []
      },
      "missing_data": [
        "sugar",
        "salt",
        "saturated fat",
        "calories"
      ],
      "data_notice": "Nutrition for this product was found online and has not been checked yet. Check the label.",
      "is_drink": false
    },
    "disclaimer": "This report was produced by AI from your photo. Values read from a label can still be misread, and values for meals or produce are estimates. Always check the label, especially for allergens."
  },
  "model": "gpt-6.1-terra"
}
```

## Failing case: POST /product/analyze (1 sample)

`POST http://api-perf:9595/product/analyze` → **HTTP 429** in 7 ms

Request body:

```json
<multipart form>
```

Response headers:

```text
content-type: application/json; charset=utf-8
retry-after: 60
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
  "message": "Too many photo analyses. Please try again later."
}
```

Failure:

```text
1 unexpected errors in 1 calls: expected 1 to be +0 // Object.is equality
```
