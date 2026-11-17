import { defineConfig } from "@playwright/test";

// PHASE is "before-restart" or "after-restart" when run by scripts/run-all-tests.sh;
// each phase gets its own report folder and raw results file.
const PHASE = process.env.PHASE || "adhoc";
const OUT = `e2e-report/${PHASE}`;

export default defineConfig({
  testDir: "./tests",
  outputDir: `${OUT}/test-results`,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  // the tests share test users, scan quotas and the fault proxies: run in order
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [
    ["list"],
    ["html", { outputFolder: `${OUT}/html`, open: "never" }],
    ["json", { outputFile: `test-results/raw/ui-${PHASE}.json` }],
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
      // the restart check compares snapshots taken around the backend restart
      testIgnore:
        PHASE === "after-restart"
          ? // 16-ai-paths makes real OpenAI calls: once per run (cost cap)
            [/auth\.setup\.js/, /16-ai-paths\.spec\.js/]
          : [/auth\.setup\.js/, /15-restart\.spec\.js/],
      dependencies: ["setup"],
      use: { storageState: ".auth/user.json" },
    },
  ],
});
