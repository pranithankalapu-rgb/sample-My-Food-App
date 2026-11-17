import { describe, expect } from "vitest";
import { check, recordFile } from "./support/recorder";
import { client, failure } from "./support/clients";
import { env } from "./support/env";

recordFile(import.meta.url);
const anon = client(env.realApi);
const KNOWN_FILE = "off_8715700407760_front_88f5f9b85095580b.jpg";

describe("GET /health", () => {
  check({ endpoint: "health", category: "success" }, "returns 200 {status: ok} without a token", async () => {
    const res = await anon.system.health();
    expect(res.status).toBe(200);
    expect(res.data).toEqual({ status: "ok" });
  });

  check({ endpoint: "health", category: "auth" }, "ignores an invalid token", async () => {
    const res = await client(env.realApi, "not-a-token").system.health({ token: "not-a-token" });
    expect(res.status).toBe(200);
  });
});

describe("GET /health/deps", () => {
  check(
    { endpoint: "health.deps", category: "success" },
    "reports each dependency as up/down/disabled/misconfigured with a time, without a token",
    async () => {
      const res = await anon.system.dependencies();
      expect(res.status).toBe(200);
      expect(["ok", "degraded"]).toContain(res.data.status);
      expect(Number.isNaN(Date.parse(res.data.checked_at))).toBe(false);
      expect(Object.keys(res.data.services).sort()).toEqual(["database", "ocr", "open_food_facts", "openai"]);
      for (const [name, s] of Object.entries(res.data.services)) {
        expect(["up", "down", "disabled", "misconfigured"], name).toContain(s.status);
        expect(s.ms, name).toBeGreaterThanOrEqual(0);
      }
      expect(res.data.services.database.status).toBe("up");
      expect(res.headers["cache-control"]).toBe("no-store");
    },
    30_000,
  );

  check(
    { endpoint: "health.deps", category: "success" },
    "is cached: a second call within 30 s gives the same check, quickly",
    async () => {
      const first = await anon.system.dependencies();
      const second = await anon.system.dependencies();
      expect(second.data.checked_at).toBe(first.data.checked_at);
      expect(second.durationMs).toBeLessThan(500);
    },
    30_000,
  );

  check(
    { endpoint: "health.deps", category: "auth" },
    "never exposes keys, URLs or error details, and ignores an invalid token",
    async () => {
      const res = await client(env.realApi, "not-a-token").system.dependencies({ token: "not-a-token" });
      expect(res.status).toBe(200);
      expect(JSON.stringify(res.data)).not.toMatch(/sk-|Bearer|https?:\/\/|ECONN|Error/i);
    },
    30_000,
  );
});

describe("GET /uploads/images/{file}", () => {
  check(
    { endpoint: "uploads.static", category: "success" },
    "serves a product image with an image content type",
    async () => {
      const res = await anon.system.uploadedImage(KNOWN_FILE);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/^image\/(jpeg|png|webp)/);
      expect(res.data.size).toBeGreaterThan(5000);
      expect(res.headers["cross-origin-resource-policy"]).toBe("cross-origin");
    },
  );

  check(
    { endpoint: "uploads.static", category: "missing image" },
    "answers 404 JSON for a file that does not exist",
    async () => {
      const err = await failure(anon.system.uploadedImage("does-not-exist-e2e.jpg"));
      expect(err.status).toBe(404);
    },
  );

  check(
    { endpoint: "uploads.static", category: "invalid input" },
    "does not serve files outside the images folder",
    async () => {
      const err = await failure(anon.system.uploadedImage("../../package.json"));
      expect([400, 403, 404]).toContain(err.status);
      expect(JSON.stringify(err.body ?? "")).not.toContain("dependencies");
    },
  );

  check({ endpoint: "uploads.static", category: "invalid input" }, "refuses dotfiles", async () => {
    const err = await failure(anon.system.uploadedImage(".env"));
    expect([403, 404]).toContain(err.status);
  });
});

describe("unknown routes", () => {
  check(
    { endpoint: null, category: "invalid input" },
    "an unknown route answers 404 JSON, not HTML",
    async () => {
      // the image function asks for a file (Blob); an unknown route is read as JSON
      const res = await fetch(`${env.realApi}/no-such-route-e2e`);
      expect(res.status).toBe(404);
      expect(res.headers.get("content-type")).toMatch(/application\/json/);
      expect(await res.json()).toEqual({ status: 404, message: "Not found." });
    },
  );
});
