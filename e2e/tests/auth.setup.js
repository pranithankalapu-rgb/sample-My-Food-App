import fs from "node:fs";
import { test as setup, expect } from "@playwright/test";
import { fixtures, shot } from "./helpers.js";

// Logs the run's real-stack user in through the UI once; the other tests reuse
// the session (storageState).
setup("log in through the UI", async ({ page }) => {
  const { user } = fixtures();
  await page.goto("/#/login");
  const form = page.getByRole("form", { name: "Log in" });
  await expect(form).toBeVisible();
  await form.getByLabel("Email").fill(user.email);
  await form.getByLabel("Password").fill(user.password);
  await shot(page, "00-login");
  await form.getByRole("button", { name: "Log in" }).click();
  await expect(page.getByTestId("current-user")).toHaveText(user.email);
  await expect(page.getByRole("heading", { name: "Barcode lookup" })).toBeVisible();
  fs.mkdirSync(".auth", { recursive: true });
  await page.context().storageState({ path: ".auth/user.json" });
});
