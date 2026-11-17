# PUT `/user/{id}/increment-scan`

Legacy: reports the scan quota. Scans are counted by the lookup itself; this never counts one.

## Example: reports the quota without counting a scan

`PUT http://api:9595/user/b6aa6d4b-d8da-4218-afae-a318e6c916f5/increment-scan` → **HTTP 200** in 3 ms

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

`PUT http://api:9595/user/46257fb3-516e-441f-876d-97ee554aa146/increment-scan` → **HTTP 403** in 2 ms

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
