import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { SCREENSHOTS, shot } from "./helpers.js";

const LABEL_HTML = `
<div id="label" style="width:720px;padding:28px;background:#fff;color:#000;font:22px/1.45 Arial,sans-serif;border:3px solid #000">
  <div style="font-weight:bold;font-size:30px;margin-bottom:10px">INGREDIENTS</div>
  <div>Wheat flour, sugar, palm oil, hazelnuts (13%), skimmed milk powder (8.7%), fat-reduced cocoa (7.4%), emulsifier: lecithins (soya), vanillin.</div>
  <div style="font-weight:bold;font-size:30px;margin:18px 0 8px">NUTRITION per 100 g</div>
  <div>Energy 539 kcal · Fat 30.9 g · Carbohydrate 57.5 g · of which sugars 56.3 g · Protein 6.3 g · Salt 0.107 g</div>
</div>`;

async function labelPng(browser) {
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  await page.setContent(LABEL_HTML);
  const png = await page.locator("#label").screenshot({ type: "png" });
  await page.close();
  fs.mkdirSync(SCREENSHOTS, { recursive: true });
  fs.writeFileSync(path.join(SCREENSHOTS, "sample-label.png"), png);
  return png;
}

test.describe("label scan (OCR)", () => {
  test("preview, upload progress and the extracted text", async ({ page, browser }) => {
    const png = await labelPng(browser);
    await page.goto("/#/scan");
    await page.getByLabel(/^Photo/).setInputFiles({ name: "label.png", mimeType: "image/png", buffer: png });
    await expect(page.getByTestId("scan-preview")).toBeVisible();
    const apiCall = page.waitForResponse((r) => r.url().endsWith("/api/product/scan"), { timeout: 60_000 });
    await page.getByRole("button", { name: "Scan label" }).click();
    await expect(page.getByTestId("scan-loading")).toBeVisible();
    const res = await apiCall;
    const body = await res.text();
    await expect(page.getByTestId("scan-result").or(page.getByTestId("scan-failure"))).toBeVisible({
      timeout: 60_000,
    });
    await shot(page, "12-label-scan");
    // the failure path is friendly (no stack trace, a retry button)
    if (res.status() !== 200) {
      await expect(page.getByTestId("scan-failure")).toContainText("The label could not be read");
      await expect(page.getByTestId("scan-failure-retry")).toBeVisible();
    }
    expect(res.status(), `POST /product/scan -> ${body.slice(0, 300)}`).toBe(200);
    await expect(page.getByTestId("scan-text")).toBeVisible();
  });

  test("wrong file type and missing file are caught before upload", async ({ page }) => {
    await page.goto("/#/scan");
    await page.getByRole("button", { name: "Scan label" }).click();
    await expect(page.getByTestId("scan-error")).toHaveText("Choose a photo first.");
    await page
      .getByLabel(/^Photo/)
      .setInputFiles({ name: "notes.txt", mimeType: "text/plain", buffer: Buffer.from("hello") });
    await expect(page.getByTestId("scan-error")).toContainText("not accepted");
  });
});
