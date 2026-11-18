# POST `/product/analyze`

AI report for a photo of any food; the verdict is scored on the server, never by the AI. Nothing is stored.

## Example: a food photo gets a full report with a server-scored verdict and a disclaimer

`POST http://api-t:9595/product/analyze` → **HTTP 200** in 7.94 s

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
    "description": "Organic tomato ketchup in a squeeze bottle. Only the front label is visible.",
    "barcode": null,
    "known_product": false,
    "items": [],
    "categories": [
      "ketchup",
      "condiment",
      "organic"
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
      "source": "estimated",
      "values": {
        "energy-kcal_100g": 100,
        "fat_100g": 0.2,
        "carbohydrates_100g": 23,
        "sugars_100g": 20,
        "proteins_100g": 1,
        "salt_100g": 2,
        "sodium_100g": 0.8
      },
      "serving": null
    },
    "nova_group": null,
    "additives": [],
    "health_notes": [
      "Ketchup typically contains sugar and salt.",
      "Nutrition values are estimates for typical ketchup, not values read from this product."
    ],
    "safety_notes": [],
    "verdict": {
      "recommended": false,
      "verdict": "not_recommended",
      "report": {
        "goodPoints": [
          {
            "check": "generic.calories",
            "value": 100,
            "threshold": {
              "low": 150,
              "high": 250
            },
            "status": "pass",
            "message": "Moderate calories: 100 kcal (150 or less is moderate)"
          }
        ],
        "badPoints": [
          {
            "check": "generic.sodium",
            "value": 800,
            "threshold": {
              "low": 120,
              "high": 600
            },
            "status": "fail",
            "message": "High sodium: 800mg (above 600mg)"
          }
        ]
      },
      "missing_data": [
        "saturated fat"
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

`POST http://api-perf:9595/product/analyze` → **HTTP 200** in 7.89 s

Request body:

```json
<multipart form>
```

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
  "report": {
    "is_food": true,
    "kind": "packaged_product",
    "confidence": "high",
    "name": "Tomato Ketchup Bio",
    "brand": "Heinz",
    "description": "Organic tomato ketchup in a squeeze bottle. Only the front label is visible.",
    "barcode": null,
    "known_product": false,
    "items": [
      {
        "name": "Tomato ketchup",
        "estimated_portion_g": null
      }
    ],
    "categories": [
      "ketchup",
      "condiment",
      "organic"
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
      "Ketchup commonly contains added sugar and salt; the nutrition label is not visible."
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
      "allergens": {
        "check": "allergens",
        "value": [],
        "threshold": null,
        "status": "unknown",
        "message": "No allergen information for this product. Check the label."
      },
      "data_notice": "Nutrition for this product was found online and has not been checked yet. Check the label.",
      "is_drink": false
    },
    "disclaimer": "This report was produced by AI from your photo. Values read from a label can still be misread, and values for meals or produce are estimates. Always check the label, especially for allergens."
  },
  "model": "gpt-6.1-terra"
}
```

Failure:

```text
p95 7889 ms over the 3000 ms budget (p50 7889 ms): expected 7889 to be less than or equal to 3000
```
