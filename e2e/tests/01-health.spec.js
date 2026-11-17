import { test, expect } from "@playwright/test";
import { API_URL, CMS_URL, WEB_URL } from "./helpers.js";

test.describe("health", () => {
  test("API /health returns 200 ok", async ({ request }) => {
    const res = await request.get(`${API_URL}/health`);
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ status: "ok" });
  });

  test("CMS serves its app", async ({ request }) => {
    const res = await request.get(`${CMS_URL}/`);
    expect(res.status()).toBe(200);
    expect(await res.text()).toContain('id="root"');
  });

  test("sample frontend serves its app and proxies the API", async ({ request, page }) => {
    const health = await request.get(`${WEB_URL}/healthz`);
    expect(health.status()).toBe(200);
    // /api/* goes through this app's nginx to API_BASE_URL
    const proxied = await request.get(`${WEB_URL}/api/health`);
    expect(proxied.status()).toBe(200);
    expect(await proxied.json()).toEqual({ status: "ok" });
    await page.goto("/");
    await expect(page).toHaveTitle(/My Food App/);
  });
});
