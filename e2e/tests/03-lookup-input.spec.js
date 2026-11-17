import { test, expect } from "@playwright/test";
import { shot } from "./helpers.js";

test.describe("barcode input validation", () => {
  const cases = [
    ["letters", "abc123def", "characters", /digits only/],
    ["too short", "1234", "length", /8 \(EAN-8\), 12 \(UPC-A\) or 13 \(EAN-13\) digits/],
    ["14 digits", "12345678901234", "length", /this one has 14/],
    ["bad check digit", "8715700407761", "check-digit", /check digit\) should be 0/],
    ["empty", "", "empty", /Enter a barcode/],
  ];
  for (const [name, input, reason, message] of cases) {
    test(`${name} ("${input}") shows a validation message and calls no API`, async ({ page }) => {
      const calls = [];
      page.on("request", (r) => {
        // a product lookup (the recent-scans list on this page is allowed)
        if (/\/api\/product\/[^/?]+$/.test(r.url())) calls.push(r.url());
      });
      await page.goto("/#/lookup");
      await page.getByLabel("Barcode").fill(input);
      await page.getByRole("button", { name: "Look up" }).click();
      const error = page.getByTestId("barcode-error");
      await expect(error).toHaveText(message);
      await expect(error).toHaveAttribute("data-reason", reason);
      await expect(page.getByLabel("Barcode")).toHaveAttribute("aria-invalid", "true");
      if (name === "bad check digit") await shot(page, "04-invalid-input");
      expect(calls).toEqual([]);
    });
  }

  test("valid EAN-8, UPC-A and spaced input are accepted", async ({ page }) => {
    await page.goto("/#/lookup");
    await page.getByLabel("Barcode").fill("8715 7004-07760");
    await page.getByRole("button", { name: "Look up" }).click();
    await expect(page).toHaveURL(/#\/product\/8715700407760$/);
  });
});
