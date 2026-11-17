import { test, expect } from "@playwright/test";
import { fixtures, shot, trackImages, expectImageLoaded } from "./helpers.js";

const PAGE_SIZE = 12;
const codesOnPage = (page) =>
  page.getByTestId("search-result").evaluateAll((els) => els.map((e) => e.dataset.code));

async function thumbsLoad(page, images) {
  const cards = page.getByTestId("search-result");
  const n = await cards.count();
  for (let i = 0; i < n; i += 1) {
    const card = cards.nth(i);
    await card.scrollIntoViewIfNeeded();
    await expect(
      card.getByTestId("result-thumb-placeholder"),
      `thumbnail of ${await card.getAttribute("data-code")}`,
    ).toHaveCount(0);
    await expectImageLoaded(page, card.getByTestId("result-thumb"), images, `thumbnail ${i + 1}`);
  }
}

test.describe("search and browse", () => {
  test("browse lists every product with lazy thumbnails; pages 1, 2 and the last are correct", async ({
    page,
  }) => {
    const { listableCount } = fixtures();
    const images = trackImages(page);
    const pages = Math.ceil(listableCount / PAGE_SIZE);
    await page.goto("/#/search");
    await expect(page.getByTestId("search-results")).toBeVisible();
    await expect(page.getByTestId("search-summary")).toContainText(`${listableCount} products`);
    await expect(page.getByTestId("search-pages")).toHaveText(String(pages));
    const lazy = await page.getByTestId("result-thumb").first().getAttribute("loading");
    expect(lazy).toBe("lazy");
    const p1 = await codesOnPage(page);
    expect(p1).toHaveLength(Math.min(PAGE_SIZE, listableCount));
    await thumbsLoad(page, images);
    await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, "10-search");
    await page.getByRole("button", { name: "Next →" }).click();
    await expect(page.getByTestId("search-page")).toHaveText("2");
    // the previous page stays on screen (aria-busy) until page 2 has arrived
    await expect(page.locator('[aria-busy="true"]')).toHaveCount(0);
    const p2 = await codesOnPage(page);
    expect(p2.filter((c) => p1.includes(c))).toEqual([]);
    await page.getByRole("button", { name: "Last page" }).click();
    await expect(page.getByTestId("search-page")).toHaveText(String(pages));
    await expect(page.getByTestId("search-result")).toHaveCount(listableCount - (pages - 1) * PAGE_SIZE);
    await expect(page.getByRole("button", { name: "Next →" })).toBeDisabled();
  });

  test("typing searches after a pause (debounced) and updates the address", async ({ page }) => {
    const searches = [];
    page.on("request", (r) => {
      if (r.url().endsWith("/api/product/search")) searches.push(r.postDataJSON()?.query);
    });
    await page.goto("/#/search");
    await expect(page.getByTestId("search-results")).toBeVisible();
    searches.length = 0;
    await page.getByLabel("Search products").pressSequentially("ketchup", { delay: 40 });
    await expect(page).toHaveURL(/q=ketchup/);
    await expect(page.locator('[data-testid="search-result"][data-code="8715700407760"]')).toBeVisible();
    // one request for the final word, not one per keystroke
    expect(searches.filter((q) => q && q !== "ketchup")).toEqual([]);
  });

  test("helpful empty state, one-character hint and the page-past-the-end state", async ({ page }) => {
    await page.goto("/#/search?q=zzqxnomatchzzqx");
    await expect(page.getByTestId("search-empty")).toContainText("No products found");
    await expect(
      page.getByTestId("search-empty").getByRole("link", { name: "browse all products" }),
    ).toBeVisible();
    await shot(page, "11-search-empty");
    await page.goto("/#/search?q=a");
    await expect(page.getByTestId("search-empty").or(page.getByTestId("search-results"))).toBeVisible();
    if (await page.getByTestId("search-empty").isVisible())
      await expect(page.getByTestId("search-empty")).toContainText("Very short or very common words");
    await page.goto("/#/search?mode=browse&page=99");
    await expect(page.getByTestId("search-past-end").or(page.getByTestId("search-empty"))).toBeVisible();
  });

  test("filters: country, and the category and additive tabs", async ({ page }) => {
    await page.goto("/#/search?country=France");
    await expect(page.getByTestId("search-results")).toBeVisible();
    await page.goto("/#/search?mode=category&categories=Snacks");
    await expect(page.getByTestId("search-results")).toBeVisible();
    await expect(page.getByTestId("search-summary")).toContainText("products");
    await page.goto("/#/search?mode=additives&additives=en:e330");
    await expect(page.getByTestId("search-results")).toBeVisible();
    await page.goto("/#/search?mode=category&categories=No such category");
    await expect(page.getByTestId("search-empty")).toBeVisible();
  });

  test("a result opens its product", async ({ page }) => {
    const { products } = fixtures();
    const target = products.find((p) => p.listed && /[a-z]{4}/i.test(p.product_name));
    await page.goto(`/#/search?q=${encodeURIComponent(target.product_name)}`);
    await page.locator(`[data-testid="search-result"][data-code="${target.code}"]`).click();
    await expect(page.getByTestId("product-detail")).toHaveAttribute("data-code", target.code);
  });
});
