import { defineConfig } from "@playwright/test";

// PHASE is "before-restart" or "after-restart" when run by scripts/run-e2e.sh;
// each phase gets its own report folder.
const PHASE = process.env.PHASE || "adhoc";
const OUT = `e2e-report/${PHASE}`;

export default defineConfig({
  testDir: "./tests",
  outputDir: `${OUT}/test-results`,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  // the tests share one backend and one test user's scan quota: run in order
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: `${OUT}/html`, open: "never" }],
    ["json", { outputFile: `${OUT}/results.json` }],
  ],
  use: {
    baseURL: process.env.WEB_URL || "http://localhost:4200",
    viewport: { width: 1280, height: 900 },
    screenshot: "on",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.js/ },
    {
      name: "e2e",
      // the restart check compares snapshots taken around the restart
      testIgnore: PHASE === "after-restart" ? [/auth\.setup\.js/] : [/auth\.setup\.js/, /09-restart\.spec\.js/],
      dependencies: ["setup"],
      use: { storageState: ".auth/user.json" },
    },
  ],
});
