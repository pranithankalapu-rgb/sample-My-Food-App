// Images of every listed product on the real API (admin lookups are not
// counted as scans and leave no history).
import { beforeAll, describe, expect } from "vitest";
import { check, recordFile } from "./support/recorder";
import { realAdmin, type Session } from "./support/clients";
import { env } from "./support/env";
import type { Product } from "../../src/api/types";

recordFile(import.meta.url);
let admin: Session;
const products: Product[] = [];
const toInternal = (url: string) => url.replace(/^http:\/\/localhost:9595/, env.realApi);

async function head(url: string): Promise<{ status: number; type: string; bytes: number }> {
  const res = await fetch(toInternal(url), { signal: AbortSignal.timeout(20_000) });
  const buf = res.ok ? await res.arrayBuffer() : new ArrayBuffer(0);
  return { status: res.status, type: res.headers.get("content-type") ?? "", bytes: buf.byteLength };
}

beforeAll(async () => {
  admin = await realAdmin();
  const first = await admin.api.product.list({ page: 1, limit: 100 });
  const codes = first.data.data.map((p) => p.code);
  for (let page = 2; page <= first.data.pageInfo.pages; page += 1) {
    codes.push(...(await admin.api.product.list({ page, limit: 100 })).data.data.map((p) => p.code));
  }
  // the API allows 120 lookups a minute per account: stay under it
  for (const code of codes) {
    products.push((await admin.api.product.lookup(code)).data.product);
    await new Promise((r) => setTimeout(r, 600));
  }
}, 300_000);

describe("product images", () => {
  check(
    { endpoint: "product.lookup", category: "images" },
    "every listed product has a main image that loads (200, image bytes)",
    async () => {
      const problems: string[] = [];
      for (const p of products) {
        if (!p.image_url) {
          problems.push(`${p.code}: no image_url`);
          continue;
        }
        const r = await head(p.image_url);
        if (r.status !== 200 || !r.type.startsWith("image/") || r.bytes < 1000)
          problems.push(`${p.code}: HTTP ${r.status} ${r.type} ${r.bytes} B (${p.image_url})`);
      }
      expect(problems, `${problems.length} of ${products.length} products`).toEqual([]);
    },
    300_000,
  );

  check(
    { endpoint: "product.lookup", category: "images" },
    "thumbnails are smaller files than the full-size image",
    async () => {
      const heavy: string[] = [];
      let total = 0;
      for (const p of products) {
        if (!p.image_thumb_url) continue;
        const r = await head(p.image_thumb_url);
        total += r.bytes;
        if (p.image_thumb_url === p.image_url && r.bytes > 150 * 1024)
          heavy.push(`${p.code}: thumbnail is the ${Math.round(r.bytes / 1024)} KB original`);
      }
      expect(
        heavy,
        `${heavy.length} of ${products.length} thumbnails are full-size originals; all thumbnails together: ${Math.round(total / 1024 / 1024)} MB`,
      ).toEqual([]);
    },
    300_000,
  );

  check(
    { endpoint: "product.lookup", category: "images" },
    "low resolution is flagged exactly when the short side is under 400 px",
    () => {
      const wrong: string[] = [];
      for (const p of products) {
        if (!p.image_width || !p.image_height) continue;
        const small = Math.min(p.image_width, p.image_height) < 400;
        if (small !== p.needs_better_image)
          wrong.push(
            `${p.code}: ${p.image_width}x${p.image_height}, needs_better_image=${String(p.needs_better_image)}`,
          );
      }
      expect(wrong).toEqual([]);
    },
  );

  check(
    { endpoint: "product.lookup", category: "images" },
    "image sizes are reported for every main image",
    () => {
      const missing = products
        .filter((p) => p.image_url && (!p.image_width || !p.image_height))
        .map((p) => `${p.code} (${p.image_source ?? "?"})`);
      expect(missing).toEqual([]);
    },
  );
});
