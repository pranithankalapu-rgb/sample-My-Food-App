import fs from "node:fs";
import path from "node:path";
import { expect } from "@playwright/test";

export const PHASE = process.env.PHASE || "adhoc";
export const API_URL = process.env.API_URL || "http://localhost:9595";
export const CMS_URL = process.env.CMS_URL || "http://localhost:3000";
export const WEB_URL = process.env.WEB_URL || "http://localhost:4200";
// test-only stack (docker-compose.apitest.yml)
export const WEB_T_URL = process.env.WEB_T_URL || "http://localhost:4201";
export const API_T_URL = process.env.API_T_URL || "http://localhost:9598";
export const MAILPIT_URL = process.env.MAILPIT_URL || "http://localhost:8025";
export const TOX_OFF_URL = process.env.TOX_OFF_URL || "http://tox-off:8474";
export const SCREENSHOTS = path.join("e2e-report", PHASE, "screenshots");
export const SESSION_KEY = "mfa-sample-session";

// Written by scripts/run-all-tests.sh from the live database before each
// phase: test users, 10 random products (ground truth), counts, image files.
export function fixtures() {
  const file = path.join(".e2e-run", PHASE, "fixtures.json");
  if (!fs.existsSync(file))
    throw new Error(`${file} is missing: run the tests through scripts/run-all-tests.sh`);
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

export function readRunFile(name) {
  return JSON.parse(fs.readFileSync(path.join(".e2e-run", name), "utf8"));
}

export async function shot(page, name) {
  fs.mkdirSync(SCREENSHOTS, { recursive: true });
  await page.screenshot({ path: path.join(SCREENSHOTS, `${name}.png`), fullPage: true });
}

export function round2(value) {
  const n = Number(value);
  if (value === null || value === undefined || value === "" || !Number.isFinite(n)) return null;
  return String(Math.round(n * 100) / 100);
}

/** Logs in through the API and starts the page with that session (any origin). */
export async function signInAs(page, request, apiUrl, account) {
  const res = await request.post(`${apiUrl}/login`, { data: account });
  expect(res.status(), `login ${account.email}: ${await res.text()}`).toBe(200);
  const { token, user } = await res.json();
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [SESSION_KEY, JSON.stringify({ token, user, via: "user" })],
  );
  return { token, user };
}

/** Records image responses, so a test can prove an <img> loaded real bytes. */
export function trackImages(page) {
  const responses = new Map();
  page.on("response", (res) => {
    if (res.request().resourceType() === "image") responses.set(res.url(), res);
  });
  return responses;
}

export async function expectImageLoaded(page, img, responses, label = "image") {
  await expect(img, `${label} is in the page`).toBeVisible();
  await expect
    .poll(async () => img.evaluate((el) => el.complete && el.naturalWidth > 0), {
      message: `${label} decoded`,
      timeout: 30_000,
    })
    .toBe(true);
  const src = await img.evaluate((el) => el.currentSrc || el.src);
  const res = responses?.get(src);
  let status;
  let type;
  let bytes;
  if (res) {
    status = res.status();
    type = res.headers()["content-type"] || "";
    bytes = (await res.body()).length;
  } else {
    const again = await page.request.get(src);
    status = again.status();
    type = again.headers()["content-type"] || "";
    bytes = (await again.body()).length;
  }
  expect(status, `${label} HTTP status (${src})`).toBe(200);
  expect(type, `${label} content-type`).toMatch(/^image\//);
  expect(bytes, `${label} bytes`).toBeGreaterThan(500);
  return { src, bytes };
}

/** Fails on uncaught page errors and on console errors other than expected HTTP statuses. */
export function watchConsole(page, { allowStatus = [] } = {}) {
  const problems = [];
  page.on("pageerror", (err) => problems.push(`pageerror: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() !== "error" && msg.type() !== "warning") return;
    const text = msg.text();
    // the browser itself logs every 4xx/5xx response; those are asserted separately
    const status = /status of (\d{3})/.exec(text)?.[1];
    if (status && (allowStatus.includes(Number(status)) || allowStatus.includes("any"))) return;
    problems.push(`${msg.type()}: ${text}`);
  });
  return problems;
}

/** Toxiproxy (test stack): makes Open Food Facts unreachable or restores it. */
export async function offProxy(request, enabled) {
  const res = await request.post(`${TOX_OFF_URL}/proxies/off`, { data: { enabled } });
  expect(res.ok(), `toxiproxy: ${await res.text()}`).toBe(true);
}

/**
 * The code from the newest email to `address` whose subject contains
 * `subject` (the verification and reset emails can arrive seconds apart).
 */
export async function mailCode(request, address, after, subject) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const res = await request.get(
      `${MAILPIT_URL}/api/v1/search?query=${encodeURIComponent(`to:"${address}"`)}`,
    );
    const list = await res.json();
    const msg = (list.messages || []).find(
      (m) =>
        new Date(m.Created) >= new Date(after.getTime() - 2000) && (!subject || m.Subject.includes(subject)),
    );
    if (msg) {
      const full = await (await request.get(`${MAILPIT_URL}/api/v1/message/${msg.ID}`)).json();
      const code = /\b(\d{6})\b/.exec(`${full.Text}`)?.[1];
      if (code) return code;
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`no email to ${address}`);
}

export function validEan13(prefix) {
  const body = `${prefix}${String(Date.now()).slice(-(12 - prefix.length))}`;
  let sum = 0;
  for (let i = body.length - 1, w = 3; i >= 0; i -= 1, w = w === 3 ? 1 : 3) sum += Number(body[i]) * w;
  return `${body}${(10 - (sum % 10)) % 10}`;
}
