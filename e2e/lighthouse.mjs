// Lighthouse scores for every page, signed in (session in localStorage of a
// persistent Chromium profile that Lighthouse connects to). Writes
// test-results/raw/lighthouse.json; exits 1 if accessibility or best
// practices is under 90 anywhere.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "@playwright/test";
import lighthouse from "lighthouse";

const WEB = process.env.WEB_URL || "http://localhost:4200";
const API = process.env.API_URL || "http://localhost:9595";
const PHASE_DIR = path.join(".e2e-run", "before-restart", "fixtures.json");
const { admin } = JSON.parse(fs.readFileSync(PHASE_DIR, "utf8"));

const login = await (
  await fetch(`${API}/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(admin),
  })
).json();
const session = JSON.stringify({ token: login.token, user: login.user, via: "user" });

const PAGES = [
  ["login", "#/login", false],
  ["status", "#/status", true],
  ["lookup", "#/lookup", true],
  ["product", "#/product/8715700407760", true],
  ["search", "#/search", true],
  ["scan", "#/scan", true],
  ["profile", "#/profile", true],
  ["admin", "#/admin", true],
  ["explorer", "#/explorer", true],
  ["tests", "#/tests", true],
];

const userData = fs.mkdtempSync("/tmp/lh-");
const ctx = await chromium.launchPersistentContext(userData, {
  args: ["--remote-debugging-port=9222"],
  headless: true,
});
const p0 = ctx.pages()[0] || (await ctx.newPage());
await p0.goto(WEB);

const rows = [];
for (const preset of ["desktop", "mobile"]) {
  for (const [name, hash, auth] of PAGES) {
    await p0.evaluate(
      ([s, signedIn]) => {
        if (signedIn) localStorage.setItem("mfa-sample-session", s);
        else localStorage.removeItem("mfa-sample-session");
      },
      [session, auth],
    );
    const config =
      preset === "desktop"
        ? {
            extends: "lighthouse:default",
            settings: {
              formFactor: "desktop",
              screenEmulation: {
                mobile: false,
                width: 1350,
                height: 940,
                deviceScaleFactor: 1,
                disabled: false,
              },
              throttlingMethod: "simulate",
            },
          }
        : undefined;
    const result = await lighthouse(
      `${WEB}/${hash}`,
      {
        port: 9222,
        output: "json",
        logLevel: "error",
        disableStorageReset: true,
        onlyCategories: ["performance", "accessibility", "best-practices", "seo"],
      },
      config,
    );
    const c = result.lhr.categories;
    const failing = (cat) =>
      cat.auditRefs
        .map((r) => result.lhr.audits[r.id])
        .filter(
          (a) =>
            a &&
            a.score !== null &&
            a.score < 0.9 &&
            !["informative", "notApplicable", "manual"].includes(a.scoreDisplayMode),
        )
        .map((a) => `${a.id}${a.displayValue ? ` (${a.displayValue})` : ""}`)
        .slice(0, 6);
    const row = {
      page: name,
      preset,
      performance: Math.round(c.performance.score * 100),
      accessibility: Math.round(c.accessibility.score * 100),
      bestPractices: Math.round(c["best-practices"].score * 100),
      seo: Math.round(c.seo.score * 100),
      lcp: result.lhr.audits["largest-contentful-paint"].displayValue,
      cls: result.lhr.audits["cumulative-layout-shift"].displayValue,
      issues: {
        performance: failing(c.performance),
        accessibility: failing(c.accessibility),
        bestPractices: failing(c["best-practices"]),
      },
    };
    rows.push(row);
    console.log(
      `${preset.padEnd(7)} ${name.padEnd(9)} perf ${row.performance} a11y ${row.accessibility} bp ${row.bestPractices} seo ${row.seo} LCP ${row.lcp} CLS ${row.cls}`,
    );
  }
}
await ctx.close();
fs.mkdirSync("test-results/raw", { recursive: true });
fs.writeFileSync("test-results/raw/lighthouse.json", JSON.stringify(rows, null, 2));
const below = rows.filter((r) => r.accessibility < 90 || r.bestPractices < 90);
if (below.length) {
  console.log(
    `under 90: ${below.map((r) => `${r.preset}/${r.page} a11y ${r.accessibility} bp ${r.bestPractices}`).join(", ")}`,
  );
  process.exit(1);
}
