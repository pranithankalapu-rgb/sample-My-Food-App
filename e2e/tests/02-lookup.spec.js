import { test, expect } from "@playwright/test";
import { fixtures, round2, shot, trackImages, expectImageLoaded, watchConsole } from "./helpers.js";

const NUTRIENT_KEYS = [
  "energy-kcal",
  "fat",
  "saturated-fat",
  "carbohydrates",
  "sugars",
  "fiber",
  "proteins",
  "salt",
  "sodium",
];
const { products } = fixtures();

test.describe("barcode lookup: 10 random products from the database", () => {
  test("fixture has 10 products", () => {
    expect(products).toHaveLength(10);
  });

  products.forEach((p, i) => {
    test(`#${i + 1} ${p.code}: name, brand, source badge, nutrition and a loaded full-size image`, async ({
      page,
    }) => {
      const problems = watchConsole(page);
      const images = trackImages(page);
      await page.goto("/#/lookup");
      await page.getByLabel("Barcode").fill(p.code);
      if (i === 0) await shot(page, "02-lookup");
      const apiCall = page.waitForResponse((r) => r.url().endsWith(`/api/product/${p.code}`));
      await page.getByRole("button", { name: "Look up" }).click();
      const res = await apiCall;
      expect(res.status(), await res.text().catch(() => "")).toBe(200);

      const detail = page.getByTestId("product-detail");
      await expect(detail).toHaveAttribute("data-code", p.code);
      await expect(page.getByTestId("product-name")).toHaveText(
        p.product_name || p.product_name_en || "Unnamed product",
      );
      await expect(page.getByTestId("product-brand")).toHaveText(p.brands || "Brand unknown");
      await expect(page.getByTestId("product-source")).toHaveAttribute("data-source", p.data_source || "");
      await expect(page.getByTestId("product-source")).toContainText("Open Food Facts");
      await expect(page.getByTestId("product-served-from")).toHaveAttribute("data-served", "db");

      const stored = NUTRIENT_KEYS.map((k) => [k, round2(p.nutriments?.[`${k}_100g`])]).filter(
        ([, v]) => v !== null,
      );
      expect(stored.length, `database has nutrition for ${p.code}`).toBeGreaterThan(0);
      for (const [key, value] of stored)
        await expect(page.getByTestId(`nutrient-${key}`), key).toHaveAttribute("data-value", value);

      await expectImageLoaded(page, page.getByTestId("product-image").first(), images, "main image");
      await expect(page.getByTestId("product-image-placeholder")).toHaveCount(0);
      await expect(page.getByTestId("product-countries")).not.toBeEmpty();
      if (i === 0) await shot(page, "03-product-detail");
      expect(problems).toEqual([]);
    });
  });
});
