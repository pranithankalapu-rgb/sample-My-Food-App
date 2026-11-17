# Example requests and responses

One passing (and, where the run had one, one failing) exchange per endpoint, recorded by the API tests.

| Endpoint | Example |
|---|---|
| GET `/health` | [health.md](health.md) |
| GET `/uploads/images/{file}` | [uploads.static.md](uploads.static.md) |
| POST `/user` | [auth.signup.md](auth.signup.md) |
| POST `/login` | [auth.login.md](auth.login.md) |
| POST `/user/social/signin` | [auth.social.md](auth.social.md) |
| POST `/user/verify/code` | [auth.sendVerificationCode.md](auth.sendVerificationCode.md) |
| POST `/user/verify` | [auth.verify.md](auth.verify.md) |
| POST `/user/forgotpassword/code` | [auth.forgotPasswordCode.md](auth.forgotPasswordCode.md) |
| POST `/user/changepassword` | [auth.changePassword.md](auth.changePassword.md) |
| GET `/user/{id}` | [user.get.md](user.get.md) |
| PUT `/user/{id}` | [user.update.md](user.update.md) |
| DELETE `/user/{id}` | [user.delete.md](user.delete.md) |
| PUT `/user/{id}/increment-scan` | [user.incrementScan.md](user.incrementScan.md) |
| GET `/product/history/user/{id}` | [user.history.md](user.history.md) |
| GET `/product/{code}` | [product.lookup.md](product.lookup.md) |
| GET `/product` | [product.list.md](product.list.md) |
| POST `/product/search` | [product.search.md](product.search.md) |
| POST `/product/category` | [product.byCategory.md](product.byCategory.md) |
| POST `/product/additives` | [product.byAdditives.md](product.byAdditives.md) |
| POST `/product/scan` | [product.scanLabel.md](product.scanLabel.md) |
| POST `/product/analyze` | [product.analyzePhoto.md](product.analyzePhoto.md) |
| POST `/cms/login` | [cms.login.md](cms.login.md) |
| POST `/cms/logout` | [cms.logout.md](cms.logout.md) |
| GET `/cms/product-review` | [cms.reviewQueue.md](cms.reviewQueue.md) |
| GET `/cms/product-images` | [cms.imageQueue.md](cms.imageQueue.md) |
| GET `/users` | [admin.users.md](admin.users.md) |
| PUT `/product/update` | [admin.updateProduct.md](admin.updateProduct.md) |
| DELETE `/product/{code}` | [admin.deleteProduct.md](admin.deleteProduct.md) |
| POST `/media/upload` | [admin.uploadMedia.md](admin.uploadMedia.md) |
| DELETE `/media/{id}` | [admin.deleteMedia.md](admin.deleteMedia.md) |
| POST `/subscription/add` | [billing.add.md](billing.add.md) |
| PUT `/subscription/extend` | [billing.extend.md](billing.extend.md) |
| GET `/identifiers` | [billing.identifiers.md](billing.identifiers.md) |

## Screenshots

- [00-login.png](screenshots/00-login.png)
- [01-status.png](screenshots/01-status.png)
- [02-lookup.png](screenshots/02-lookup.png)
- [03-product-detail.png](screenshots/03-product-detail.png)
- [04-invalid-input.png](screenshots/04-invalid-input.png)
- [05-unknown-barcode.png](screenshots/05-unknown-barcode.png)
- [06-gallery-zoom.png](screenshots/06-gallery-zoom.png)
- [07-allergens.png](screenshots/07-allergens.png)
- [08-image-missing.png](screenshots/08-image-missing.png)
- [09-image-lowres.png](screenshots/09-image-lowres.png)
- [10-search.png](screenshots/10-search.png)
- [11-search-empty.png](screenshots/11-search-empty.png)
- [12-label-scan.png](screenshots/12-label-scan.png)
- [13-photo-analysis.png](screenshots/13-photo-analysis.png)
- [14-signup.png](screenshots/14-signup.png)
- [15-profile.png](screenshots/15-profile.png)
- [16-reset-password.png](screenshots/16-reset-password.png)
- [17-admin-products.png](screenshots/17-admin-products.png)
- [18-admin-users.png](screenshots/18-admin-users.png)
- [19-explorer.png](screenshots/19-explorer.png)
- [20-dashboard.png](screenshots/20-dashboard.png)
- [21-outage-error.png](screenshots/21-outage-error.png)
- [22-outage-recovered.png](screenshots/22-outage-recovered.png)
- [23-mobile-explorer.png](screenshots/23-mobile-explorer.png)
- [23-mobile-product.png](screenshots/23-mobile-product.png)
- [23-mobile-search.png](screenshots/23-mobile-search.png)
- [24-cms-products.png](screenshots/24-cms-products.png)
- [25-cms-edit-product.png](screenshots/25-cms-edit-product.png)
- [sample-label.png](screenshots/sample-label.png)