// Merges the raw results of one run (test-results/raw/*) into
// test-results/results.json, the file the Test Dashboard and the report read.
//   node scripts/merge-results.mjs --run-id X --label "..." --started ISO --finished ISO
//        --backend SHA --frontend SHA [--save-baseline]
import fs from "node:fs";
import path from "node:path";
import { redact } from "./redact.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).reduce((acc, a, i, all) => {
    if (a.startsWith("--"))
      acc.push([a.slice(2), all[i + 1] && !all[i + 1].startsWith("--") ? all[i + 1] : true]);
    return acc;
  }, []),
);
const RAW = "test-results/raw";
const read = (name, fallback = null) => {
  const file = path.join(RAW, name);
  return fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : fallback;
};
const inventory = JSON.parse(fs.readFileSync("src/data/api-inventory.json", "utf8"));

const cases = [];

// unit tests (Vitest json reporter)
const unit = read("vitest-unit.json");
for (const file of unit?.testResults ?? []) {
  for (const t of file.assertionResults ?? []) {
    cases.push({
      id: `unit:${path.basename(file.name)}:${t.fullName}`,
      suite: "unit",
      endpointId: null,
      category: path.basename(file.name).replace(/\.test\.ts$/, ""),
      title: t.fullName,
      status: t.status === "passed" ? "passed" : t.status === "failed" ? "failed" : "skipped",
      durationMs: Math.round(t.duration ?? 0),
      ...(t.failureMessages?.length ? { error: t.failureMessages.join("\n").slice(0, 3000) } : {}),
    });
  }
}

// API tests (written by tests/api/support/recorder.ts)
for (const name of fs.existsSync(RAW)
  ? fs
      .readdirSync(RAW)
      .filter((f) => /^api-.*\.json$/.test(f))
      .sort()
  : []) {
  cases.push(...read(name, []));
}
// API cases that never reached the recorder (e.g. a failing beforeAll) still count
const vitestApi = read("vitest-api.json");
const recorded = new Set(cases.filter((c) => c.suite !== "unit").map((c) => c.title));
for (const file of vitestApi?.testResults ?? []) {
  for (const t of file.assertionResults ?? []) {
    if (t.status === "passed" || recorded.has(t.title)) continue;
    cases.push({
      id: `api:${path.basename(file.name)}:${t.fullName}`,
      suite: "api",
      endpointId: null,
      category: "setup",
      title: `${path.basename(file.name)}: ${t.fullName}`,
      status: t.status === "failed" ? "failed" : "skipped",
      durationMs: Math.round(t.duration ?? 0),
      error: (t.failureMessages ?? []).join("\n").slice(0, 3000) || file.message || "did not run",
    });
  }
  // a failing beforeAll leaves every test of the file "skipped": that is a failure, with its reason
  if (file.status === "failed" && (file.message || !(file.assertionResults ?? []).length)) {
    cases.push({
      id: `api:${path.basename(file.name)}:file`,
      suite: "api",
      endpointId: null,
      category: "setup",
      title: `${path.basename(file.name)} could not run`,
      status: "failed",
      durationMs: 0,
      error: String(file.message ?? "").slice(0, 3000),
    });
  }
}

// Playwright (json reporter), both phases
for (const phase of ["before-restart", "after-restart"]) {
  const report = read(`ui-${phase}.json`);
  const walk = (suite, file) => {
    for (const s of suite.suites ?? []) walk(s, s.file ?? file);
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) {
        const last = (t.results ?? []).at(-1) ?? {};
        const status = t.status === "expected" ? "passed" : t.status === "skipped" ? "skipped" : "failed";
        cases.push({
          id: `ui:${phase}:${file}:${spec.title}`,
          suite: "ui",
          endpointId: null,
          page: String(file ?? "")
            .replace(/^\d+-/, "")
            .replace(/\.spec\.js$/, ""),
          category: phase,
          title: `[${phase}] ${String(file ?? "").replace(/\.spec\.js$/, "")}: ${spec.title}`,
          status,
          durationMs: Math.round(last.duration ?? 0),
          ...(status === "failed"
            ? {
                error: (last.errors ?? [])
                  .map((e) => e.message ?? "")
                  .join("\n")
                  .replace(/\u001b\[\d+m/g, "")
                  .slice(0, 3000),
              }
            : {}),
        });
      }
    }
  };
  for (const s of report?.suites ?? []) walk(s, s.file);
}

// Lighthouse: accessibility and best practices must be >= 90 on every page
const lighthouse = read("lighthouse.json", []);
for (const l of lighthouse) {
  const ok = l.accessibility >= 90 && l.bestPractices >= 90;
  cases.push({
    id: `ui:lighthouse:${l.preset}:${l.page}`,
    suite: "ui",
    endpointId: null,
    page: l.page,
    category: "lighthouse",
    title: `Lighthouse ${l.preset} ${l.page}: accessibility ${l.accessibility}, best practices ${l.bestPractices} (performance ${l.performance})`,
    status: ok ? "passed" : "failed",
    durationMs: 0,
    ...(ok
      ? {}
      : {
          error: `Accessibility/best practices under 90. Failing audits: ${[...l.issues.accessibility, ...l.issues.bestPractices].join(", ")}`,
        }),
  });
}

const perf = read("perf.json", []);
const accuracy = read("accuracy.json", []);
const ingredients = read("ingredients.json", []);
const tested = new Set(cases.filter((c) => c.endpointId).map((c) => c.endpointId));
const endpoints = inventory.endpoints.map((e) => e.id);

const summary = {
  total: cases.length,
  passed: cases.filter((c) => c.status === "passed").length,
  failed: cases.filter((c) => c.status === "failed").length,
  skipped: cases.filter((c) => c.status === "skipped").length,
  durationMs: Date.parse(args.finished) - Date.parse(args.started),
};
const notes = [];
if (!unit) notes.push("Unit test results are missing.");
if (!vitestApi) notes.push("API test results are missing.");
if (!read("ui-before-restart.json")) notes.push("Page test results (before restart) are missing.");
if (!read("ui-after-restart.json")) notes.push("Page test results (after restart) are missing.");

const results = {
  runId: String(args["run-id"]),
  label: String(args.label ?? "Test run"),
  startedAt: String(args.started),
  finishedAt: String(args.finished),
  backendCommit: String(args.backend ?? "unknown"),
  frontendCommit: String(args.frontend ?? "unknown"),
  summary,
  coverage: {
    endpoints: endpoints.length,
    integrated: endpoints.length,
    tested: endpoints.filter((e) => tested.has(e)).length,
    untested: endpoints.filter((e) => !tested.has(e)),
  },
  cases: redact(cases),
  perf,
  accuracy,
  ingredients,
  lighthouse: lighthouse.map(({ page, preset, performance, accessibility, bestPractices, seo }) => ({
    page,
    preset,
    performance,
    accessibility,
    bestPractices,
    seo,
  })),
  notes,
};

fs.writeFileSync("test-results/results.json", JSON.stringify(results, null, 2));
fs.mkdirSync("test-results/history", { recursive: true });
fs.writeFileSync(`test-results/history/results-${results.runId}.json`, JSON.stringify(results));
if (args["save-baseline"] || !fs.existsSync("test-results/baseline.json")) {
  fs.writeFileSync("test-results/baseline.json", JSON.stringify(results, null, 2));
  console.log("saved as baseline (before/after comparisons use it)");
}
console.log(
  `results: ${summary.passed} passed, ${summary.failed} failed, ${summary.skipped} skipped of ${summary.total}; endpoints tested ${results.coverage.tested}/${results.coverage.endpoints}`,
);
