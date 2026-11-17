// User endpoints on the real API, with dedicated users that are deleted afterwards.
import { afterAll, beforeAll, describe, expect } from "vitest";
import { check, recordFile } from "./support/recorder";
import { client, failure, newUser, realAdmin, removeUser, type Session } from "./support/clients";
import { env } from "./support/env";

recordFile(import.meta.url);
let me: Session;
let other: Session;
let admin: Session;
const KNOWN = "8715700407760";

beforeAll(async () => {
  me = await newUser(env.realApi, "user");
  other = await newUser(env.realApi, "user-other");
  admin = await realAdmin();
});
afterAll(async () => {
  await removeUser(me);
  await removeUser(other);
});

// a structurally valid JWT that the server did not sign (or signed with another secret)
const forgedToken = (claims: Record<string, unknown>) => {
  const b64 = (o: unknown) => Buffer.from(JSON.stringify(o)).toString("base64url");
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64(claims)}.${Buffer.from("not-the-signature").toString("base64url")}`;
};

describe("GET /user/{id}", () => {
  check(
    { endpoint: "user.get", category: "success" },
    "returns the caller's profile with quota and subscriptions",
    async () => {
      const res = await me.api.user.get(me.id);
      expect(res.status).toBe(200);
      expect(res.data.user).toMatchObject({ id: me.id, email: me.email, role: "user" });
      expect(typeof res.data.user.total_scan_limit).toBe("number");
      expect(Array.isArray(res.data.user.subscription_details)).toBe(true);
      expect(res.data.user).toHaveProperty("active_subscription");
      expect(res.data.user).not.toHaveProperty("password");
    },
  );

  check({ endpoint: "user.get", category: "auth" }, "403 for another user's profile", async () => {
    const err = await failure(me.api.user.get(other.id));
    expect(err.status).toBe(403);
    expect(err.serverMessage).toBe("Access forbidden.");
  });

  check(
    { endpoint: "user.get", category: "auth" },
    "an admin can read another profile, without its health data",
    async () => {
      await other.api.user.update(other.id, { user_info: { allergies: ["peanuts"] } });
      const res = await admin.api.user.get(other.id);
      expect(res.data.user.email).toBe(other.email);
      expect(res.data.user).not.toHaveProperty("user_info");
    },
  );

  check({ endpoint: "user.get", category: "auth" }, "403 without a token", async () => {
    const err = await failure(client(env.realApi).user.get(me.id));
    expect(err.status).toBe(403);
    expect(err.serverMessage).toBe("A token is required for authentication");
  });

  check(
    { endpoint: "user.get", category: "auth" },
    "401 for a forged token and for a forged expired token",
    async () => {
      const now = Math.floor(Date.now() / 1000);
      for (const token of [
        forgedToken({ id: me.id, tv: 0, iat: now }),
        forgedToken({ id: me.id, iat: now - 7200, exp: now - 3600 }),
        "garbage",
      ]) {
        const err = await failure(client(env.realApi, token).user.get(me.id));
        expect(err.status).toBe(401);
        expect(err.serverMessage).toBe("Invalid Token");
      }
    },
  );

  check({ endpoint: "user.get", category: "invalid input" }, "400 for an id that is not a UUID", async () => {
    const err = await failure(me.api.user.get("not-a-uuid"));
    expect([400, 403]).toContain(err.status);
  });
});

describe("PUT /user/{id}", () => {
  check({ endpoint: "user.update", category: "success" }, "merges the health profile", async () => {
    const res = await me.api.user.update(me.id, {
      user_info: { health_conditions: ["diabetes"], allergies: ["milk"] },
    });
    expect(res.status).toBe(200);
    await me.api.user.update(me.id, { user_info: { allergens: ["en:milk"] } });
    const after = await me.api.user.get(me.id);
    expect(after.data.user.user_info).toMatchObject({
      health_conditions: ["diabetes"],
      allergies: ["milk"],
      allergens: ["en:milk"],
    });
  });

  check({ endpoint: "user.update", category: "missing input" }, "400 without user_info", async () => {
    const err = await failure(me.api.user.update(me.id, {} as never));
    expect(err.status).toBe(400);
  });

  check(
    { endpoint: "user.update", category: "wrong type" },
    "400 when user_info is a string or allergies is not a list",
    async () => {
      expect((await failure(me.api.user.update(me.id, { user_info: "diabetes" } as never))).status).toBe(400);
      expect(
        (await failure(me.api.user.update(me.id, { user_info: { allergies: "milk" } } as never))).status,
      ).toBe(400);
    },
  );

  check({ endpoint: "user.update", category: "too long" }, "400 for a profile over 16 KB", async () => {
    const err = await failure(me.api.user.update(me.id, { user_info: { notes: "x".repeat(17 * 1024) } }));
    expect(err.status).toBe(400);
  });

  check(
    { endpoint: "user.update", category: "special characters" },
    "stores unicode and quotes unchanged",
    async () => {
      await me.api.user.update(me.id, { user_info: { notes: 'Zoë\'s "no-nuts" diet; DROP TABLE users;--' } });
      const after = await me.api.user.get(me.id);
      expect(after.data.user.user_info?.notes).toBe('Zoë\'s "no-nuts" diet; DROP TABLE users;--');
    },
  );

  check({ endpoint: "user.update", category: "auth" }, "403 when updating another user", async () => {
    const err = await failure(me.api.user.update(other.id, { user_info: { allergies: [] } }));
    expect(err.status).toBe(403);
  });
});

describe("PUT /user/{id}/increment-scan", () => {
  check(
    { endpoint: "user.incrementScan", category: "success" },
    "reports the quota without counting a scan",
    async () => {
      const a = await me.api.user.incrementScan(me.id);
      const b = await me.api.user.incrementScan(me.id);
      expect(a.status).toBe(200);
      expect(a.data.info).toMatchObject({
        total_scans: expect.any(Number) as number,
        scanned_count: expect.any(Number) as number,
      });
      expect(b.data.info.scanned_count).toBe(a.data.info.scanned_count);
    },
  );

  check({ endpoint: "user.incrementScan", category: "auth" }, "403 for another user", async () => {
    expect((await failure(me.api.user.incrementScan(other.id))).status).toBe(403);
  });
});

describe("GET /product/history/user/{id}", () => {
  check(
    { endpoint: "user.history", category: "success" },
    "lists a looked-up product once, newest first; the scan is counted once",
    async () => {
      const before = (await me.api.user.get(me.id)).data.user.user_scan_count ?? 0;
      await me.api.product.lookup(KNOWN);
      await me.api.product.lookup(KNOWN); // a re-open within 10 minutes is free
      const res = await me.api.user.history(me.id);
      expect(res.status).toBe(200);
      const entries = res.data.productHistory.filter((h) => h.product_code === KNOWN);
      expect(entries).toHaveLength(1);
      expect(entries[0]?.product_name).toBeTruthy();
      const after = (await me.api.user.get(me.id)).data.user.user_scan_count ?? 0;
      expect(after - before).toBe(1);
    },
  );

  check({ endpoint: "user.history", category: "success" }, "admins are never recorded", async () => {
    await admin.api.product.lookup(KNOWN);
    const res = await admin.api.user.history(admin.id);
    expect(
      res.data.productHistory.some(
        (h) => h.product_code === KNOWN && Date.now() - Date.parse(h.updated_at) < 60_000,
      ),
    ).toBe(false);
  });

  check({ endpoint: "user.history", category: "auth" }, "403 for another user's history", async () => {
    expect((await failure(me.api.user.history(other.id))).status).toBe(403);
  });
});

describe("DELETE /user/{id}", () => {
  check({ endpoint: "user.delete", category: "auth" }, "403 when deleting another user", async () => {
    expect((await failure(me.api.user.remove(other.id))).status).toBe(403);
  });

  check(
    { endpoint: "user.delete", category: "success" },
    "erases the account: token revoked, login fails, history gone",
    async () => {
      const s = await newUser(env.realApi, "delete");
      await s.api.product.lookup(KNOWN);
      const res = await s.api.user.remove(s.id);
      expect(res.status).toBe(200);
      expect((await failure(s.api.user.get(s.id))).status).toBe(401);
      expect(
        (await failure(client(env.realApi).auth.login({ email: s.email, password: s.password }))).status,
      ).toBe(404);
      // the email is free again
      const again = await client(env.realApi).auth.signup({
        first_name: "Again",
        last_name: "Tester",
        email: s.email,
        password: s.password,
        repassword: s.password,
      });
      expect(again.status).toBe(201);
      const s2 = await client(env.realApi).auth.login({ email: s.email, password: s.password });
      await client(env.realApi, s2.data.token).user.remove(s2.data.user.id);
    },
  );

  check(
    { endpoint: "user.delete", category: "invalid input" },
    "404 for an unknown user (admin)",
    async () => {
      const err = await failure(admin.api.user.remove("8a1c2a5e-1111-4bbb-8ccc-000000000000"));
      expect(err.status).toBe(404);
    },
  );
});
