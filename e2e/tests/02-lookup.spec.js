import { test, expect } from "@playwright/test";
import { fixtures, round2, shot, trackImages, expectImageLoaded, watchPageErrors } from "./helpers.js";

// The nutrients the product screen shows, keyed as in Open Food Facts nutriments
const NUTRIENT_KEYS = ["energy-kcal", "fat", "saturated-fat", "carbohydrates", "sugars", "fiber", "proteins", "salt", "sodium"];

const { products } = fixtures();

test.describe("barcode lookup: 10 random products from the database", () => {
  test("fixture has 10 products", () => {
    expect(products).toHaveLength(10);
  });

  products.forEach((p, i) => {
    test(`#${i + 1} ${p.code} shows name, brand, nutrition and a loaded image`, async ({ page }) => {
      const errors = watchPageErrors(page);
      const images = trackImages(page);

      await page.goto("/#/lookup");
      await page.getByLabel("Barcode").fill(p.code);
      if (i === 0) await shot(page, "01-lookup");
      const apiCall = page.waitForResponse((r) => r.url().endsWith(`/api/product/${p.code}`));
      await page.getByRole("button", { name: "Look up" }).click();
      const res = await apiCall;
      expect(res.status(), `GET /product/${p.code} -> ${await res.text().catch(() => "")}`).toBe(200);

      const detail = page.getByTestId("product-detail");
      await expect(detail).toBeVisible();
      await expect(detail).toHaveAttribute("data-code", p.code);

      // name and brand exactly as stored in the database
      const expectedName = p.product_name || p.product_name_en || "(no name)";
      await expect(page.getByTestId("product-name")).toHaveText(expectedName);
      await expect(page.getByTestId("product-brand")).toHaveText(p.brands || "Brand unknown");
      await expect(page.getByTestId("product-source")).toHaveAttribute("data-source", p.data_source || "");

      // nutrition: every value the database has must be shown, rounded to 2 dp
      const stored = NUTRIENT_KEYS.map((k) => [k, round2(p.nutriments?.[`${k}_100g`])]).filter(([, v]) => v !== null);
      expect(stored.length, `database has nutrition values for ${p.code}`).toBeGreaterThan(0);
      await expect(page.getByTestId("nutrition-table")).toBeVisible();
      for (const [key, value] of stored) {
        await expect(page.getByTestId(`nutrient-${key}`), `${key}_100g`).toHaveAttribute("data-value", value);
      }

      // the front image: decoded pixels and a 200 image response with bytes
      const info = await expectImageLoaded(page, page.getByTestId("product-image"), images, "front image");
      await expect(page.getByTestId("product-image-error")).toHaveCount(0);
      test.info().annotations.push({ type: "image", description: `${info.w}x${info.h}px, ${info.bytes} bytes, ${info.src}` });

      if (i === 0) await shot(page, "02-product-detail");
      expect(errors, "uncaught page errors").toEqual([]);
    });
  });
});
