// Speed: p50/p95 over 20 calls per endpoint on api-perf (the same image and
// data as the test stack, with rate limits off so sampling is not throttled).
// Paid AI paths are sampled 2 times (cost cap). DB-only calls are flagged over
// 500 ms (p95), calls that reach an external service over 3 s.
import { afterAll, beforeAll, describe, expect } from "vitest";
import { check, recordFile } from "./support/recorder";
import { client, login, newUser, removeUser, accounts, type Session } from "./support/clients";
import { env, writeRaw } from "./support/env";
import { png } from "./support/images";
import { isApiError } from "../../src/api/errors";
import { percentile } from "../../src/lib/format";
import { gs1CheckDigit } from "../../src/lib/barcode";
import { freshOffCodes } from "./support/off";
import type { HttpResponse } from "../../src/api/http";
import type { PerfRow } from "../../src/data/results";

recordFile(import.meta.url);
const N = 20;
const DB_BUDGET = 500;
const EXT_BUDGET = 3000;
const rows: PerfRow[] = [];
let user: Session;
let admin: Session;
const extraUsers: Session[] = [];
afterAll(async () => {
  writeRaw("perf.json", rows);
  for (const s of extraUsers) await removeUser(s);
  await removeUser(user);
});

beforeAll(async () => {
  user = await newUser(env.perfApi, "perf");
  admin = await login(env.perfApi, accounts().test.admin);
}, 60_000);

/** Runs `call` n times (sequentially); expected error statuses count as samples, not errors. */
async function sample(
  endpointId: string,
  label: string,
  kind: "db" | "external",
  call: (i: number) => Promise<HttpResponse<unknown>>,
  opts: { n?: number; expectStatus?: number[]; note?: string } = {},
): Promise<PerfRow> {
  const n = opts.n ?? N;
  const times: number[] = [];
  let errors = 0;
  for (let i = 0; i < n; i += 1) {
    try {
      const res = await call(i);
      times.push(res.durationMs);
    } catch (err) {
      if (isApiError(err) && err.durationMs !== undefined && (opts.expectStatus ?? []).includes(err.status))
        times.push(err.durationMs);
      else errors += 1;
    }
  }
  const budgetMs = kind === "db" ? DB_BUDGET : EXT_BUDGET;
  const p95 = percentile(times, 95);
  const row: PerfRow = {
    endpointId,
    label,
    target: "api-perf",
    kind,
    samples: times.length,
    errors,
    p50: percentile(times, 50),
    p95,
    max: times.length ? Math.max(...times) : null,
    budgetMs,
    flagged: p95 === null || p95 > budgetMs,
    ...(opts.note ? { note: opts.note } : {}),
  };
  rows.push(row);
  return row;
}

function expectWithinBudget(row: PerfRow): void {
  expect(row.errors, `${row.errors} unexpected errors in ${row.samples + row.errors} calls`).toBe(0);
  expect(
    row.p95 ?? Infinity,
    `p95 ${String(row.p95)} ms over the ${row.budgetMs} ms budget (p50 ${String(row.p50)} ms)`,
  ).toBeLessThanOrEqual(row.budgetMs);
}

const speed = (endpoint: string, title: string, fn: () => Promise<PerfRow>, timeout = 180_000) => {
  check(
    { endpoint, category: "speed" },
    title,
    async () => {
      expectWithinBudget(await fn());
    },
    timeout,
  );
};

const anon = () => client(env.perfApi);
const unknownEmail = (i: number) => `e2e-perf-none-${env.runId}-${i}@example.test`;
const KNOWN = "8715700407760";

