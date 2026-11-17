import { test, expect } from "@playwright/test";
import { API_T_URL, WEB_T_URL, fixtures, shot, signInAs, trackImages, expectImageLoaded } from "./helpers.js";

// Admin pages on the test stack (writes never reach the real database).
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("admin (test stack)", () => {
  test.beforeEach(async ({ page, request }) => {
    await signInAs(page, request, API_T_URL, fixtures().testAdmin);
  });

  test("products tab: thumbnails load; edit a product and save", async ({ page, request }) => {
    const images = trackImages(page);
    await page.goto(`${WEB_T_URL}/#/admin`);
    const table = page.getByTestId("admin-products");
    await expect(table).toBeVisible();
    await expectImageLoaded(page, table.getByTestId("admin-thumb").first(), images, "admin thumbnail");
    await shot(page, "17-admin-products");
    const row = table.locator("tbody tr").first();
    const code = await row.getAttribute("data-code");
    await row.getByRole("button", { name: "Edit" }).click();
    const form = page.getByRole("form", { name: "Edit product" });
    const brands = form.getByLabel("Brands");
    const original = await brands.inputValue();
    await brands.fill(`${original} (e2e)`);
    await form.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByTestId("toast").filter({ hasText: "updated successfully" })).toBeVisible();
    const check = await request.get(`${API_T_URL}/product/${code}`, {
      headers: {
        "x-access-token": (
          await (await request.post(`${API_T_URL}/login`, { data: fixtures().testAdmin })).json()
        ).token,
      },
    });
    expect((await check.json()).product.brands).toBe(`${original} (e2e)`);
  });

  test("needs-review, needs-better-image and users tabs", async ({ page }) => {
    await page.goto(`${WEB_T_URL}/#/admin`);
    await page.getByRole("tab", { name: "Needs review" }).click();
    await expect(page.getByTestId("review-table").or(page.getByTestId("review-empty"))).toBeVisible();
    await page.getByRole("tab", { name: "Needs better image" }).click();
    await expect(page.getByTestId("image-queue-table").or(page.getByTestId("images-empty"))).toBeVisible();
    await page.getByRole("tab", { name: "Users" }).click();
    await expect(page.getByTestId("admin-users")).toBeVisible();
    await expect(page.getByTestId("admin-users")).toContainText(fixtures().testAdmin.email);
    await shot(page, "18-admin-users");
  });

  test("media tab: upload an image, then delete it", async ({ page }) => {
    await page.goto(`${WEB_T_URL}/#/admin`);
    await page.getByRole("tab", { name: "Media" }).click();
    const shotPng = await page.screenshot({ clip: { x: 0, y: 0, width: 320, height: 240 } });
    await page
      .getByLabel(/^Images/)
      .setInputFiles({ name: "e2e-upload.png", mimeType: "image/png", buffer: shotPng });
    await page.getByRole("button", { name: /^Upload/ }).click();
    const table = page.getByTestId("media-table");
    await expect(table).toContainText("e2e-upload.png");
    await expect(table).toContainText("320×240");
    page.on("dialog", (d) => void d.accept());
    await table.getByRole("button", { name: "Delete" }).first().click();
    await expect(page.getByTestId("toast").filter({ hasText: "File deleted" })).toBeVisible();
  });
});
