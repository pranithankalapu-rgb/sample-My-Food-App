// Auth endpoints. Flows that send email run on the test stack (mailpit), so
// codes can be read and no real email is sent.
import { afterAll, describe, expect } from "vitest";
import { check, recordFile } from "./support/recorder";
import { client, failure, login, newUser, removeUser, type Session } from "./support/clients";
import { env } from "./support/env";
import { codeFromInbox } from "./support/services";

recordFile(import.meta.url);
const real = client(env.realApi);
const test = client(env.testApi);
// validation failures (400, nothing stored) go to api-perf: same code and
// database, no rate limit, so they do not use up api-t's sign-up limit
const val = client(env.perfApi);
const created: Session[] = [];
afterAll(async () => {
  for (const s of created) await removeUser(s);
});

const pw = `E2e-${env.runId}-pw!`;
let n = 0;
const email = (label: string) => `e2e-${label}-${env.runId}-${++n}@example.test`;
const signupBody = (overrides: Record<string, unknown> = {}) => ({
  first_name: "Ada",
  last_name: "Tester",
  email: email("signup"),
  password: pw,
  repassword: pw,
  ...overrides,
});
const VALIDATION = { error: "Bad Request", message: "Please check the request inputs" };

describe("POST /user (sign up)", () => {
  check(
    { endpoint: "auth.signup", category: "success" },
    "creates a user: 201 with the public user, no password",
    async () => {
      const body = signupBody();
      const res = await test.auth.signup(body);
      expect(res.status).toBe(201);
      expect(res.data).toMatchObject({ status: 201, message: "User created successfully." });
      expect(res.data.user).toMatchObject({
        email: body.email,
        role: "user",
        email_verification_status: "PENDING",
      });
      expect(res.data.user).not.toHaveProperty("password");
      expect(res.data.user).not.toHaveProperty("token_version");
      created.push(await login(env.testApi, { email: body.email, password: pw }));
    },
  );

  check(
    { endpoint: "auth.signup", category: "auth" },
    "ignores a client-supplied role (never admin)",
    async () => {
      const body = signupBody({ role: "admin" });
      const res = await test.auth.signup(body);
      expect(res.data.user.role).toBe("user");
      created.push(await login(env.testApi, { email: body.email, password: pw }));
    },
  );

  for (const field of ["first_name", "last_name", "email", "password", "repassword"]) {
    check(
      { endpoint: "auth.signup", category: "missing input" },
      `400 when ${field} is missing`,
      async () => {
        const body = Object.fromEntries(Object.entries(signupBody()).filter(([key]) => key !== field));
        const err = await failure(val.auth.signup(body as never));
        expect(err.status).toBe(400);
        if (field !== "first_name" && field !== "last_name") {
          expect(err.body).toMatchObject(VALIDATION);
          expect(err.details).toContain(field);
        }
      },
    );
  }

  check(
    { endpoint: "auth.signup", category: "missing input" },
    "400 when names are empty strings",
    async () => {
      const err = await failure(val.auth.signup(signupBody({ first_name: "", last_name: "" })));
      expect(err.status).toBe(400);
    },
  );

  check({ endpoint: "auth.signup", category: "wrong type" }, "400 when email is a number", async () => {
    const err = await failure(val.auth.signup(signupBody({ email: 12345 })));
    expect(err.status).toBe(400);
    expect(err.details).toContain("email");
  });

  check({ endpoint: "auth.signup", category: "invalid input" }, "400 for an invalid email", async () => {
    const err = await failure(val.auth.signup(signupBody({ email: "not-an-email" })));
    expect(err.status).toBe(400);
  });

  check(
    { endpoint: "auth.signup", category: "too long" },
    "400 for a 101-character first name and a 129-character password",
    async () => {
      expect((await failure(val.auth.signup(signupBody({ first_name: "A".repeat(101) })))).status).toBe(400);
      const long = "x".repeat(129);
      expect((await failure(val.auth.signup(signupBody({ password: long, repassword: long })))).status).toBe(
        400,
      );
    },
  );

  check(
    { endpoint: "auth.signup", category: "invalid input" },
    "400 for a 7-character password",
    async () => {
      const err = await failure(val.auth.signup(signupBody({ password: "Short1!", repassword: "Short1!" })));
      expect(err.status).toBe(400);
    },
  );

  check({ endpoint: "auth.signup", category: "invalid input" }, "400 when the passwords differ", async () => {
    const err = await failure(val.auth.signup(signupBody({ repassword: `${pw}x` })));
    expect(err.status).toBe(400);
    expect(err.serverMessage).toMatch(/must match/i);
  });

  check(
    { endpoint: "auth.signup", category: "special characters" },
    "accepts names with apostrophes, accents and hyphens",
    async () => {
      const body = signupBody({ first_name: "Zoë-Anne", last_name: "O'Brien" });
      const res = await test.auth.signup(body);
      expect(res.status).toBe(201);
      expect(res.data.user.last_name).toBe("O'Brien");
      created.push(await login(env.testApi, { email: body.email, password: pw }));
    },
  );

  check(
    { endpoint: "auth.signup", category: "injection" },
    "rejects HTML/script in names (400, nothing stored)",
    async () => {
      const err = await failure(val.auth.signup(signupBody({ first_name: "<script>alert(1)</script>" })));
      expect(err.status).toBe(400);
    },
  );

  check(
    { endpoint: "auth.signup", category: "injection" },
    "rejects SQL-like input in the email (400, no 500)",
    async () => {
      const err = await failure(val.auth.signup(signupBody({ email: "x' OR '1'='1@example.test" })));
      expect(err.status).toBe(400);
    },
  );

  check(
    { endpoint: "auth.signup", category: "invalid input" },
    "400 for an already used email (any letter case)",
    async () => {
      const body = signupBody();
      await test.auth.signup(body);
      created.push(await login(env.testApi, { email: body.email, password: pw }));
      const err = await failure(val.auth.signup({ ...body, email: body.email.toUpperCase() }));
      expect(err.status).toBe(400);
      expect(err.serverMessage).toBe("Email already in use.");
    },
  );

  check(
    { endpoint: "auth.signup", category: "invalid input" },
    "400 with a fixed message for malformed JSON",
    async () => {
      const res = await fetch(`${env.testApi}/user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not json",
      });
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ status: 400, message: "The request body is not valid JSON." });
    },
  );
});

describe("POST /login", () => {
  check({ endpoint: "auth.login", category: "success" }, "returns a token and the public user", async () => {
    const s = await newUser(env.realApi, "login");
    created.push(s);
    const res = await real.auth.login({ email: s.email, password: s.password });
    expect(res.status).toBe(200);
    expect(res.data.token).toMatch(/^[\w-]+\.[\w-]+\.[\w-]+$/);
    expect(res.data.user).toMatchObject({ id: s.id, email: s.email });
    expect(res.data.user).not.toHaveProperty("password");
  });

  check({ endpoint: "auth.login", category: "auth" }, "401 for a wrong password", async () => {
    const s = await newUser(env.realApi, "login-wrong");
    created.push(s);
    const err = await failure(real.auth.login({ email: s.email, password: "wrong-password-1" }));
    expect(err.status).toBe(401);
    expect(err.serverMessage).toBe("Invalid email or password.");
  });

  check(
    { endpoint: "auth.login", category: "auth" },
    "404 for an unknown email (kept for old app builds)",
    async () => {
      const err = await failure(real.auth.login({ email: email("nobody"), password: "whatever-123" }));
      expect(err.status).toBe(404);
    },
  );

  check(
    { endpoint: "auth.login", category: "missing input" },
    "400 when the password is missing",
    async () => {
      const err = await failure(real.auth.login({ email: email("x") } as never));
      expect(err.status).toBe(400);
      expect(err.details).toContain("password");
    },
  );

  check(
    { endpoint: "auth.login", category: "injection" },
    "SQL-like email is just an unknown user (404, no 500)",
    async () => {
      const err = await failure(real.auth.login({ email: "' OR 1=1 --", password: "' OR 1=1 --" }));
      expect(err.status).toBe(404);
    },
  );

  check({ endpoint: "auth.login", category: "too long" }, "400 for a 255-character email", async () => {
    const err = await failure(real.auth.login({ email: `${"a".repeat(243)}@example.test`, password: "x" }));
    expect(err.status).toBe(400);
  });
});

describe("POST /user/social/signin", () => {
  check(
    { endpoint: "auth.social", category: "missing input" },
    "400 without token and provider",
    async () => {
      const err = await failure(test.auth.socialSignIn({} as never));
      expect(err.status).toBe(400);
    },
  );

  check(
    { endpoint: "auth.social", category: "auth" },
    "401 for an invalid Firebase token (not 500)",
    async () => {
      const err = await failure(
        test.auth.socialSignIn({ token: "not-a-firebase-token", provider: "google" }),
      );
      expect(err.status).toBe(401);
    },
  );

  check(
    { endpoint: "auth.social", category: "too long" },
    "400 for a token over 8192 characters",
    async () => {
      const err = await failure(test.auth.socialSignIn({ token: "x".repeat(8193), provider: "google" }));
      expect(err.status).toBe(400);
    },
  );
});

describe("email verification (test stack, mailpit)", () => {
  check(
    { endpoint: "auth.sendVerificationCode", category: "success" },
    "same 200 answer for an unknown address (no account enumeration)",
    async () => {
      const res = await test.auth.sendVerificationCode({ email: email("unknown") });
      expect(res.status).toBe(200);
      expect(res.data.message).toBe("Verification code sent successfully.");
    },
  );

  check(
    { endpoint: "auth.sendVerificationCode", category: "missing input" },
    "400 without an email",
    async () => {
      expect((await failure(test.auth.sendVerificationCode({} as never))).status).toBe(400);
    },
  );

  check(
    { endpoint: "auth.verify", category: "success" },
    "the emailed code verifies the account",
    async () => {
      const s = await newUser(env.testApi, "verify");
      created.push(s);
      const sentAt = new Date();
      await test.auth.sendVerificationCode({ email: s.email });
      const code = await codeFromInbox(s.email, sentAt);
      const res = await test.auth.verify({ email: s.email, code });
      expect(res.status).toBe(200);
      expect(res.data).toMatchObject({ status: "success" });
      const me = await s.api.user.get(s.id);
      expect(me.data.user.email_verification_status).toBe("VERIFIED");
    },
    60_000,
  );

  check({ endpoint: "auth.verify", category: "auth" }, "401 for a wrong code", async () => {
    const s = await newUser(env.testApi, "verify-wrong");
    created.push(s);
    const err = await failure(test.auth.verify({ email: s.email, code: "000000" }));
    expect(err.status).toBe(401);
  });

  check({ endpoint: "auth.verify", category: "too long" }, "400 for a 17-character code", async () => {
    expect((await failure(test.auth.verify({ email: email("x"), code: "1".repeat(17) }))).status).toBe(400);
  });
});

describe("password reset (test stack, mailpit)", () => {
  check(
    { endpoint: "auth.forgotPasswordCode", category: "success" },
    "same 200 answer for an unknown address",
    async () => {
      const res = await test.auth.forgotPasswordCode({ email: email("unknown") });
      expect(res.status).toBe(200);
    },
  );

  check(
    { endpoint: "auth.forgotPasswordCode", category: "missing input" },
    "400 without an email",
    async () => {
      expect((await failure(test.auth.forgotPasswordCode({} as never))).status).toBe(400);
    },
  );

  check(
    { endpoint: "auth.changePassword", category: "success" },
    "the emailed code changes the password and ends old sessions",
    async () => {
      const s = await newUser(env.testApi, "reset");
      created.push(s);
      const sentAt = new Date();
      await test.auth.forgotPasswordCode({ email: s.email });
      const code = await codeFromInbox(s.email, sentAt);
      const newPassword = `${pw}-new`;
      const res = await test.auth.changePassword({ email: s.email, code, new_password: newPassword });
      expect(res.status).toBe(200);
      // the old token is revoked, the old password no longer works, the new one does
      expect((await failure(s.api.user.get(s.id))).status).toBe(401);
      expect((await failure(test.auth.login({ email: s.email, password: s.password }))).status).toBe(401);
      const again = await login(env.testApi, { email: s.email, password: newPassword });
      created.push(again);
    },
    60_000,
  );

  check({ endpoint: "auth.changePassword", category: "auth" }, "404 for a wrong code", async () => {
    const err = await failure(
      test.auth.changePassword({ email: email("x"), code: "123456", new_password: "Another-pass-1" }),
    );
    expect(err.status).toBe(404);
  });

  check(
    { endpoint: "auth.changePassword", category: "invalid input" },
    "400 for a too-short new password",
    async () => {
      const err = await failure(
        test.auth.changePassword({ email: email("x"), code: "123456", new_password: "short" }),
      );
      expect(err.status).toBe(400);
    },
  );
});
