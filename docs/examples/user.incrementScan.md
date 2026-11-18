# PUT `/user/{id}/increment-scan`

Legacy: reports the scan quota. Scans are counted by the lookup itself; this never counts one.

## Example: reports the quota without counting a scan

`PUT http://api:9595/user/39c08095-1235-49d7-9338-591a5b0b9fee/increment-scan` → **HTTP 200** in 3 ms

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
  "message": "Scan recorded successfully.",
  "info": {
    "total_scans": 100,
    "scanned_count": 0,
    "remaining_scans": 100
  }
}
```

## Error example: 403 for another user

`PUT http://api:9595/user/117fcf0d-bcce-4521-9192-e26ac714d413/increment-scan` → **HTTP 403** in 2 ms

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
