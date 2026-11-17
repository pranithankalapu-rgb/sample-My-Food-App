import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { API_T_URL, WEB_T_URL, fixtures, offProxy, shot, signInAs, watchConsole } from "./helpers.js";

// The only deliberate outage in the page tests: Open Food Facts is made
// unreachable for the test stack (toxiproxy), then restored.
test.use({ storageState: { cookies: [], origins: [] } });

async function unknownOffCode(request, apiToken) {
  // candidates from the run's single Open Food Facts search (scripts/run-all-tests.sh);
  // the API tests use the first 30, this test takes later ones
  const codes = JSON.parse(fs.readFileSync(path.join(".e2e-run", "off-candidates.json"), "utf8")).slice(40);
  // exclude everything the test database already lists (otherwise it is served from the DB)
  const headers = { "x-access-token": apiToken };
  const known = new Set();
  const first = await (await request.get(`${API_T_URL}/product?page=1&limit=100`, { headers })).json();
  for (let p = 1; p <= first.pageInfo.pages; p += 1) {
    const page = await (await request.get(`${API_T_URL}/product?page=${p}&limit=100`, { headers })).json();
    for (const row of page.data) known.add(row.code);
  }
  const code = codes.find((c) => !known.has(c));
  if (!code) throw new Error("no Open Food Facts barcode that the test database lacks");
  return code;
}

test("Open Food Facts down: a friendly error with Try again; after it is back, the retry shows the product", async ({
  page,
  request,
}) => {
  const problems = watchConsole(page, { allowStatus: [503] });
  const { token } = await signInAs(page, request, API_T_URL, fixtures().testAdmin);
  const code = await unknownOffCode(request, token);
  try {
    await offProxy(request, false);
    await page.goto(`${WEB_T_URL}/#/product/${code}`);
    const error = page.getByTestId("product-error");
    await expect(error).toBeVisible({ timeout: 30_000 });
    await expect(error).toContainText("HTTP 503");
    await expect(error).toContainText("temporarily unavailable");
    await expect(error).not.toContainText(/at \w+ \(|stack|Error:/);
    await shot(page, "21-outage-error");
    await offProxy(request, true);
    await page.getByTestId("product-error-retry").click();
    await expect(page.getByTestId("product-detail")).toHaveAttribute("data-code", code, { timeout: 30_000 });
    await expect(page.getByTestId("product-served-from")).toHaveAttribute("data-served", "fresh");
    await shot(page, "22-outage-recovered");
  } finally {
    await offProxy(request, true);
  }
  expect(problems).toEqual([]);
});