describe("speed: public and auth", () => {
  speed("health", "GET /health", () => sample("health", "GET /health", "db", () => anon().system.health()));
  speed("uploads.static", "GET /uploads/images/{file}", () =>
    sample("uploads.static", "GET /uploads/images (1.2 MB image)", "db", () =>
      anon().system.uploadedImage("off_8715700407760_front_88f5f9b85095580b.jpg"),
    ),
  );
  speed("billing.identifiers", "GET /identifiers", () =>
    sample("billing.identifiers", "GET /identifiers", "db", () => anon().billing.identifiers()),
  );
  speed("auth.login", "POST /login", () =>
    sample("auth.login", "POST /login (bcrypt)", "db", () =>
      anon().auth.login({ email: user.email, password: user.password }),
    ),
  );
  speed("auth.signup", "POST /user", () =>
    sample("auth.signup", "POST /user (bcrypt)", "db", async (i) => {
      const email = `e2e-perf-signup-${env.runId}-${i}@example.test`;
      const res = await anon().auth.signup({
        first_name: "Perf",
        last_name: "Tester",
        email,
        password: user.password,
        repassword: user.password,
      });
      extraUsers.push(await login(env.perfApi, { email, password: user.password }));
      return res;
    }),
  );
  speed("auth.sendVerificationCode", "POST /user/verify/code", () =>
    sample("auth.sendVerificationCode", "POST /user/verify/code (unknown address)", "db", (i) =>
      anon().auth.sendVerificationCode({ email: unknownEmail(i) }),
    ),
  );
  speed("auth.verify", "POST /user/verify", () =>
    sample(
      "auth.verify",
      "POST /user/verify (wrong code, 401)",
      "db",
      (i) => anon().auth.verify({ email: unknownEmail(i), code: "000000" }),
      { expectStatus: [401] },
    ),
  );
  speed("auth.forgotPasswordCode", "POST /user/forgotpassword/code", () =>
    sample("auth.forgotPasswordCode", "POST /user/forgotpassword/code (unknown address)", "db", (i) =>
      anon().auth.forgotPasswordCode({ email: unknownEmail(i) }),
    ),
  );
  speed("auth.changePassword", "POST /user/changepassword", () =>
    sample(
      "auth.changePassword",
      "POST /user/changepassword (wrong code, 404)",
      "db",
      (i) =>
        anon().auth.changePassword({
          email: unknownEmail(i),
          code: "000000",
          new_password: "Another-pass-1",
        }),
      { expectStatus: [404] },
    ),
  );
  speed("auth.social", "POST /user/social/signin", () =>
    sample(
      "auth.social",
      "POST /user/social/signin (invalid token, 401)",
      "db",
      () => anon().auth.socialSignIn({ token: "invalid", provider: "google" }),
      {
        expectStatus: [401],
        note: "Firebase not configured: error path only",
      },
    ),
  );
  speed("cms.login", "POST /cms/login", () =>
    sample("cms.login", "POST /cms/login (bcrypt)", "db", () => anon().admin.cmsLogin(accounts().test.admin)),
  );
});

describe("speed: user", () => {
  speed("user.get", "GET /user/{id}", () =>
    sample("user.get", "GET /user/{id}", "db", () => user.api.user.get(user.id)),
  );
  speed("user.update", "PUT /user/{id}", () =>
    sample("user.update", "PUT /user/{id}", "db", (i) =>
      user.api.user.update(user.id, { user_info: { allergies: [`a${i}`] } }),
    ),
  );
  speed("user.incrementScan", "PUT /user/{id}/increment-scan", () =>
    sample("user.incrementScan", "PUT /user/{id}/increment-scan", "db", () =>
      user.api.user.incrementScan(user.id),
    ),
  );
  speed("user.history", "GET /product/history/user/{id}", () =>
    sample("user.history", "GET /product/history/user/{id}", "db", () => user.api.user.history(user.id)),
  );
  speed("cms.logout", "POST /cms/logout", () =>
    sample("cms.logout", "POST /cms/logout", "db", async (i) => {
      const s = extraUsers[i] ?? user;
      return s.api.admin.logout();
    }),
  );
  speed("user.delete", "DELETE /user/{id}", () =>
    sample("user.delete", "DELETE /user/{id}", "db", async (i) => {
      const s = extraUsers[i];
      if (!s) throw new Error("no signup user to delete");
      return admin.api.user.remove(s.id);
    }),
  );
});

describe("speed: catalogue (database only)", () => {
  speed("product.lookup", "GET /product/{code} (stored product)", () =>
    sample("product.lookup", "GET /product/{code} (stored, admin)", "db", () =>
      admin.api.product.lookup(KNOWN),
    ),
  );
  speed("product.list", "GET /product", () =>
    sample("product.list", "GET /product", "db", (i) =>
      user.api.product.list({ page: (i % 8) + 1, limit: 12 }),
    ),
  );
  speed("product.search", "POST /product/search (word)", () =>
    sample("product.search", "POST /product/search (word)", "db", (i) =>
      user.api.product.search({
        query: ["ketchup", "biscuits", "tuna", "bread", "milk"][i % 5],
        page: 0,
        page_size: 12,
      }),
    ),
  );
  speed("product.search", "POST /product/search (filter)", () =>
    sample("product.search", "POST /product/search (country filter)", "db", (i) =>
      user.api.product.search({
        filters: [{ name: "countries", value: "France" }],
        page: i % 4,
        page_size: 12,
      }),
    ),
  );
  speed("product.byCategory", "POST /product/category", () =>
    sample("product.byCategory", "POST /product/category", "db", () =>
      user.api.product.byCategory({ category: ["Snacks"] }),
    ),
  );
  speed("product.byAdditives", "POST /product/additives", () =>
    sample("product.byAdditives", "POST /product/additives", "db", () =>
      user.api.product.byAdditives({ additives_tags: ["en:e330"] }),
    ),
  );
  speed("cms.reviewQueue", "GET /cms/product-review", () =>
    sample("cms.reviewQueue", "GET /cms/product-review", "db", () => admin.api.admin.reviewQueue()),
  );
  speed("cms.imageQueue", "GET /cms/product-images", () =>
    sample("cms.imageQueue", "GET /cms/product-images", "db", () => admin.api.admin.imageQueue()),
  );
  speed("admin.users", "GET /users", () =>
    sample("admin.users", "GET /users", "db", () => admin.api.admin.users()),
  );
});

