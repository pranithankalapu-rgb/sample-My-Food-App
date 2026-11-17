// Product endpoints. Known products on the real API; anything that could
// reach Open Food Facts or the AI fallback (unknown or invalid barcodes) runs
// on the test stack, whose AI budget is capped.
import { afterAll, beforeAll, describe, expect } from "vitest";
import { check, recordFile } from "./support/recorder";
import { client, failure, newUser, realAdmin, removeUser, type Session } from "./support/clients";
import { env } from "./support/env";

recordFile(import.meta.url);
let user: Session;
let admin: Session;
let testUser: Session;
const KNOWN = "8715700407760";

beforeAll(async () => {
  user = await newUser(env.realApi, "product");
  admin = await realAdmin();
  testUser = await newUser(env.testApi, "product-t");
});
afterAll(async () => {
  await removeUser(user);
  await removeUser(testUser);
});

const PRODUCT_KEYS: string[] = [
  "code",
  "product_name",
  "brands",
  "nutriments",
  "ingredients_text",
  "countries",
  "selected_images",
  "image_url",
  "image_thumb_url",
  "image_width",
  "image_height",
  "needs_better_image",
  "data_source",
  "isRecommended",
];

describe("GET /product/{code}", () => {
  check(
    { endpoint: "product.lookup", category: "success" },
    "returns a stored product with every documented field",
    async () => {
      const res = await user.api.product.lookup(KNOWN);
      expect(res.status).toBe(200);
      const p = res.data.product;
      for (const key of PRODUCT_KEYS) expect(p, `field ${key}`).toHaveProperty(key);
      expect(p.code).toBe(KNOWN);
      expect(p.product_name).toBeTruthy();
      expect(p.data_source).toBe("openfoodfacts");
      expect(p.isRecommended).toMatchObject({ recommended: expect.any(Boolean) as boolean });
      expect(["recommended", "not_recommended", "insufficient_data"]).toContain(
        (p.isRecommended as { verdict: string }).verdict,
      );
      expect(Number(p.nutriments["energy-kcal_100g"])).toBeGreaterThan(0);
    },
  );

  check(
    { endpoint: "product.lookup", category: "success" },
    "image_url is a loadable full-size image",
    async () => {
      const p = (await admin.api.product.lookup(KNOWN)).data.product;
      expect(p.image_url).toMatch(/^https?:\/\//);
      const res = await fetch(String(p.image_url).replace(/^http:\/\/localhost:9595/, env.realApi));
      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toMatch(/^image\//);
      expect(
        p.image_width && p.image_height ? Math.min(p.image_width, p.image_height) : 0,
      ).toBeGreaterThanOrEqual(400);
    },
  );

  check(
    { endpoint: "product.lookup", category: "auth" },
    "403 without a token, 401 with a bad token",
    async () => {
      expect((await failure(client(env.realApi).product.lookup(KNOWN))).status).toBe(403);
      expect((await failure(client(env.realApi, "bad").product.lookup(KNOWN))).status).toBe(401);
    },
  );

  check(
    { endpoint: "product.lookup", category: "invalid barcode" },
    "400 for characters outside the barcode pattern",
    async () => {
      for (const code of ["abc!@#", "12 34", "<script>", "1;DROP TABLE"]) {
        const err = await failure(user.api.product.lookup(code));
        expect(err.status, code).toBe(400);
      }
    },
  );

  check({ endpoint: "product.lookup", category: "too long" }, "400 for a 65-character code", async () => {
    expect((await failure(user.api.product.lookup("1".repeat(65)))).status).toBe(400);
  });

  check(
    { endpoint: "product.lookup", category: "invalid barcode" },
    "letters-only barcode: rejected before any external lookup",
    async () => {
      // a robust API would refuse it without asking Open Food Facts or the AI
      const err = await failure(testUser.api.product.lookup("ABCDEFGH"));
      expect(err.status).toBe(400);
    },
    90_000,
  );

  check(
    { endpoint: "product.lookup", category: "invalid barcode" },
    "wrong-length barcode (4 digits): rejected before any external lookup",
    async () => {
      const err = await failure(testUser.api.product.lookup("1234"));
      expect(err.status).toBe(400);
    },
    90_000,
  );

  check(
    { endpoint: "product.lookup", category: "invalid barcode" },
    "bad check digit (8715700407761): rejected before any external lookup",
    async () => {
      const err = await failure(testUser.api.product.lookup("8715700407761"));
      expect(err.status).toBe(400);
    },
    90_000,
  );
});

describe("GET /product (browse)", () => {
  check({ endpoint: "product.list", category: "success" }, "returns a page with pageInfo", async () => {
    const res = await user.api.product.list({ page: 1, limit: 12 });
    expect(res.status).toBe(200);
    expect(res.data.data).toHaveLength(12);
    expect(res.data.pageInfo).toMatchObject({
      page: 1,
      total: expect.any(Number) as number,
      pages: expect.any(Number) as number,
    });
    expect(res.data.data[0]).toHaveProperty("image_thumb_url");
  });

  check(
    { endpoint: "product.list", category: "pagination" },
    "pages do not overlap and the last page holds the remainder",
    async () => {
      const p1 = await user.api.product.list({ page: 1, limit: 12 });
      const p2 = await user.api.product.list({ page: 2, limit: 12 });
      const codes1 = new Set(p1.data.data.map((p) => p.code));
      expect(p2.data.data.some((p) => codes1.has(p.code))).toBe(false);
      const { total, pages } = p1.data.pageInfo;
      const last = await user.api.product.list({ page: pages, limit: 12 });
      expect(last.data.data).toHaveLength(total - (pages - 1) * 12);
    },
  );

  check(
    { endpoint: "product.list", category: "pagination" },
    "page 0 is page 1; limit 1000 is clamped to 100",
    async () => {
      const zero = await user.api.product.list({ page: 0, limit: 5 });
      const one = await user.api.product.list({ page: 1, limit: 5 });
      expect(zero.data.data.map((p) => p.code)).toEqual(one.data.data.map((p) => p.code));
      const big = await user.api.product.list({ page: 1, limit: 1000 });
      expect(big.data.data.length).toBeLessThanOrEqual(100);
    },
  );

  check({ endpoint: "product.list", category: "pagination" }, "404 past the last page", async () => {
    const err = await failure(user.api.product.list({ page: 400, limit: 100 }));
    expect(err.status).toBe(404);
  });

  check(
    { endpoint: "product.list", category: "missing input" },
    "400 without page/limit, or with non-numbers",
    async () => {
      const http = client(env.realApi, user.token);
      expect((await failure(http.product.list({} as never))).status).toBe(400);
      expect((await failure(http.product.list({ page: "x", limit: 5 } as never))).status).toBe(400);
      expect((await failure(http.product.list({ page: -1, limit: 5 }))).status).toBe(400);
    },
  );
});

describe("POST /product/search", () => {
  check(
    { endpoint: "product.search", category: "success" },
    "finds a product by a word of its name",
    async () => {
      const res = await user.api.product.search({ query: "ketchup", page: 0, page_size: 12 });
      expect(res.status).toBe(200);
      expect(typeof res.data.totalSearchResultsCount).toBe("string");
      expect(res.data.results.map((r) => r.code)).toContain(KNOWN);
    },
  );

  check(
    { endpoint: "product.search", category: "success" },
    "an empty query lists everything (count equals the listing total)",
    async () => {
      const all = await user.api.product.search({ query: "", page: 0, page_size: 12 });
      const list = await user.api.product.list({ page: 1, limit: 1 });
      expect(Number(all.data.totalSearchResultsCount)).toBe(list.data.pageInfo.total);
    },
  );

  check(
    { endpoint: "product.search", category: "empty results" },
    "no match: 200 with an empty list",
    async () => {
      const res = await user.api.product.search({ query: "zzqxnomatchzzqx" });
      expect(res.data.results).toEqual([]);
      expect(res.data.totalSearchResultsCount).toBe("0");
    },
  );

  check(
    { endpoint: "product.search", category: "empty results" },
    "one-character search returns results or a clear hint (not silently nothing)",
    async () => {
      const res = await user.api.product.search({ query: "a", page_size: 12 });
      expect(
        Number(res.data.totalSearchResultsCount),
        "one-letter query 'a' matched nothing although many names contain it",
      ).toBeGreaterThan(0);
    },
  );

  check(
    { endpoint: "product.search", category: "special characters" },
    "accented and quoted queries work",
    async () => {
      const res = await user.api.product.search({ query: "Atún" });
      expect(res.data.results.length).toBeGreaterThan(0);
      const quoted = await user.api.product.search({ query: 'l\'huile "bio"' });
      expect(quoted.status).toBe(200);
    },
  );

  check(
    { endpoint: "product.search", category: "injection" },
    "SQL-like query is treated as text (200, nothing broken)",
    async () => {
      const res = await user.api.product.search({ query: "'; DROP TABLE products; --" });
      expect(res.status).toBe(200);
      const after = await user.api.product.list({ page: 1, limit: 1 });
      expect(after.data.pageInfo.total).toBeGreaterThan(0);
    },
  );

  check(
    { endpoint: "product.search", category: "too long" },
    "query of 2001 characters is 400; 2000 is accepted",
    async () => {
      expect((await failure(user.api.product.search({ query: "a".repeat(2001) }))).status).toBe(400);
      expect((await user.api.product.search({ query: "ketchup ".repeat(250) })).status).toBe(200);
    },
  );

  check(
    { endpoint: "product.search", category: "success" },
    "filters by country and category (exact stored values)",
    async () => {
      const fr = await user.api.product.search({
        filters: [{ name: "countries", value: ["France"] }],
        page_size: 100,
      });
      expect(Number(fr.data.totalSearchResultsCount)).toBeGreaterThan(0);
      expect(fr.data.results.every((r) => (r.countries ?? []).includes("France"))).toBe(true);
      const snacks = await user.api.product.search({
        filters: [{ name: "categories", value: "Snacks" }],
        page_size: 100,
      });
      expect(snacks.data.results.every((r) => (r.categories ?? []).includes("Snacks"))).toBe(true);
    },
  );

  check(
    { endpoint: "product.search", category: "data quality" },
    "a country filter finds every product of that country (names are not mixed languages)",
    async () => {
      const english = await user.api.product.search({
        filters: [{ name: "countries", value: "Germany" }],
        page_size: 100,
      });
      const french = await user.api.product.search({
        filters: [{ name: "countries", value: "Allemagne" }],
        page_size: 100,
      });
      expect(
        Number(french.data.totalSearchResultsCount),
        `"Allemagne" (French for Germany) is stored for ${french.data.totalSearchResultsCount} products that a "Germany" filter (${english.data.totalSearchResultsCount}) misses`,
      ).toBe(0);
    },
  );

  check(
    { endpoint: "product.search", category: "pagination" },
    "page past the end returns an empty list",
    async () => {
      const res = await user.api.product.search({ query: "", page: 400, page_size: 100 });
      expect(res.data.results).toEqual([]);
    },
  );

  check(
    { endpoint: "product.search", category: "wrong type" },
    "400 when filters is not a list",
    async () => {
      expect((await failure(user.api.product.search({ filters: "France" } as never))).status).toBe(400);
    },
  );
});

describe("POST /product/category and /product/additives", () => {
  check(
    { endpoint: "product.byCategory", category: "success" },
    "returns products of any listed category",
    async () => {
      const res = await user.api.product.byCategory({ category: ["Snacks", "Breakfasts"] });
      expect(res.status).toBe(200);
      expect(res.data.data.length).toBeGreaterThan(0);
      expect(
        res.data.data.every((p) => (p.categories ?? []).some((c) => c === "Snacks" || c === "Breakfasts")),
      ).toBe(true);
    },
  );

  check(
    { endpoint: "product.byCategory", category: "empty results" },
    "404 with a message when nothing matches",
    async () => {
      const err = await failure(user.api.product.byCategory({ category: ["No such category e2e"] }));
      expect(err.status).toBe(404);
    },
  );

  check(
    { endpoint: "product.byCategory", category: "missing input" },
    "400 without category, with a string, or with 51 items",
    async () => {
      expect((await failure(user.api.product.byCategory({} as never))).status).toBe(400);
      expect((await failure(user.api.product.byCategory({ category: "Snacks" } as never))).status).toBe(400);
      expect(
        (
          await failure(
            user.api.product.byCategory({ category: Array.from({ length: 51 }, (_, i) => `c${i}`) }),
          )
        ).status,
      ).toBe(400);
    },
  );

  check(
    { endpoint: "product.byCategory", category: "images" },
    "results carry image URLs like the other listings",
    async () => {
      const res = await user.api.product.byCategory({ category: ["Snacks"] });
      expect(
        res.data.data[0],
        "category results have no image_thumb_url (browse and search do)",
      ).toHaveProperty("image_thumb_url");
    },
  );

  check(
    { endpoint: "product.byAdditives", category: "success" },
    "returns products with an additive",
    async () => {
      const res = await user.api.product.byAdditives({ additives_tags: ["en:e330"] });
      expect(res.status).toBe(200);
      expect(res.data.data.every((p) => (p.additives_tags ?? []).includes("en:e330"))).toBe(true);
    },
  );

  check(
    { endpoint: "product.byAdditives", category: "empty results" },
    "404 when nothing matches",
    async () => {
      expect((await failure(user.api.product.byAdditives({ additives_tags: ["en:e9999"] }))).status).toBe(
        404,
      );
    },
  );

  check(
    { endpoint: "product.byAdditives", category: "missing input" },
    "400 without additives_tags",
    async () => {
      expect((await failure(user.api.product.byAdditives({} as never))).status).toBe(400);
    },
  );

  check({ endpoint: "product.byAdditives", category: "auth" }, "403 without a token", async () => {
    expect(
      (await failure(client(env.realApi).product.byAdditives({ additives_tags: ["en:e330"] }))).status,
    ).toBe(403);
  });
});

describe("POST /product/scan (label OCR)", () => {
  const png = async () => {
    const res = await fetch(
      `${env.realApi}/uploads/images/off_8715700407760_ingredients_1806b54801494611.jpg`,
    );
    return new Blob([await res.arrayBuffer()], { type: "image/jpeg" });
  };

  check(
    { endpoint: "product.scanLabel", category: "success" },
    "a label photo returns the OCR result",
    async () => {
      const res = await user.api.product.scanLabel(await png());
      expect(res.status).toBe(200);
      expect(res.data).toHaveProperty("ocrData");
    },
    60_000,
  );

  check({ endpoint: "product.scanLabel", category: "missing input" }, "400 without a file", async () => {
    const err = await failure(user.api.product.scanLabel(undefined));
    expect(err.status).toBe(400);
  });

  check(
    { endpoint: "product.scanLabel", category: "wrong type" },
    "400 for a text file, even when it claims to be a PNG",
    async () => {
      const fake = new Blob(["this is not an image"], { type: "image/png" });
      const err = await failure(user.api.product.scanLabel(fake));
      expect(err.status).toBe(400);
    },
  );

  check({ endpoint: "product.scanLabel", category: "too long" }, "400 for an image over 10 MB", async () => {
    const big = new Blob([new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), new Uint8Array(10 * 1024 * 1024 + 10)], {
      type: "image/jpeg",
    });
    const err = await failure(user.api.product.scanLabel(big));
    expect(err.status).toBe(400);
  });

  check({ endpoint: "product.scanLabel", category: "auth" }, "403 without a token", async () => {
    expect((await failure(client(env.realApi).product.scanLabel(await png()))).status).toBe(403);
  });
});
