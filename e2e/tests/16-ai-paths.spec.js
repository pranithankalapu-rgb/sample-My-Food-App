// Page tests that make a real OpenAI call (test stack, capped budget). They
// run once per test run, in the before-restart phase (playwright.config.js):
// the restart phase checks that data survives a restart, and a second pass
// would exceed the run's AI cost cap.
import { test, expect } from "@playwright/test";
import {
  API_T_URL,
  API_URL,
  WEB_T_URL,
  fixtures,
  shot,
  signInAs,
  validEan13,
  watchConsole,
} from "./helpers.js";

test.describe("unknown barcode (test stack: Open Food Facts -> OpenAI)", () => {
  test("goes through the fallback and ends in a result or a clear not-found, never a crash", async ({
    browser,
    request,
  }) => {
    const { testUser } = fixtures();
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    const problems = watchConsole(page, { allowStatus: [404] });
    await signInAs(page, request, API_T_URL, testUser);
    const code = validEan13("2097");
    await page.goto(`${WEB_T_URL}/#/lookup`);
    await page.getByLabel("Barcode").fill(code);
    const apiCall = page.waitForResponse((r) => r.url().endsWith(`/api/product/${code}`), {
      timeout: 100_000,
    });
    await page.getByRole("button", { name: "Look up" }).click();
    await expect(page.getByTestId("product-loading")).toBeVisible();
    const res = await apiCall;
    const outcome = page
      .getByTestId("product-detail")
      .or(page.getByTestId("product-not-found"))
      .or(page.getByTestId("product-pending"));
    await expect(outcome).toBeVisible({ timeout: 30_000 });
    await shot(page, "05-unknown-barcode");
    expect([200, 404], await res.text()).toContain(res.status());
    await expect(page.getByTestId("product-error")).toHaveCount(0);
    expect(problems).toEqual([]);
    await context.close();
  });
});

test.describe("AI photo analysis (test stack, one OpenAI call)", () => {
  test("a food photo gets a report with a verdict and the AI disclaimer", async ({ browser, request }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await signInAs(page, request, API_T_URL, fixtures().testUser);
    const image = await (
      await request.get(`${API_URL}/uploads/images/off_8715700407760_front_88f5f9b85095580b.jpg`)
    ).body();
    await page.goto(`${WEB_T_URL}/#/scan`);
    await page.getByRole("tab", { name: "AI photo analysis" }).click();
    await page
      .getByLabel(/^Photo/)
      .setInputFiles({ name: "food.jpg", mimeType: "image/jpeg", buffer: image });
    await page.getByRole("button", { name: "Analyse photo" }).click();
    await expect(page.getByTestId("analyze-result").or(page.getByTestId("scan-failure"))).toBeVisible({
      timeout: 90_000,
    });
    await shot(page, "13-photo-analysis");
    await expect(page.getByTestId("analyze-result")).toBeVisible();
    await expect(page.getByTestId("analyze-verdict")).not.toBeEmpty();
    await expect(page.getByTestId("analyze-result")).toContainText(/produced by AI/);
    await context.close();
  });
});