describe("speed: admin writes", () => {
  const code = (i: number) => {
    const body = `2098${String(Date.now()).slice(-6)}${String(i).padStart(2, "0")}`;
    return `${body}${gs1CheckDigit(body)}`;
  };
  const codes = Array.from({ length: N }, (_, i) => code(i));
  speed("admin.updateProduct", "PUT /product/update", () =>
    sample("admin.updateProduct", "PUT /product/update (create)", "db", (i) =>
      admin.api.admin.updateProduct({
        product_code: codes[i] ?? "",
        product_details: { product_name: `E2E perf product ${i}`, brands: "E2E" },
      }),
    ),
  );
  speed("admin.deleteProduct", "DELETE /product/{code}", () =>
    sample("admin.deleteProduct", "DELETE /product/{code}", "db", (i) =>
      admin.api.admin.deleteProduct(codes[i] ?? ""),
    ),
  );
  const fileIds: string[] = [];
  speed("admin.uploadMedia", "POST /media/upload", () =>
    sample("admin.uploadMedia", "POST /media/upload (640x480 PNG)", "db", async () => {
      const res = await admin.api.admin.uploadMedia({ images: [png(640, 480)] });
      fileIds.push(res.data.uploadedFiles[0]?.file_id ?? "");
      return res;
    }),
  );
  speed("admin.deleteMedia", "DELETE /media/{id}", () =>
    sample("admin.deleteMedia", "DELETE /media/{id}", "db", (i) =>
      admin.api.admin.deleteMedia(fileIds[i] ?? ""),
    ),
  );
  speed("billing.add", "POST /subscription/add", () =>
    sample("billing.add", "POST /subscription/add", "db", (i) => {
      const from = new Date();
      return user.api.billing.add({
        from_date: from.toISOString(),
        to_date: new Date(from.getTime() + 30 * 86_400_000).toISOString(),
        payment_status: "pending",
        transaction_id: `e2e-perf-${env.runId}-a${i}`,
      });
    }),
  );
  speed("billing.extend", "PUT /subscription/extend", () =>
    sample("billing.extend", "PUT /subscription/extend", "db", (i) =>
      user.api.billing.extend({
        additional_days: 30,
        payment_status: "pending",
        transaction_id: `e2e-perf-${env.runId}-e${i}`,
      }),
    ),
  );
});

describe("speed: external services", () => {
  const inStore = (i: number) => {
    const body = `21${String(Date.now()).slice(-8)}${String(i).padStart(2, "0")}`;
    return `${body}${gs1CheckDigit(body)}`;
  };

  speed(
    "product.lookup",
    "GET /product/{code} via Open Food Facts (first lookup)",
    async () => {
      // only barcodes the database does not have yet, so each lookup really goes to Open Food Facts
      // (skip the first 10 candidates: the fallback tests use those)
      const fresh = await freshOffCodes(admin.api, N, 10);
      return sample(
        "product.lookup",
        "GET /product/{code} via Open Food Facts",
        "external",
        async (i) => {
          // paced: Open Food Facts allows about 100 product reads a minute per IP
          if (i > 0) await new Promise((r) => setTimeout(r, 3000));
          return admin.api.product.lookup(fresh[i] ?? "");
        },
        {
          expectStatus: [404],
          note: "first lookup of popular products (stored afterwards); 3 s apart",
        },
      );
    },
    400_000,
  );

  speed(
    "product.lookup",
    "GET /product/{code} via the AI fallback (2 samples)",
    () =>
      sample(
        "product.lookup",
        "GET /product/{code} via OFF miss + OpenAI",
        "external",
        (i) => admin.api.product.lookup(inStore(i)),
        {
          n: 2,
          expectStatus: [404],
          note: "2 samples (cost cap)",
        },
      ),
    200_000,
  );

  speed(
    "product.scanLabel",
    "POST /product/scan (OCR service, 5 samples)",
    () =>
      sample(
        "product.scanLabel",
        "POST /product/scan (OCR service)",
        "external",
        () => user.api.product.scanLabel(png(800, 600)),
        {
          n: 5,
          expectStatus: [503],
          note: "OCR service unreachable: the API gives up after its 10 s connect timeout (503 + Retry-After); 5 samples",
        },
      ),
    300_000,
  );

  speed(
    "product.analyzePhoto",
    "POST /product/analyze (1 sample)",
    async () => {
      const photo = new Blob(
        [
          await (
            await fetch(`${env.perfApi}/uploads/images/off_8715700407760_front_88f5f9b85095580b.jpg`)
          ).arrayBuffer(),
        ],
        { type: "image/jpeg" },
      );
      return sample(
        "product.analyzePhoto",
        "POST /product/analyze (OpenAI)",
        "external",
        () => user.api.product.analyzePhoto(photo),
        { n: 1, note: "1 sample (cost cap)" },
      );
    },
    200_000,
  );
});
