// Subscriptions (test stack: they create ledger rows) and plan identifiers.
import { afterAll, beforeAll, describe, expect } from "vitest";
import { check, recordFile } from "./support/recorder";
import { client, failure, newUser, removeUser, type Session } from "./support/clients";
import { env } from "./support/env";

recordFile(import.meta.url);
let user: Session;
let paid: Session;
// billing allows 10 requests a minute per user: the extend cases use their own user
let extender: Session;
const DAY = 86_400_000;
let txn = 0;
const tx = () => `e2e-${env.runId}-${++txn}`;
const period = (days: number, startOffsetDays = 0) => {
  const from = new Date(Date.now() + startOffsetDays * DAY);
  return { from_date: from.toISOString(), to_date: new Date(from.getTime() + days * DAY).toISOString() };
};

beforeAll(async () => {
  user = await newUser(env.testApi, "billing");
  paid = await newUser(env.testApi, "billing-paid");
  extender = await newUser(env.testApi, "billing-extend");
});
afterAll(async () => {
  await removeUser(user);
  await removeUser(paid);
  await removeUser(extender);
});

describe("GET /identifiers", () => {
  check(
    { endpoint: "billing.identifiers", category: "success" },
    "lists the plans without a token",
    async () => {
      const res = await client(env.realApi).billing.identifiers();
      expect(res.status).toBe(200);
      expect(res.data.identifiers.length).toBeGreaterThan(0);
      for (const i of res.data.identifiers) {
        expect(i.identifier).toMatch(/^com\.myfoodapp\./);
        expect(Number(i.price)).toBeGreaterThan(0);
      }
    },
  );
});

describe("POST /subscription/add", () => {
  check({ endpoint: "billing.add", category: "success" }, "records a pending purchase (201)", async () => {
    const res = await user.api.billing.add({
      ...period(30),
      payment_status: "pending",
      transaction_id: tx(),
    });
    expect(res.status).toBe(201);
    expect(res.data.subscription).toMatchObject({ user_id: user.id, payment_status: "pending" });
  });

  check(
    { endpoint: "billing.add", category: "invalid input" },
    "409 for a reused transaction id",
    async () => {
      const id = tx();
      await user.api.billing.add({ ...period(30), payment_status: "pending", transaction_id: id });
      const err = await failure(
        user.api.billing.add({ ...period(30), payment_status: "pending", transaction_id: id }),
      );
      expect(err.status).toBe(409);
    },
  );

  check(
    { endpoint: "billing.add", category: "auth" },
    "a client cannot grant itself a paid subscription (payment_status from the app is not trusted)",
    async () => {
      const res = await paid.api.billing.add({
        ...period(30),
        payment_status: "completed",
        transaction_id: tx(),
      });
      const me = await paid.api.user.get(paid.id);
      expect(
        res.data.subscription.payment_status,
        "stored as completed: unlimited scans without any purchase verification",
      ).not.toBe("completed");
      expect(me.data.user.active_subscription).toBeNull();
    },
  );

  check(
    { endpoint: "billing.add", category: "invalid input" },
    "400 when to_date is before from_date, or the start is in the past",
    async () => {
      const back = { from_date: new Date().toISOString(), to_date: new Date(Date.now() - DAY).toISOString() };
      expect(
        (await failure(user.api.billing.add({ ...back, payment_status: "pending", transaction_id: tx() })))
          .status,
      ).toBe(400);
      expect(
        (
          await failure(
            user.api.billing.add({ ...period(30, -5), payment_status: "pending", transaction_id: tx() }),
          )
        ).status,
      ).toBe(400);
    },
  );

  check(
    { endpoint: "billing.add", category: "too long" },
    "400 for a period over 400 days and a 256-character transaction id",
    async () => {
      expect(
        (
          await failure(
            user.api.billing.add({ ...period(401), payment_status: "pending", transaction_id: tx() }),
          )
        ).status,
      ).toBe(400);
      expect(
        (
          await failure(
            user.api.billing.add({
              ...period(30),
              payment_status: "pending",
              transaction_id: "x".repeat(256),
            }),
          )
        ).status,
      ).toBe(400);
    },
  );

  check(
    { endpoint: "billing.add", category: "invalid input" },
    "400 for an unknown payment status and for missing fields",
    async () => {
      expect(
        (
          await failure(
            user.api.billing.add({ ...period(30), payment_status: "paid" as never, transaction_id: tx() }),
          )
        ).status,
      ).toBe(400);
      expect((await failure(user.api.billing.add({ payment_status: "pending" } as never))).status).toBe(400);
    },
  );

  check({ endpoint: "billing.add", category: "auth" }, "403 without a token", async () => {
    expect(
      (
        await failure(
          client(env.testApi).billing.add({ ...period(30), payment_status: "pending", transaction_id: tx() }),
        )
      ).status,
    ).toBe(403);
  });
});

describe("PUT /subscription/extend", () => {
  check(
    { endpoint: "billing.extend", category: "success" },
    "without an active period it records a new one (201)",
    async () => {
      const res = await extender.api.billing.extend({
        additional_days: 30,
        payment_status: "pending",
        transaction_id: tx(),
      });
      expect(res.status).toBe(201);
      expect(res.data.new_subscription).toBeDefined();
    },
  );

  check({ endpoint: "billing.extend", category: "invalid input" }, "400 for 0 or 401 days", async () => {
    expect(
      (
        await failure(
          extender.api.billing.extend({
            additional_days: 0,
            payment_status: "pending",
            transaction_id: tx(),
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await failure(
          extender.api.billing.extend({
            additional_days: 401,
            payment_status: "pending",
            transaction_id: tx(),
          }),
        )
      ).status,
    ).toBe(400);
  });

  check(
    { endpoint: "billing.extend", category: "wrong type" },
    "400 when additional_days is text",
    async () => {
      expect(
        (
          await failure(
            extender.api.billing.extend({
              additional_days: "thirty" as never,
              payment_status: "pending",
              transaction_id: tx(),
            }),
          )
        ).status,
      ).toBe(400);
    },
  );

  check({ endpoint: "billing.extend", category: "auth" }, "401 with a bad token", async () => {
    expect(
      (
        await failure(
          client(env.testApi, "bad").billing.extend({
            additional_days: 30,
            payment_status: "pending",
            transaction_id: tx(),
          }),
        )
      ).status,
    ).toBe(401);
  });
});
