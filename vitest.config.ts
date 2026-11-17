import { defineConfig } from "vitest/config";

// unit: pure functions and the API client against a local HTTP server.
// api:  every backend endpoint, against the running stack (Docker only; see
//       scripts/run-all-tests.sh). Runs files one at a time: they share test
//       users, quotas and rate limits.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        test: {
          name: "api",
          include: ["tests/api/**/*.test.ts"],
          environment: "node",
          testTimeout: 120_000,
          hookTimeout: 180_000,
          fileParallelism: false,
          globalSetup: ["tests/api/support/globalSetup.ts"],
        },
      },
    ],
  },
});
