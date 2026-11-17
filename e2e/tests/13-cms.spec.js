import { test, expect } from "@playwright/test";
import { CMS_URL, fixtures, shot, trackImages, expectImageLoaded } from "./helpers.js";

test.use({ storageState: { cookies: [], origins: [] } });

async function cmsLogin(page) {
  const { admin } = fixtures();
  await page.goto(`${CMS_URL}/`);
  await page.getByPlaceholder("Your email address").fill(admin.email);
  await page.getByPlaceholder("Password").fill(admin.password);
  const login = page.waitForResponse((r) => r.url().endsWith("/cms/login"));
  await page.locator("button[type=submit]").first().click();
  const res = await login;
  expect(res.status(), `CMS login: ${await res.text()}`).toBe(200);
  await expect(page).toHaveURL(/\/products/);
  await expect(page.locator(".products-grid .card").first()).toBeVisible();
}

test.describe("CMS", () => {
  test("admin logs in and the product list shows products with thumbnails", async ({ page }) => {
    const images = trackImages(page);
    await cmsLogin(page);
    const cards = page.locator(".products-grid .card");
    expect(await cards.count()).toBeGreaterThan(0);
    await shot(page, "24-cms-products");
    // every product card must carry a loaded thumbnail
    const thumbs = page.locator(".products-grid .card img");
    await expect(thumbs.first(), "product cards in the CMS list contain an <img> thumbnail").toBeVisible({
      timeout: 5_000,
    });
    const n = await thumbs.count();
    expect(n, "one thumbnail per card").toBe(await cards.count());
    for (let i = 0; i < n; i += 1)
      await expectImageLoaded(page, thumbs.nth(i), images, `CMS thumbnail ${i + 1}`);
  });

  test("admin opens a product in the CMS and its image loads", async ({ page }) => {
    const images = trackImages(page);
    const { products } = fixtures();
    await cmsLogin(page);
    await page.goto(`${CMS_URL}/edit-product/${products[0].code}`);
    // the image under "Main image (shown in the app)" (its alt is the caption)
    await expect(page.getByRole("heading", { name: "Main image (shown in the app)" })).toBeVisible();
    const img = page.locator("figure img").first();
    await expectImageLoaded(page, img, images, `CMS main image of ${products[0].code}`);
    await shot(page, "25-cms-edit-product");
  });
});
