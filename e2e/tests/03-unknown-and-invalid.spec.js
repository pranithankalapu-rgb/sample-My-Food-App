import { test, expect } from "@playwright/test";
import { fixtures, shot, watchPageErrors } from "./helpers.js";

test.describe("unknown barcode", () => {
  test("goes through Open Food Facts -> AI fallback and ends in a result or a clear not-found", async ({ page }) => {
    const { unknownBarcode } = fixtures();
    const errors = watchPageErrors(page);
    await page.goto("/#/lookup");
    await page.getByLabel("Barcode").fill(unknownBarcode);
    const apiCall = page.waitForResponse((r) => r.url().endsWith(`/api/product/${unknownBarcode}`), { timeout: 100_000 });
    await page.getByRole("button", { name: "Look up" }).click();
    await expect(page.getByTestId("product-loading")).toBeVisible();

    const res = await apiCall;
    const body = await res.text();
    const outcome = page.getByTestId("product-detail")
      .or(page.getByTestId("product-not-found"))
      .or(page.getByTestId("product-pending"))
      .or(page.getByTestId("product-error"));
    await expect(outcome).toBeVisible({ timeout: 30_000 });
    await shot(page, "03-unknown-barcode");

    test.info().annotations.push({ type: "api", description: `HTTP ${res.status()} ${body.slice(0, 300)}` });
    // a server error or crash is a failure; 200 (found), 404 (not found or
    // still looking) are the two acceptable answers
    await expect(page.getByTestId("product-error"), `API answered HTTP ${res.status()}: ${body.slice(0, 300)}`).toHaveCount(0);
    expect([200, 404], `HTTP status for ${unknownBarcode}: ${body.slice(0, 300)}`).toContain(res.status());
    expect(errors, "uncaught page errors").toEqual([]);
  });
});

test.describe("invalid input", () => {
  const cases = [
    ["letters", "abc123def", /digits only/],
    ["too short", "1234", /8, 12, 13 or 14 digits/],
    ["empty", "", /Enter a barcode/],
  ];
  for (const [name, input, message] of cases) {
    test(`${name} ("${input}") shows a validation message and calls no API`, async ({ page }) => {
      const productCalls = [];
      page.on("request", (r) => { if (r.url().includes("/api/product")) productCalls.push(r.url()); });
      await page.goto("/#/lookup");
      await page.getByLabel("Barcode").fill(input);
      await page.getByRole("button", { name: "Look up" }).click();
      await expect(page.getByTestId("barcode-error")).toHaveText(message);
      await expect(page.getByLabel("Barcode")).toHaveAttribute("aria-invalid", "true");
      if (name === "letters") await shot(page, "04-invalid-input");
      expect(productCalls).toEqual([]);
    });
  }
});
