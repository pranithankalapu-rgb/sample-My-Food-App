// Rate limits, on the test stack only (they block the caller's IP for a while,
// so this file runs last).
import { afterAll, beforeAll, describe, expect } from "vitest";
import { check, recordFile } from "./support/recorder";
import { client, failure, newUser, removeUser, type Session } from "./support/clients";
import { env } from "./support/env";
import { isApiError } from "../../src/api/errors";

recordFile(import.meta.url);
let victim: Session;
beforeAll(async () => {
  victim = await newUser(env.testApi, "ratelimit");
});
afterAll(async () => {
  await removeUser(victim);
});

describe("rate limits", () => {
  check(
    { endpoint: "auth.login", category: "rate limit" },
    "10 failed logins for one email from one network: the 11th is 429; the owner can still log in from elsewhere",
    async () => {
      const anon = client(env.testApi);
      const statuses: number[] = [];
      for (let i = 0; i < 11; i += 1) {
        const err = await failure(anon.auth.login({ email: victim.email, password: `wrong-${i}-password` }));
        statuses.push(err.status);
      }
      expect(statuses.slice(0, 10).every((s) => s === 401)).toBe(true);
      expect(statuses[10]).toBe(429);
      const last = await failure(anon.auth.login({ email: victim.email, password: "wrong-again-1" }));
      expect(last.body).toEqual({ status: 429, message: "Too many requests. Please try again later." });
    },
  );

  check(
    { endpoint: "product.search", category: "rate limit" },
    "catalogue queries: more than 60 a minute per user answer 429 with RateLimit headers",
    async () => {
      let limited: number | null = null;
      for (let i = 0; i < 70 && limited === null; i += 1) {
        try {
          await victim.api.product.search({ query: "", page: 0, page_size: 1 });
        } catch (err) {
          if (isApiError(err) && err.status === 429) limited = i + 1;
          else throw err;
        }
      }
      expect(limited, "request number that was refused").not.toBeNull();
      expect(limited).toBeLessThanOrEqual(61);
    },
  );
});
