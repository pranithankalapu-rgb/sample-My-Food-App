// Admin endpoints. Everything that writes runs on the test stack (a throwaway
// copy of the database), never on the real one.
import { afterAll, beforeAll, describe, expect } from "vitest";
import { check, recordFile } from "./support/recorder";
import {
  client,
  failure,
  login,
  newUser,
  removeUser,
  testAdmin,
  accounts,
  type Session,
} from "./support/clients";
import { env } from "./support/env";
import { gs1CheckDigit } from "../../src/lib/barcode";
import { png } from "./support/images";

recordFile(import.meta.url);
let admin: Session;
let user: Session;
// a valid EAN-13 in the in-store range, unique per run, only on the test database
const body = `2099${String(Date.now()).slice(-8)}`;
const TEST_CODE = `${body}${gs1CheckDigit(body)}`;

beforeAll(async () => {
  admin = await testAdmin();
  user = await newUser(env.testApi, "admin-user");
});
afterAll(async () => {
  await removeUser(user);
});

describe("POST /cms/login and /cms/logout", () => {
  check({ endpoint: "cms.login", category: "success" }, "an admin gets a token", async () => {
    const res = await client(env.testApi).admin.cmsLogin(accounts().test.admin);
    expect(res.status).toBe(200);
    expect(res.data.user.role.toLowerCase()).toBe("admin");
    expect(res.data.token).toBeTruthy();
  });

  check(
    { endpoint: "cms.login", category: "auth" },
    "a normal user gets the same 401 as a wrong password",
    async () => {
      const err = await failure(
        client(env.testApi).admin.cmsLogin({ email: user.email, password: user.password }),
      );
      expect(err.status).toBe(401);
      expect(err.serverMessage).toBe("Invalid email or password.");
    },
  );

  check({ endpoint: "cms.login", category: "missing input" }, "400 without a password", async () => {
    expect(
      (await failure(client(env.testApi).admin.cmsLogin({ email: "a@example.test" } as never))).status,
    ).toBe(400);
  });

  check(
    { endpoint: "cms.logout", category: "success" },
    "logout ends every session of the caller",
    async () => {
      const s = await newUser(env.testApi, "logout");
      const second = await login(env.testApi, { email: s.email, password: s.password });
      const res = await s.api.admin.logout();
      expect(res.status).toBe(200);
      expect((await failure(s.api.user.get(s.id))).status).toBe(401);
      expect((await failure(second.api.user.get(s.id))).status).toBe(401);
      await removeUser(await login(env.testApi, { email: s.email, password: s.password }));
    },
  );

  check({ endpoint: "cms.logout", category: "auth" }, "403 without a token", async () => {
    expect((await failure(client(env.testApi).admin.logout())).status).toBe(403);
  });
});

