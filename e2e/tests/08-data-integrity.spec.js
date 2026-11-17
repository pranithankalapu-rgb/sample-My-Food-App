import { test, expect } from "@playwright/test";
import { API_URL, fixtures } from "./helpers.js";

test.describe("data and images", () => {
  test("every product image file listed in the database is served (200, image bytes)", async ({ request }) => {
    const { uploadFiles } = fixtures();
    expect(uploadFiles.length).toBeGreaterThan(0);
    const broken = [];
    for (const name of uploadFiles) {
      const url = `${API_URL}/uploads/images/${encodeURIComponent(name)}`;
      const res = await request.get(url);
      const type = res.headers()["content-type"] || "";
      const bytes = res.ok() ? (await res.body()).length : 0;
      if (res.status() !== 200 || !type.startsWith("image/") || bytes < 500) {
        broken.push(`${name}: HTTP ${res.status()} ${type} ${bytes} bytes`);
      }
    }
    test.info().annotations.push({ type: "images", description: `${uploadFiles.length} checked, ${broken.length} broken` });
    expect(broken, `${broken.length} of ${uploadFiles.length} image files broken`).toEqual([]);
  });
});
