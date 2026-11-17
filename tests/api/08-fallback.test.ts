// Lookup order DB -> Open Food Facts -> OpenAI, caching, and behaviour when
// the external services are down, slow or silent. Test stack only: the
// toxiproxy containers in front of Open Food Facts and OpenAI are the only
// deliberate outages in the whole suite.
import { afterAll, afterEach, beforeAll, describe, expect } from "vitest";
import { check, recordFile } from "./support/recorder";
import { failure, testAdmin, type Session } from "./support/clients";
import { faults } from "./support/services";
import { freshOffCodes } from "./support/off";
import { gs1CheckDigit } from "../../src/lib/barcode";

recordFile(import.meta.url);
const meta = (category: string) => ({ endpoint: "product.lookup", category, suite: "fallback" as const });
let admin: Session;
const KNOWN = "8715700407760";
const inStore = (seed: number) => {
  const body = `20${String(Date.now() + seed).slice(-10)}`;
  return `${body}${gs1CheckDigit(body)}`;
};
let offCodes: string[] = [];

/** Real products on Open Food Facts that the test database does not have yet. */
const productsOnOff = (count: number) => freshOffCodes(admin.api, count);

beforeAll(async () => {
  admin = await testAdmin();
  await faults.reset("off");
  await faults.reset("openai");
  offCodes = await productsOnOff(6);
}, 120_000);
afterEach(async () => {
  await faults.reset("off");
  await faults.reset("openai");
});
afterAll(async () => {
  // leave both proxies healthy for the tests that follow
  await faults.reset("off");
  await faults.reset("openai");
});

const timed = async <T>(run: () => Promise<T>) => {
  const t0 = performance.now();
  const value = await run();
  return { value, ms: performance.now() - t0 };
};

describe("lookup order and caching", () => {
  check(
    meta("fallback order"),
    "1. DB first: a stored product is served even with Open Food Facts down",
    async () => {
      await faults.down("off");
      const { value, ms } = await timed(() => admin.api.product.lookup(KNOWN));
      expect(value.status).toBe(200);
      expect(value.data.product.code).toBe(KNOWN);
      expect(ms).toBeLessThan(2000);
    },
  );

  check(
    meta("fallback order"),
    "2. Open Food Facts next: an unknown-to-us real product is fetched, labelled and stored",
    async () => {
      const code = offCodes[0];
      expect(code, "a test barcode from Open Food Facts").toBeDefined();
      const first = await admin.api.product.lookup(code ?? "");
      expect(first.data.product.data_source).toBe("openfoodfacts");
      // now it is in the database: served with Open Food Facts down
      await faults.down("off");
      const again = await timed(() => admin.api.product.lookup(code ?? ""));
      expect(again.value.data.product.code).toBe(code);
      expect(again.ms).toBeLessThan(2000);
    },
    60_000,
  );

  check(
    meta("fallback order"),
    "3. OpenAI last: a barcode nobody knows goes to the AI and ends in a clear 404 (or an AI-labelled product)",
    async () => {
      const code = inStore(1);
      const err = await failure(admin.api.product.lookup(code)).catch(() => null);
      if (err) {
        expect(err.status).toBe(404);
        expect(err.serverMessage).toMatch(/not found|still looking/i);
      }
    },
    90_000,
  );

  check(
    meta("caching"),
    "4. a definite miss is remembered: the second lookup is fast and makes no AI call",
    async () => {
      const code = inStore(2);
      await failure(admin.api.product.lookup(code));
      await faults.down("openai");
      await faults.down("off");
      const { value: err, ms } = await timed(() => failure(admin.api.product.lookup(code)));
      expect(err.status).toBe(404);
      expect(ms).toBeLessThan(2000);
    },
    120_000,
  );
});

describe("Open Food Facts outages", () => {
  check(
    meta("outage"),
    "OFF down: 503 with Retry-After in under 3 s, and the outage is not remembered",
    async () => {
      const code = offCodes[1] ?? inStore(3);
      await faults.down("off");
      const { value: err, ms } = await timed(() => failure(admin.api.product.lookup(code)));
      expect(err.status).toBe(503);
      expect(err.retryAfterSeconds).toBeGreaterThan(0);
      expect(ms).toBeLessThan(3000);
      // recovery: as soon as Open Food Facts is back, the same barcode works
      await faults.up("off");
      const ok = await admin.api.product.lookup(code);
      expect(ok.status).toBe(200);
    },
    60_000,
  );

  check(
    meta("outage"),
    "OFF slow (10 s per response): no hang, 503 after the 8 s timeout",
    async () => {
      await faults.slow("off", 10_000);
      const { value: err, ms } = await timed(() =>
        failure(admin.api.product.lookup(offCodes[2] ?? inStore(4))),
      );
      expect(err.status).toBe(503);
      expect(ms).toBeLessThan(12_000);
    },
    60_000,
  );

  check(
    meta("outage"),
    "OFF silent (connection accepted, never answers): 503 after the timeout",
    async () => {
      await faults.blackhole("off");
      const { value: err, ms } = await timed(() =>
        failure(admin.api.product.lookup(offCodes[3] ?? inStore(5))),
      );
      expect(err.status).toBe(503);
      expect(ms).toBeLessThan(12_000);
    },
    60_000,
  );
});

describe("OpenAI outages", () => {
  check(
    meta("outage"),
    "OpenAI down: a clear answer, not a 500, and the outage is not remembered as a miss",
    async () => {
      const code = inStore(6);
      await faults.down("openai");
      const { value: err, ms } = await timed(() => failure(admin.api.product.lookup(code)));
      expect([404, 503]).toContain(err.status);
      expect(ms).toBeLessThan(30_000);
      // not remembered: with OpenAI back, the barcode is looked up again (slow path, not the instant miss)
      await faults.up("openai");
      const again = await timed(() => failure(admin.api.product.lookup(code)));
      expect(again.value.status).toBe(404);
      expect(
        again.ms,
        "second lookup returned instantly: the outage was cached as 'unknown barcode'",
      ).toBeGreaterThan(1500);
    },
    150_000,
  );

  check(
    meta("outage"),
    "OpenAI slow: the lookup answers 'still looking' (404 lookup_pending, Retry-After) instead of hanging",
    async () => {
      await faults.slow("openai", 40_000);
      const { value: err, ms } = await timed(() => failure(admin.api.product.lookup(inStore(7))));
      expect(err.status).toBe(404);
      expect((err.body as { lookup_pending?: boolean }).lookup_pending).toBe(true);
      expect(err.retryAfterSeconds).toBeGreaterThan(0);
      expect(ms).toBeLessThan(35_000);
    },
    90_000,
  );
});