describe("admin lists", () => {
  check(
    { endpoint: "cms.reviewQueue", category: "success" },
    "review queue answers with data and pageInfo",
    async () => {
      const res = await admin.api.admin.reviewQueue({ page: 1, limit: 20 });
      expect(res.status).toBe(200);
      expect(Array.isArray(res.data.data)).toBe(true);
      expect(res.data.pageInfo).toMatchObject({ page: 1 });
    },
  );

  check(
    { endpoint: "cms.imageQueue", category: "success" },
    "image queue lists products with image sizes, smallest first",
    async () => {
      const res = await admin.api.admin.imageQueue({ page: 1, limit: 100 });
      expect(res.status).toBe(200);
      const sizes = res.data.data.map((p) => Math.min(p.image_width ?? 0, p.image_height ?? 0));
      expect([...sizes].sort((a, b) => a - b)).toEqual(sizes);
    },
  );

  check(
    { endpoint: "admin.users", category: "success" },
    "users list without secrets or health data",
    async () => {
      const res = await admin.api.admin.users({ page: 1, limit: 10 });
      expect(res.status).toBe(200);
      expect(res.data.pagination.totalUsers).toBeGreaterThan(0);
      for (const u of res.data.data) {
        expect(u).not.toHaveProperty("password");
        expect(u).not.toHaveProperty("user_info");
        expect(u).not.toHaveProperty("token_version");
      }
    },
  );

  check({ endpoint: "admin.users", category: "invalid input" }, "400 for limit 101 or page 0", async () => {
    expect((await failure(admin.api.admin.users({ limit: 101 }))).status).toBe(400);
    expect((await failure(admin.api.admin.users({ page: 0 }))).status).toBe(400);
  });

  for (const [id, call] of [
    ["cms.reviewQueue", (s: Session) => s.api.admin.reviewQueue()],
    ["cms.imageQueue", (s: Session) => s.api.admin.imageQueue()],
    ["admin.users", (s: Session) => s.api.admin.users()],
    [
      "admin.updateProduct",
      (s: Session) =>
        s.api.admin.updateProduct({ product_code: TEST_CODE, product_details: { product_name: "x" } }),
    ],
    ["admin.deleteProduct", (s: Session) => s.api.admin.deleteProduct("8715700407760")],
    ["admin.uploadMedia", (s: Session) => s.api.admin.uploadMedia({ images: [png(10, 10)] })],
    ["admin.deleteMedia", (s: Session) => s.api.admin.deleteMedia("8a1c2a5e-1111-4bbb-8ccc-000000000000")],
  ] as const) {
    check({ endpoint: id, category: "auth" }, "403 for a signed-in non-admin (wrong role)", async () => {
      const err = await failure(call(user));
      expect(err.status).toBe(403);
      expect(err.serverMessage).toBe("Access forbidden.");
    });
  }
});

describe("PUT /product/update and DELETE /product/{code}", () => {
  check(
    { endpoint: "admin.updateProduct", category: "success" },
    "creates a CMS product (201), then updates it (200)",
    async () => {
      const created = await admin.api.admin.updateProduct({
        product_code: TEST_CODE,
        product_details: {
          product_name: "E2E Test Muesli",
          brands: "E2E Foods",
          ingredients_text: "Oats, wheat flakes, honey",
        },
      });
      expect(created.status).toBe(201);
      const p = (await admin.api.product.lookup(TEST_CODE)).data.product;
      expect(p).toMatchObject({ product_name: "E2E Test Muesli", brands: "E2E Foods", data_source: "cms" });
      const updated = await admin.api.admin.updateProduct({
        product_code: TEST_CODE,
        product_details: { brands: "E2E Foods Ltd" },
        expected_updated_at: p.updatedAt,
      });
      expect(updated.status).toBe(200);
      expect((await admin.api.product.lookup(TEST_CODE)).data.product.brands).toBe("E2E Foods Ltd");
    },
  );

  check(
    { endpoint: "admin.updateProduct", category: "invalid input" },
    "409 when the product changed since it was loaded",
    async () => {
      const err = await failure(
        admin.api.admin.updateProduct({
          product_code: TEST_CODE,
          product_details: { brands: "x" },
          expected_updated_at: "2000-01-01T00:00:00.000Z",
        }),
      );
      expect(err.status).toBe(409);
    },
  );

  check(
    { endpoint: "admin.updateProduct", category: "invalid input" },
    "400 for an empty or 501-character name",
    async () => {
      expect(
        (
          await failure(
            admin.api.admin.updateProduct({
              product_code: TEST_CODE,
              product_details: { product_name: "  " },
            }),
          )
        ).status,
      ).toBe(400);
      expect(
        (
          await failure(
            admin.api.admin.updateProduct({
              product_code: TEST_CODE,
              product_details: { product_name: "x".repeat(501) },
            }),
          )
        ).status,
      ).toBe(400);
    },
  );

  check(
    { endpoint: "admin.updateProduct", category: "missing input" },
    "400 without product_details or with a bad code",
    async () => {
      expect(
        (await failure(admin.api.admin.updateProduct({ product_code: TEST_CODE } as never))).status,
      ).toBe(400);
      expect(
        (await failure(admin.api.admin.updateProduct({ product_code: "bad code!", product_details: {} })))
          .status,
      ).toBe(400);
    },
  );

  check(
    { endpoint: "admin.updateProduct", category: "wrong type" },
    "400 with the field names for wrongly typed values",
    async () => {
      const err = await failure(
        admin.api.admin.updateProduct({
          product_code: TEST_CODE,
          product_details: { nutriments: "lots" as never },
        }),
      );
      expect(err.status).toBe(400);
      expect(JSON.stringify(err.body)).toContain("nutriments");
    },
  );

  check(
    { endpoint: "admin.deleteProduct", category: "success" },
    "removes the product from listings; scans still work; a second delete is 404",
    async () => {
      const res = await admin.api.admin.deleteProduct(TEST_CODE);
      expect(res.status).toBe(200);
      const search = await admin.api.product.search({
        filters: [{ name: "product_name", value: "E2E Test Muesli" }],
      });
      expect(search.data.results).toEqual([]);
      expect((await admin.api.product.lookup(TEST_CODE)).status).toBe(200);
      expect((await failure(admin.api.admin.deleteProduct(TEST_CODE))).status).toBe(404);
    },
  );

  check(
    { endpoint: "admin.deleteProduct", category: "invalid input" },
    "400 for a code with invalid characters",
    async () => {
      expect((await failure(admin.api.admin.deleteProduct("../etc"))).status).toBe(400);
    },
  );
});

