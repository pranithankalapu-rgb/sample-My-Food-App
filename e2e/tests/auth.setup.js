import fs from "node:fs";
import { test as setup, expect } from "@playwright/test";
import { fixtures, shot } from "./helpers.js";

// Logs the dedicated e2e user in through the UI once; the other tests reuse
// the session (storageState).
setup("log in the e2e user through the UI", async ({ page }) => {
  const { user } = fixtures();
  await page.goto("/");
  await expect(page.getByRole("form", { name: "Log in" })).toBeVisible();
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(user.password);
  await shot(page, "00-login");
  await page.getByRole("button", { name: "Log in" }).last().click();
  await expect(page.getByTestId("current-user")).toHaveText(user.email);
  await expect(page.getByRole("heading", { name: "Barcode lookup" })).toBeVisible();
  fs.mkdirSync(".auth", { recursive: true });
  await page.context().storageState({ path: ".auth/user.json" });
});
