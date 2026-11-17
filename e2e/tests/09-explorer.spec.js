import { test, expect } from "@playwright/test";
import { shot } from "./helpers.js";

test.describe("API Explorer", () => {
  test("lists all 33 endpoints from the inventory", async ({ page }) => {
    await page.goto("/#/explorer");
    await expect(page.locator('[data-testid^="explorer-endpoint-"]')).toHaveCount(33);
  });

  test("sends GET /health and shows status, time and pretty JSON", async ({ page }) => {
    await page.goto("/#/explorer");
    await page.getByTestId("explorer-endpoint-health").click();
    await page.getByTestId("explorer-send").click();
    await expect(page.getByTestId("explorer-status")).toHaveText("HTTP 200");
    await expect(page.getByTestId("explorer-time")).toHaveText(/\d+ ms|\d+\.\d+ s/);
    await expect(page.getByTestId("explorer-response-body")).toContainText('"status": "ok"');
  });

  test("prefilled lookup with my session token returns the product", async ({ page }) => {
    await page.goto("/#/explorer");
    await page.getByTestId("explorer-endpoint-product.lookup").click();
    await expect(page.getByLabel(/Path: code/)).toHaveValue("8715700407760");
    await page.getByTestId("explorer-send").click();
    await expect(page.getByTestId("explorer-status")).toHaveText("HTTP 200");
    await expect(page.getByTestId("explorer-response-body")).toContainText('"code": "8715700407760"');
    await shot(page, "19-explorer");
  });

  test("shows errors too: no token on a protected endpoint is 403, invalid JSON is caught", async ({
    page,
  }) => {
    await page.goto("/#/explorer");
    await page.getByTestId("explorer-endpoint-product.search").click();
    await page.getByLabel("Auth").selectOption("none");
    await page.getByTestId("explorer-send").click();
    await expect(page.getByTestId("explorer-status")).toHaveText("HTTP 403");
    await page.getByTestId("explorer-body").fill("{not json");
    await page.getByTestId("explorer-send").click();
    await expect(page.getByRole("alert").filter({ hasText: "not valid JSON" })).toBeVisible();
  });

  test("copy as curl puts a working command on the clipboard", async ({ page, context }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    await page.goto("/#/explorer");
    await page.getByTestId("explorer-endpoint-auth.login").click();
    await page.getByTestId("explorer-curl").click();
    const text = await page.evaluate(() => navigator.clipboard.readText());
    expect(text).toContain("curl -i -X POST 'http://localhost:4200/api/login'");
    expect(text).toContain("Content-Type: application/json");
  });
});
