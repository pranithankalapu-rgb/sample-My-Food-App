import { test, expect } from "@playwright/test";
import {
  API_T_URL,
  WEB_T_URL,
  fixtures,
  shot,
  signInAs,
  trackImages,
  expectImageLoaded,
  validEan13,
  watchConsole,
} from "./helpers.js";

const NUTELLA = "3017624010701"; // allergens: milk, nuts, soya (Open Food Facts image)

test.describe("product detail", () => {
  test("gallery: thumbnails switch the image; the viewer opens full size and zooms", async ({ page }) => {
    const images = trackImages(page);
    await page.goto("/#/product/8715700407760");
    await expect(page.getByTestId("product-detail")).toBeVisible();
    await expectImageLoaded(page, page.getByTestId("product-image").first(), images, "main image");
    const thumbs = page.getByRole("button", { name: /^Show / });
    expect(await thumbs.count()).toBeGreaterThan(1);
    await thumbs.nth(1).click();
    await expect(thumbs.nth(1)).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("gallery-open").click();
    const viewer = page.getByTestId("lightbox");
    await expect(viewer).toBeVisible();
    await expect(page.getByTestId("lightbox-zoom")).toHaveText("100%");
    await page.getByRole("button", { name: "Zoom in" }).click();
    await expect(page.getByTestId("lightbox-zoom")).toHaveText("150%");
    await shot(page, "06-gallery-zoom");
    await page.keyboard.press("Escape");
    await expect(viewer).toBeHidden();
  });

  test("ingredients highlight allergens; countries are in English", async ({ page }) => {
    await page.goto(`/#/product/${NUTELLA}`);
    await expect(page.getByTestId("product-detail")).toBeVisible();
    const marks = page.getByTestId("allergen-highlight");
    expect(await marks.count()).toBeGreaterThan(0);
    const highlighted = (await marks.allInnerTexts()).join(" ").toLowerCase();
    expect(highlighted).toMatch(/milk|hazelnut|soy/);
    await expect(page.getByTestId("product-allergens")).toContainText(/milk/i);
    const countries = await page.getByTestId("product-countries").innerText();
    expect(countries).not.toMatch(/Belgique|Allemagne|Espagne|Suisse|Royaume|États/);
    await shot(page, "07-allergens");
  });
});

test.describe("missing, broken and low-resolution images (test stack)", () => {
  /** @type {{ token: string }} */
  let admin;
  const codes = { none: validEan13("20961"), broken: validEan13("20962"), lowres: validEan13("20963") };

  test.beforeAll(async ({ request, browser }) => {
    const { testAdmin } = fixtures();
    const res = await request.post(`${API_T_URL}/login`, { data: testAdmin });
    admin = await res.json();
    const headers = { "x-access-token": admin.token };
    // a real 200x150 PNG, drawn by the browser
    const page = await browser.newPage({ viewport: { width: 300, height: 300 } });
    await page.setContent('<div id="i" style="width:200px;height:150px;background:#c33"></div>');
    const png = await page.locator("#i").screenshot({ type: "png" });
    await page.close();
    const upload = await request.post(`${API_T_URL}/media/upload`, {
      headers,
      multipart: { images: { name: "small.png", mimeType: "image/png", buffer: png } },
    });
    expect(upload.status(), await upload.text()).toBe(201);
    const file = (await upload.json()).uploadedFiles[0];
    const save = (code, details) =>
      request.put(`${API_T_URL}/product/update`, {
        headers,
        data: { product_code: code, product_details: { brands: "E2E Images", ...details } },
      });
    for (const r of [
      await save(codes.none, { product_name: "E2E no image" }),
      await save(codes.broken, {
        product_name: "E2E broken image",
        selected_images: {
          uploaded_images: [{ url: "e2e-file-that-does-not-exist.jpg", width: 900, height: 900 }],
        },
      }),
      await save(codes.lowres, {
        product_name: "E2E low resolution",
        selected_images: {
          uploaded_images: [{ url: file.url, file_id: file.file_id, width: 200, height: 150 }],
        },
      }),
    ])
      expect(r.status(), await r.text()).toBeLessThan(300);
  });

  test.afterAll(async ({ request }) => {
    for (const code of Object.values(codes)) {
      await request.delete(`${API_T_URL}/product/${code}`, { headers: { "x-access-token": admin.token } });
    }
  });

  test("no image: a placeholder, never a broken icon", async ({ browser, request }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await signInAs(page, request, API_T_URL, fixtures().testUser);
    await page.goto(`${WEB_T_URL}/#/product/${codes.none}`);
    await expect(page.getByTestId("product-image-placeholder")).toHaveAttribute("data-reason", "missing");
    await expect(page.locator("img[data-testid='product-image']")).toHaveCount(0);
    await shot(page, "08-image-missing");
    await context.close();
  });

  test("broken image URL: the placeholder replaces the image", async ({ browser, request }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    const problems = watchConsole(page, { allowStatus: [404] });
    await signInAs(page, request, API_T_URL, fixtures().testUser);
    await page.goto(`${WEB_T_URL}/#/product/${codes.broken}`);
    await expect(page.getByTestId("product-image-placeholder")).toHaveAttribute("data-reason", "error");
    await expect(page.getByTestId("product-image-placeholder")).toContainText("Image unavailable");
    expect(problems).toEqual([]);
    await context.close();
  });

  test("low resolution: the image shows with a 'Low resolution' note", async ({ browser, request }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await signInAs(page, request, API_T_URL, fixtures().testUser);
    await page.goto(`${WEB_T_URL}/#/product/${codes.lowres}`);
    await expect(page.getByTestId("product-image-lowres")).toContainText("Low resolution (200×150)");
    await shot(page, "09-image-lowres");
    await context.close();
  });

  test("search thumbnails use the same placeholders", async ({ browser, request }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    const page = await context.newPage();
    await signInAs(page, request, API_T_URL, fixtures().testUser);
    await page.goto(`${WEB_T_URL}/#/search?q=E2E`);
    await expect(
      page.locator(
        `[data-testid="search-result"][data-code="${codes.none}"] [data-testid="result-thumb-placeholder"]`,
      ),
    ).toBeVisible();
    await expect(
      page.locator(
        `[data-testid="search-result"][data-code="${codes.broken}"] [data-testid="result-thumb-placeholder"]`,
      ),
    ).toHaveAttribute("data-reason", "error");
    await context.close();
  });
});
