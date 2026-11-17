// POST /product/analyze (OpenAI). Test stack only (capped AI budget). Runs
// before the fallback file, whose slow-OpenAI case can hold the single AI slot.
import { afterAll, beforeAll, describe, expect } from "vitest";
import { check, recordFile } from "./support/recorder";
import { client, failure, newUser, removeUser, type Session } from "./support/clients";
import { env } from "./support/env";
import { png } from "./support/images";

recordFile(import.meta.url);
let user: Session;

beforeAll(async () => {
  user = await newUser(env.testApi, "photo");
});
afterAll(async () => {
  await removeUser(user);
});

const foodPhoto = async () => {
  const res = await fetch(`${env.testApi}/uploads/images/off_8715700407760_front_88f5f9b85095580b.jpg`);
  return new Blob([await res.arrayBuffer()], { type: "image/jpeg" });
};

describe("POST /product/analyze", () => {
  check(
    { endpoint: "product.analyzePhoto", category: "success" },
    "a food photo gets a full report with a server-scored verdict and a disclaimer",
    async () => {
      const res = await user.api.product.analyzePhoto(await foodPhoto());
      expect(res.status).toBe(200);
      const r = res.data.report;
      expect(r.is_food).toBe(true);
      expect(r.name).toBeTruthy();
      expect(r.nutrition).toBeDefined();
      const verdict = r.verdict as { verdict: string; recommended: boolean };
      expect(["recommended", "not_recommended", "insufficient_data"]).toContain(verdict.verdict);
      // unverified AI nutrition must never score "recommended"
      expect(verdict.recommended).toBe(false);
      expect(verdict.verdict).not.toBe("recommended");
      expect(r.disclaimer).toMatch(/AI/);
    },
    90_000,
  );

  check(
    { endpoint: "product.analyzePhoto", category: "success" },
    "a photo that is not food answers is_food: false",
    async () => {
      const res = await user.api.product.analyzePhoto(png(400, 400, [30, 90, 200]));
      expect([200, 422]).toContain(res.status);
      if (res.status === 200) expect(res.data.report.is_food).toBe(false);
    },
    90_000,
  );

  check({ endpoint: "product.analyzePhoto", category: "missing input" }, "400 without a file", async () => {
    expect((await failure(user.api.product.analyzePhoto(undefined))).status).toBe(400);
  });

  check(
    { endpoint: "product.analyzePhoto", category: "wrong type" },
    "400 for a PDF or a HEIC (not supported here)",
    async () => {
      const pdf = new Blob(["%PDF-1.4\n%e2e\n"], { type: "application/pdf" });
      expect((await failure(user.api.product.analyzePhoto(pdf))).status).toBe(400);
    },
  );

  check({ endpoint: "product.analyzePhoto", category: "auth" }, "403 without a token", async () => {
    expect((await failure(client(env.testApi).product.analyzePhoto(await foodPhoto()))).status).toBe(403);
  });
});
