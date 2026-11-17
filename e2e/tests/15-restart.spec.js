import { test, expect } from "@playwright/test";
import { readRunFile } from "./helpers.js";

// Only part of the "after-restart" phase (see playwright.config.js). The
// snapshots are taken from the database and the API's image folder by
// scripts/run-all-tests.sh right before and right after `docker compose restart`.
test("backend restart kept every row and image file", async () => {
  const before = readRunFile("snapshot-before-restart.json");
  const after = readRunFile("snapshot-after-restart.json");
  for (const service of ["api", "db", "cms"]) {
    expect(after.startedAt[service], `${service} container was restarted`).not.toBe(
      before.startedAt[service],
    );
    expect(after.health[service], `${service} healthy after the restart`).toBe("healthy");
  }
  expect(after.counts, "row counts after vs before").toEqual(before.counts);
  expect(after.uploadFileCount, "image files on disk after vs before").toBe(before.uploadFileCount);
});
