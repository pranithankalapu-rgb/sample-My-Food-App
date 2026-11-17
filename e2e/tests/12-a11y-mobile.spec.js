import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { shot } from "./helpers.js";

const PAGES = [
  ["status", "/#/status", "status-list"],
  ["lookup", "/#/lookup", null],
  ["product", "/#/product/8715700407760", "product-detail"],
  ["search", "/#/search", "search-results"],
  ["scan", "/#/scan", null],
  ["profile", "/#/profile", "profile-details"],
  ["explorer", "/#/explorer", "explorer-form"],
  ["tests", "/#/tests", null],
  ["not-found", "/#/no-such-page", "not-found-page"],
];

test.describe("accessibility (axe, WCAG 2.1 AA) on every page", () => {
  for (const [name, url, ready] of PAGES) {
    test(`${name}: no serious or critical violations`, async ({ page }) => {
      await page.goto(url);
      if (ready) await expect(page.getByTestId(ready)).toBeVisible();
      await page.waitForLoadState("networkidle");
      const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
      const serious = result.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(
        serious.map((v) => `${v.id}: ${v.help} (${v.nodes.length}) e.g. ${v.nodes[0]?.target.join(" ")}`),
      ).toEqual([]);
    });
  }

  test("login page (signed out): no serious or critical violations", async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await page.goto(`${process.env.WEB_URL || "http://localhost:4200"}/#/login`);
    const result = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).analyze();
    expect(
      result.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id),
    ).toEqual([]);
    await context.close();
  });
});

test.describe("mobile layout and keyboard", () => {
  for (const [name, url, ready] of PAGES) {
    test(`${name} fits a 390 px phone screen (no sideways scrolling)`, async ({ browser }) => {
      const context = await browser.newContext({
        viewport: { width: 390, height: 844 },
        storageState: ".auth/user.json",
      });
      const page = await context.newPage();
      await page.goto(`${process.env.WEB_URL || "http://localhost:4200"}${url.slice(1)}`);
      if (ready) await expect(page.getByTestId(ready)).toBeVisible();
      await page.waitForLoadState("networkidle");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (name === "search" || name === "product" || name === "explorer")
        await shot(page, `23-mobile-${name}`);
      expect(overflow, "pixels of horizontal overflow").toBeLessThanOrEqual(1);
      await context.close();
    });
  }

  test("skip link and keyboard-only lookup", async ({ page }) => {
    await page.goto("/#/lookup");
    await page.keyboard.press("Tab");
    await expect(page.getByRole("link", { name: "Skip to main content" })).toBeFocused();
    await page.keyboard.press("Enter");
    await page.getByLabel("Barcode").focus();
    await page.keyboard.type("8715700407760");
    await page.keyboard.press("Enter");
    await expect(page.getByTestId("product-detail")).toBeVisible();
  });

  test("unknown routes show a not-found page with ways out (no blank screen)", async ({ page }) => {
    await page.goto("/#/definitely/not/here");
    await expect(page.getByTestId("not-found-page")).toContainText("Page not found");
    await expect(page.getByRole("link", { name: "Barcode lookup" }).last()).toBeVisible();
  });
});
