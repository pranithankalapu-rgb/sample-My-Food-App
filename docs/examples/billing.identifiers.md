# GET `/identifiers`

In-app purchase product identifiers and prices.

## Example: lists the plans without a token

`GET http://api:9595/identifiers` → **HTTP 200** in 6 ms

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
  "identifiers": [
    {
      "id": "938c205d-cb38-4b11-9dd9-4ddc21cf3bcd",
      "identifier": "com.myfoodapp.tier1",
      "price": "29.00",
      "created_at": "2026-11-14T02:48:28.071Z",
      "updated_at": "2026-11-14T02:48:28.071Z",
      "deleted_at": null
    },
    {
      "id": "911f815e-9612-4d45-b47b-fd15df7816b6",
      "identifier": "com.myfoodapp.tier2",
      "price": "49.00",
      "created_at": "2026-11-14T02:48:28.071Z",
      "updated_at": "2026-11-14T02:48:28.071Z",
      "deleted_at": null
    },
    {
      "id": "22cb024a-7e99-4af6-8b08-8366c9244270",
      "identifier": "com.myfoodapp.tier3",
      "price": "99.00",
      "created_at": "2026-11-14T02:48:28.071Z",
      "updated_at": "2026-11-14T02:48:28.071Z",
      "deleted_at": null
    },
    {
      "id": "f3374410-d4da-4686-9aae-5826fc54d2c6",
      "identifier": "com.myfoodapp.tier4",
      "price": "149.00",
      "created_at": "2026-11-14T02:48:28.071Z",
      "updated_at": "2026-11-14T02:48:28.071Z",
      "deleted_at": null
    }
  ]
}
```
