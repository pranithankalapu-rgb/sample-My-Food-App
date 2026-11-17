import { test, expect } from "@playwright/test";
import { API_URL, CMS_URL, WEB_URL, shot, watchConsole } from "./helpers.js";

test.describe("health and Status page", () => {
  test("API, CMS and the web app respond; /api is proxied", async ({ request }) => {
    expect((await request.get(`${API_URL}/health`)).status()).toBe(200);
    expect(await (await request.get(`${CMS_URL}/`)).text()).toContain('id="root"');
    expect((await request.get(`${WEB_URL}/healthz`)).status()).toBe(200);
    const proxied = await request.get(`${WEB_URL}/api/health`);
    expect(await proxied.json()).toEqual({ status: "ok" });
  });

  test("Status page shows live health and response time for each service", async ({ page }) => {
    const problems = watchConsole(page, { allowStatus: [401, 502, 504] });
    await page.goto("/#/status");
    for (const id of ["api", "database", "off", "openai", "ocr"]) {
      const row = page.getByTestId(`status-${id}`);
      await expect(row).toHaveAttribute("data-state", /up|down/, { timeout: 30_000 });
      await expect(page.getByTestId(`status-${id}-time`)).toHaveText(/\d+(\.\d+)? (ms|s)/);
    }
    await expect(page.getByTestId("status-api")).toHaveAttribute("data-state", "up");
    await expect(page.getByTestId("status-database")).toHaveAttribute("data-state", "up");
    await expect(page.getByTestId("status-off")).toHaveAttribute("data-state", "up");
    await expect(page.getByTestId("status-openai")).toHaveAttribute("data-state", "up");
    await shot(page, "01-status");
    expect(problems).toEqual([]);
  });

  test("the OCR service used by label scans is reachable", async ({ page }) => {
    await page.goto("/#/status");
    const row = page.getByTestId("status-ocr");
    await expect(row).toHaveAttribute("data-state", /up|down/, { timeout: 30_000 });
    await expect(row, await row.innerText()).toHaveAttribute("data-state", "up");
  });
});
