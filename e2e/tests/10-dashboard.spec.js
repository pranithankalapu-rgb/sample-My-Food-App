import { test, expect } from "@playwright/test";
import { shot } from "./helpers.js";

test.describe("Test dashboard", () => {
  test("shows the latest results, or a clear empty state before the first run", async ({ page }) => {
    await page.goto("/#/tests");
    const dashboard = page.getByTestId("dashboard");
    await expect(dashboard.or(page.getByTestId("no-results"))).toBeVisible();
    if (await dashboard.isVisible()) {
      await expect(page.getByTestId("endpoint-table").locator("tbody tr")).toHaveCount(33);
      await page.getByRole("button", { name: "failed" }).click();
      await expect(page.getByTestId("case-list")).toBeVisible();
    }
    await shot(page, "20-dashboard");
  });
});
