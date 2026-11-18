// Label scan with the OCR service down, end to end: browser -> web app (web-t)
// -> API (api-t, throwaway copy of the database). The OCR failure is real (the
// OCR host does not accept connections); the AI fallback makes one real OpenAI
// call. Uses its own new account on the test stack and deletes it afterwards.
// Run on its own (see the pre-production report):
//   npx playwright test tests/17-ocr-fallback.spec.js --project=e2e --no-deps
import crypto from "node:crypto";
import { test, expect } from "@playwright/test";
import { API_T_URL, WEB_T_URL, shot, signInAs } from "./helpers.js";

test.use({ storageState: { cookies: [], origins: [] } });

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
  return png;
}

test("OCR down: fast 503, the AI fallback reads the label, counted once", async ({
  page,
  browser,
  request,
}) => {
  test.setTimeout(180_000);
  const account = {
    email: `e2e-ocr-${crypto.randomBytes(5).toString("hex")}@example.test`,
    password: `E2e-${crypto.randomBytes(8).toString("hex")}`,
  };
  const signup = await request.post(`${API_T_URL}/user`, {
    data: {
      first_name: "Ocr",
      last_name: "Tester",
      email: account.email,
      password: account.password,
      repassword: account.password,
    },
  });
  expect(signup.status(), await signup.text()).toBe(201);
  const { token, user } = await signInAs(page, request, API_T_URL, account);
  const auth = { "x-access-token": token };
  const scansBefore =
    (await (await request.get(`${API_T_URL}/user/${user.id}`, { headers: auth })).json()).user
      .user_scan_count ?? 0;

  try {
    const png = await labelPng(browser);
    await page.goto(`${WEB_T_URL}/#/scan`);
    await page.getByLabel(/^Photo/).setInputFiles({ name: "label.png", mimeType: "image/png", buffer: png });

    // 1. the OCR service is down: 503, the failure panel, and the AI offer
    const scanned = (r) => r.url().includes("/api/product/scan");
    let call = page.waitForResponse(scanned, { timeout: 60_000 });
    await page.getByRole("button", { name: "Scan label" }).click();
    let res = await call;
    const first = await res.json();
    expect(res.status(), JSON.stringify(first)).toBe(503);
    expect(first).toMatchObject({ reason: "ocr_unavailable", fallback_available: true });
    await expect(page.getByTestId("scan-failure")).toContainText("The label could not be read");
    await expect(page.getByTestId("scan-ai-fallback")).toBeVisible();
    await shot(page, "17-ocr-down");

    // 2. circuit breaker: the next scan fails at once instead of waiting 10 s
    const t0 = Date.now();
    call = page.waitForResponse(scanned, { timeout: 30_000 });
    await page.getByTestId("scan-failure-retry").click();
    res = await call;
    const pausedMs = Date.now() - t0;
    expect(res.status()).toBe(503);
    expect(pausedMs, `second scan took ${pausedMs} ms`).toBeLessThan(3000);

    // 3. the AI fallback reads the label
    call = page.waitForResponse((r) => r.url().includes("/api/product/scan?fallback=ai"), {
      timeout: 120_000,
    });
    await page.getByTestId("scan-ai-fallback").click();
    res = await call;
    const body = await res.json();
    expect(res.status(), JSON.stringify(body).slice(0, 400)).toBe(200);
    expect(body.source).toBe("ai_fallback");
    expect(body.ocrData).toBeUndefined();
    expect(body.report.is_food).toBe(true);
    expect(body.report.ingredients.text).toMatch(/wheat flour/i);
    expect(body.report.ingredients.text).toMatch(/hazelnut/i);
    expect(body.report.verdict).toBeTruthy();
    await expect(page.getByTestId("scan-fallback-note")).toBeVisible();
    await expect(page.getByTestId("analyze-result")).toContainText(/hazelnut/i);
    await shot(page, "17-ocr-ai-fallback");

    // 4. two failed scans were refunded, the fallback counted once
    const scansAfter =
      (await (await request.get(`${API_T_URL}/user/${user.id}`, { headers: auth })).json()).user
        .user_scan_count ?? 0;
    expect(scansAfter - scansBefore).toBe(1);
  } finally {
    const del = await request.delete(`${API_T_URL}/user/${user.id}`, { headers: auth });
    expect(del.status()).toBe(200);
  }
});
