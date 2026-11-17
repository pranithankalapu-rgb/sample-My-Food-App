import { test, expect } from "@playwright/test";
import { API_URL, fixtures, shot, apiLogin } from "./helpers.js";

// A fresh browser (no stored session) for the whole auth flow.
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("auth", () => {
  test("sign up, log in, blocked when logged out, then delete the test user", async ({ page, request }) => {
    const { runId, products } = fixtures();
    const email = `e2e-signup-${runId}@example.test`;
    const password = `E2e-${runId}-pw!`;
    const code = products[0].code;
    let userId;
    let token;

    try {
      // sign up through the UI (the app logs in right after creating the account)
      await page.goto("/");
      await page.getByRole("tab", { name: "Sign up" }).click();
      await page.getByLabel("First name").fill("Eetwoe");
      await page.getByLabel("Last name").fill("Tester");
      await page.getByLabel("Email").fill(email);
      await page.getByLabel("Password", { exact: true }).fill(password);
      await page.getByLabel("Repeat password").fill(password);
      await shot(page, "08-signup");
      const signup = page.waitForResponse((r) => r.url().endsWith("/api/user") && r.request().method() === "POST");
      await page.getByRole("button", { name: "Create account" }).click();
      const signupRes = await signup;
      expect(signupRes.status(), await signupRes.text()).toBe(201);
      await expect(page.getByTestId("current-user")).toHaveText(email);

      // the same account can log in again (API) and use a protected route
      const login = await apiLogin(request, email, password);
      expect(login.status, JSON.stringify(login.body)).toBe(200);
      token = login.body.token;
      userId = login.body.user.id;
      expect(token).toBeTruthy();
      const ok = await request.get(`${API_URL}/product/${code}`, { headers: { "x-access-token": token } });
      expect(ok.status()).toBe(200);

      // log out in the UI: protected screens fall back to the login form
      await page.getByRole("button", { name: "Log out" }).click();
      await expect(page.getByRole("form", { name: "Log in" })).toBeVisible();
      await page.goto("/#/search");
      await expect(page.getByRole("form", { name: "Log in" })).toBeVisible();
      await expect(page.getByTestId("search-results")).toHaveCount(0);

      // protected endpoints refuse requests without a valid token
      const noToken = await request.get(`${API_URL}/product/${code}`);
      expect(noToken.status()).toBe(403);
      expect((await noToken.json()).message).toMatch(/token is required/i);
      const badToken = await request.get(`${API_URL}/product/${code}`, { headers: { "x-access-token": "not-a-real-token" } });
      expect(badToken.status()).toBe(401);
      for (const [method, path] of [["post", "/product/search"], ["get", `/user/${userId}`], ["get", `/product/history/user/${userId}`]]) {
        const r = await request[method](`${API_URL}${path}`, method === "post" ? { data: {} } : undefined);
        expect(r.status(), `${method.toUpperCase()} ${path} without a token`).toBe(403);
      }

      // wrong password is refused
      const wrong = await apiLogin(request, email, "definitely-wrong-password");
      expect(wrong.status).toBe(401);
    } finally {
      // delete the test user (through the API, as the user)
      if (token && userId) {
        const del = await request.delete(`${API_URL}/user/${userId}`, { headers: { "x-access-token": token } });
        expect(del.status(), await del.text()).toBe(200);
      }
    }

    // the deleted account and its token no longer work
    const after = await apiLogin(request, email, password);
    expect(after.status).toBe(404);
    const revoked = await request.get(`${API_URL}/product/${code}`, { headers: { "x-access-token": token } });
    expect(revoked.status()).toBe(401);
  });
});
