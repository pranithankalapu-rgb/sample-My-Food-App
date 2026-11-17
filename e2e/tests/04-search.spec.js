import { test, expect } from "@playwright/test";
import { fixtures, shot, trackImages, expectImageLoaded } from "./helpers.js";

const PAGE_SIZE = 12;

async function resultCodes(page) {
  return page.getByTestId("search-result").evaluateAll((els) => els.map((e) => e.dataset.code));
}

async function expectAllThumbsLoaded(page, images) {
  const cards = page.getByTestId("search-result");
  const n = await cards.count();
  for (let i = 0; i < n; i += 1) {
    const card = cards.nth(i);
    const code = await card.getAttribute("data-code");
    await card.scrollIntoViewIfNeeded();
    await expect(card.getByTestId("result-thumb-error"), `thumbnail of ${code} failed`).toHaveCount(0);
    await expectImageLoaded(page, card.getByTestId("result-thumb"), images, `thumbnail of ${code}`);
  }
  return n;
}

test.describe("search and browse", () => {
  test("browse lists every listed product, paginates, and thumbnails load", async ({ page }) => {
    const { listableCount } = fixtures();
    const images = trackImages(page);
    const pages = Math.ceil(listableCount / PAGE_SIZE);

    await page.goto("/#/search");
    await expect(page.getByTestId("search-results")).toBeVisible();
    await expect(page.getByTestId("search-summary")).toContainText(`${listableCount} products`);
    await expect(page.getByTestId("search-pages")).toHaveText(String(pages));
    await expect(page.getByTestId("search-result")).toHaveCount(Math.min(PAGE_SIZE, listableCount));
    const page1 = await resultCodes(page);
    await expectAllThumbsLoaded(page, images);
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, "05-search");

    await page.getByRole("button", { name: "Next →" }).click();
    await expect(page.getByTestId("search-page")).toHaveText("2");
    await expect(page.getByTestId("search-result").first()).toBeVisible();
    const page2 = await resultCodes(page);
    expect(page2.length).toBeGreaterThan(0);
    expect(page2.filter((c) => page1.includes(c)), "page 2 repeats products from page 1").toEqual([]);
    await expectAllThumbsLoaded(page, images);
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, "06-search-page2");

    await page.getByRole("button", { name: "← Previous" }).click();
    await expect(page.getByTestId("search-page")).toHaveText("1");
    await expect.poll(() => resultCodes(page)).toEqual(page1);

    // the last page holds the remainder
    await page.goto(`/#/search?q=&page=${pages}`);
    await expect(page.getByTestId("search-page")).toHaveText(String(pages));
    await expect(page.getByTestId("search-result")).toHaveCount(listableCount - (pages - 1) * PAGE_SIZE);
    await expect(page.getByRole("button", { name: "Next →" })).toBeDisabled();
  });

  test("searching a product's name finds it, and the card opens its detail", async ({ page }) => {
    const { products } = fixtures();
    const target = products.find((p) => p.product_name && /[a-z]{3}/i.test(p.product_name) && p.listed);
    expect(target, "a listed fixture product with a searchable name").toBeTruthy();
    await page.goto("/#/search");
    await page.getByLabel("Search products").fill(target.product_name);
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByTestId("search-results")).toBeVisible();
    const card = page.locator(`[data-testid="search-result"][data-code="${target.code}"]`);
    await expect(card, `"${target.product_name}" (${target.code}) in the results`).toBeVisible();
    await card.click();
    await expect(page.getByTestId("product-detail")).toHaveAttribute("data-code", target.code);
  });

  test("a query with no matches shows a clear empty state", async ({ page }) => {
    await page.goto("/#/search?q=zzqxnomatchzzqx&page=1");
    await expect(page.getByTestId("search-empty")).toBeVisible();
  });
});
