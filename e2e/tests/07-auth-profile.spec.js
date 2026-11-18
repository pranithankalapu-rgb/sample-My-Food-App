import { test, expect } from "@playwright/test";
import {
  API_URL,
  API_T_URL,
  PHASE,
  WEB_T_URL,
  fixtures,
  mailCode,
  shot,
  signInAs,
  watchConsole,
} from "./helpers.js";

test.use({ storageState: { cookies: [], origins: [] } });

/** Deletes an account through the API if it still exists (the test may stop half-way). */
async function deleteIfPresent(request, apiUrl, email, password) {
  const res = await request.post(`${apiUrl}/login`, { data: { email, password } });
  if (res.status() !== 200) return;
  const { token, user } = await res.json();
  await request.delete(`${apiUrl}/user/${user.id}`, { headers: { "x-access-token": token } });
}

test.describe("auth and profile (real stack, dedicated user)", () => {
  // one address per run and phase, so the second phase never collides with the first
  const email = `e2e-ui-${fixtures().runId}-${PHASE}@example.test`;
  const password = `E2e-${fixtures().runId}-pw!`;
  test.afterAll(async ({ request }) => {
    await deleteIfPresent(request, API_URL, email, password);
  });

  test("sign up, profile, health profile, quota, history, log out, protected pages, delete account", async ({
    page,
    request,
  }) => {
    const problems = watchConsole(page, { allowStatus: [401, 403] });

    await page.goto("/#/login");
    await page.getByRole("button", { name: "Sign up", exact: true }).click();
    const form = page.getByRole("form", { name: "Sign up" });
    await form.getByLabel("First name").fill("Eetwoe");
    await form.getByLabel("Last name").fill("Tester");
    await form.getByLabel("Email").fill(email);
    await form.getByLabel("Password (at least 8 characters)").fill(password);
    await form.getByLabel("Repeat password").fill(password);
    await shot(page, "14-signup");
    await form.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByTestId("current-user")).toHaveText(email);
    await expect(page.getByTestId("toast").first()).toContainText("Signed in");

    // a lookup, so the history has something
    await page.goto("/#/product/8715700407760");
    await expect(page.getByTestId("product-detail")).toBeVisible();

    await page.goto("/#/profile");
    await expect(page.getByTestId("profile-email")).toHaveText(email);
    await expect(page.getByTestId("profile-scans")).toContainText("1 of");
    const health = page.getByRole("form", { name: "Health profile" });
    await health.getByLabel("Allergies").fill("peanuts, milk");
    await health.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByTestId("toast").filter({ hasText: "Health profile saved" })).toBeVisible();
    await page.getByRole("button", { name: "Check my quota" }).click();
    await expect(page.getByTestId("quota-info")).toContainText("scans left");
    await expect(page.getByTestId("history-table")).toContainText("8715700407760");
    await expect(page.getByTestId("plans")).toContainText("com.myfoodapp");
    await shot(page, "15-profile");

    // log out: protected pages send you to the login form
    await page.getByRole("button", { name: "Log out" }).first().click();
    await expect(page.getByRole("form", { name: "Log in" })).toBeVisible();
    await page.goto("/#/search");
    await expect(page.getByRole("form", { name: "Log in" })).toBeVisible();
    await page.goto("/#/admin");
    await expect(page.getByRole("form", { name: "Log in" })).toBeVisible();

    // wrong password: a friendly message
    const loginForm = page.getByRole("form", { name: "Log in" });
    await loginForm.getByLabel("Email").fill(email);
    await loginForm.getByLabel("Password").fill("wrong-password-1");
    await loginForm.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByTestId("login-error")).toContainText("Invalid email or password.");

    // log in again and delete the account through the UI
    await loginForm.getByLabel("Password").fill(password);
    await loginForm.getByRole("button", { name: "Log in" }).click();
    await expect(page.getByTestId("current-user")).toHaveText(email);
    await page.goto("/#/profile");
    const del = page.getByRole("form", { name: "Delete account" });
    await expect(del.getByRole("button", { name: "Delete my account" })).toBeDisabled();
    await del.getByRole("textbox").fill(email);
    await del.getByRole("button", { name: "Delete my account" }).click();
    await expect(page.getByRole("form", { name: "Log in" })).toBeVisible();
    const after = await request.post(`${API_URL}/login`, { data: { email, password } });
    expect(after.status()).toBe(404);
    expect(problems).toEqual([]);
  });

  test("a non-admin sees 'Admins only' on the admin page", async ({ page, request }) => {
    await signInAs(page, request, API_URL, fixtures().user);
    await page.goto("/#/admin");
    await expect(page.getByTestId("admin-only")).toContainText("Admins only");
  });
});

test.describe("email flows and subscriptions (test stack, mailpit)", () => {
  test("verify email and reset the password with emailed codes", async ({ page, request }) => {
    const { runId } = fixtures();
    const email = `e2e-ui-${runId}-${PHASE}-mail@example.test`;
    const password = `E2e-${runId}-pw!`;
    // through web-t's proxy, like a browser: the API tests' own sign-ups come
    // from another network and use their own share of the sign-up limit
    const signup = await request.post(`${WEB_T_URL}/api/user`, {
      data: { first_name: "Mail", last_name: "Tester", email, password, repassword: password },
    });
    expect(signup.status()).toBe(201);

    await page.goto(`${WEB_T_URL}/#/login`);
    await page.getByRole("button", { name: "Verify email", exact: true }).click();
    const flow = page.getByTestId("verify-flow");
    await flow.getByLabel("Email", { exact: true }).fill(email);
    const sentAt = new Date();
    await flow.getByRole("button", { name: "Email me a verification code" }).click();
    await expect(page.getByTestId("verify-flow-sent")).toBeVisible();
    await flow
      .getByLabel("6-digit code")
      .fill(await mailCode(request, email, sentAt, "account verification"));
    await flow.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByTestId("verify-flow-done")).toBeVisible();

    await page.getByRole("button", { name: "Reset password", exact: true }).click();
    const reset = page.getByTestId("reset-flow");
    await reset.getByLabel("Email", { exact: true }).fill(email);
    const resetAt = new Date();
    await reset.getByRole("button", { name: "Email me a reset code" }).click();
    await reset.getByLabel("6-digit code").fill(await mailCode(request, email, resetAt, "change password"));
    await reset.getByLabel("New password (at least 8 characters)").fill(`${password}-2`);
    await reset.getByRole("button", { name: "Confirm" }).click();
    await expect(page.getByTestId("reset-flow-done")).toBeVisible();
    await shot(page, "16-reset-password");
    const login = await request.post(`${API_T_URL}/login`, { data: { email, password: `${password}-2` } });
    expect(login.status()).toBe(200);
    const { token, user } = await login.json();
    await request.delete(`${API_T_URL}/user/${user.id}`, { headers: { "x-access-token": token } });
  });

  test("record and extend a (pending) subscription from the profile page", async ({ page, request }) => {
    await signInAs(page, request, API_T_URL, fixtures().testUser);
    await page.goto(`${WEB_T_URL}/#/profile`);
    const form = page.getByRole("form", { name: "Subscription" });
    await form.getByRole("button", { name: "Add subscription" }).click();
    await expect(
      page.getByTestId("toast").filter({ hasText: "Subscription added successfully" }),
    ).toBeVisible();
    await expect(page.getByTestId("subscriptions-table")).toContainText("pending");
    await form.getByRole("button", { name: "Extend" }).click();
    await expect(
      page
        .getByTestId("toast")
        .filter({ hasText: /subscription/i })
        .last(),
    ).toBeVisible();
  });
});
