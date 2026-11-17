import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { shot, SCREENSHOTS } from "./helpers.js";

const LABEL_HTML = `
<div id="label" style="width:720px;padding:28px;background:#fff;color:#000;font:22px/1.45 Arial,sans-serif;border:3px solid #000">
  <div style="font-weight:bold;font-size:30px;margin-bottom:10px">INGREDIENTS</div>
  <div>Wheat flour, sugar, palm oil, hazelnuts (13%), skimmed milk powder (8.7%),
  fat-reduced cocoa (7.4%), emulsifier: lecithins (soya), vanillin.</div>
  <div style="font-weight:bold;font-size:30px;margin:18px 0 8px">NUTRITION per 100 g</div>
  <table style="font-size:22px;border-collapse:collapse">
    <tr><td style="padding-right:40px">Energy</td><td>539 kcal</td></tr>
    <tr><td>Fat</td><td>30.9 g</td></tr>
    <tr><td>Carbohydrate</td><td>57.5 g</td></tr>
    <tr><td>of which sugars</td><td>56.3 g</td></tr>
    <tr><td>Protein</td><td>6.3 g</td></tr>
    <tr><td>Salt</td><td>0.107 g</td></tr>
  </table>
  <div style="margin-top:14px;font-weight:bold">Contains: wheat, milk, hazelnuts, soya.</div>
</div>`;

// A real PNG photo-like label, rendered by the browser itself (no binary
// file has to live in the repo); kept with the screenshots for inspection.
async function makeLabelPng(browser) {
  const page = await browser.newPage({ viewport: { width: 800, height: 700 } });
  await page.setContent(LABEL_HTML);
  const png = await page.locator("#label").screenshot({ type: "png" });
  await page.close();
  fs.mkdirSync(SCREENSHOTS, { recursive: true });
  fs.writeFileSync(path.join(SCREENSHOTS, "sample-label.png"), png);
  return png;
}

test.describe("label scan", () => {
  test("uploading a label photo returns extracted text from the OCR endpoint", async ({ page, browser }) => {
    const png = await makeLabelPng(browser);
    await page.goto("/#/scan");
    await page.getByLabel(/Label photo/).setInputFiles({ name: "label.png", mimeType: "image/png", buffer: png });
    const apiCall = page.waitForResponse((r) => r.url().endsWith("/api/product/scan"), { timeout: 60_000 });
    await page.getByRole("button", { name: "Scan label" }).click();
    const res = await apiCall;
    const body = await res.text();
    test.info().annotations.push({ type: "api", description: `HTTP ${res.status()} ${body.slice(0, 500)}` });

    await expect(page.getByTestId("scan-result").or(page.getByTestId("scan-error"))).toBeVisible({ timeout: 60_000 });
    await shot(page, "07-label-scan");
    expect(res.status(), `POST /product/scan -> ${body.slice(0, 500)}`).toBe(200);
    await expect(page.getByTestId("scan-text")).toBeVisible();
    const text = (await page.getByTestId("scan-text").innerText()).trim();
    expect(text.length, "extracted text length").toBeGreaterThan(10);
  });

  test("submitting without a photo shows a message", async ({ page }) => {
    await page.goto("/#/scan");
    await page.getByRole("button", { name: "Scan label" }).click();
    await expect(page.getByTestId("scan-error")).toHaveText(/Choose a photo/);
  });
});