describe("POST /media/upload and DELETE /media/{id}", () => {
  check(
    { endpoint: "admin.uploadMedia", category: "success" },
    "stores an image (201) with its pixel size; it is served, then deleted",
    async () => {
      const res = await admin.api.admin.uploadMedia({ images: [png(640, 480)] });
      expect(res.status).toBe(201);
      const file = res.data.uploadedFiles[0];
      expect(file).toMatchObject({ mime_type: "image/png", width: 640, height: 480 });
      const served = await fetch(`${env.testApi}/uploads/images/${file?.url ?? ""}`);
      expect(served.status).toBe(200);
      const del = await admin.api.admin.deleteMedia(file?.file_id ?? "");
      expect(del.status).toBe(200);
      expect((await fetch(`${env.testApi}/uploads/images/${file?.url ?? ""}`)).status).toBe(404);
      expect((await failure(admin.api.admin.deleteMedia(file?.file_id ?? ""))).status).toBe(404);
    },
  );

  check(
    { endpoint: "admin.uploadMedia", category: "wrong type" },
    "400 for a text file sent as image/png (content is checked)",
    async () => {
      const err = await failure(
        admin.api.admin.uploadMedia({ images: [new Blob(["<svg onload=alert(1)>"], { type: "image/png" })] }),
      );
      expect(err.status).toBe(400);
    },
  );

  check(
    { endpoint: "admin.uploadMedia", category: "wrong type" },
    "400 for SVG (scripts) even with the right type",
    async () => {
      const err = await failure(
        admin.api.admin.uploadMedia({
          images: [new Blob(["<svg xmlns='http://www.w3.org/2000/svg'/>"], { type: "image/svg+xml" })],
        }),
      );
      expect(err.status).toBe(400);
    },
  );

  check(
    { endpoint: "admin.uploadMedia", category: "missing input" },
    "a request without files does not create anything",
    async () => {
      const res = await admin.api.admin.uploadMedia({});
      expect(res.data.uploadedFiles).toEqual([]);
    },
  );

  check(
    { endpoint: "admin.deleteMedia", category: "invalid input" },
    "400 for an id that is not a UUID",
    async () => {
      expect((await failure(admin.api.admin.deleteMedia("not-a-uuid"))).status).toBe(400);
    },
  );
});
