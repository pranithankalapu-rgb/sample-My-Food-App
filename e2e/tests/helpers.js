import fs from "node:fs";
import path from "node:path";
import { expect } from "@playwright/test";

export const PHASE = process.env.PHASE || "adhoc";
export const API_URL = process.env.API_URL || "http://localhost:9595";
export const CMS_URL = process.env.CMS_URL || "http://localhost:3000";
export const WEB_URL = process.env.WEB_URL || "http://localhost:4200";
export const SCREENSHOTS = path.join("e2e-report", PHASE, "screenshots");

// Written by scripts/run-e2e.sh from the live database before each phase:
// test users, 10 random products (ground truth), counts, image file names.
export function fixtures() {
  const file = path.join(".e2e-run", PHASE, "fixtures.json");
  if (!fs.existsSync(file)) {
    throw new Error(`${file} is missing: run the tests through scripts/run-e2e.sh`);
  }
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

// Records every image response the page receives, so a test can prove an
// <img> really loaded bytes (not a broken icon, not a cached error page).
export function trackImages(page) {
  const responses = new Map();
  page.on("response", (res) => {
    if (res.request().resourceType() === "image") responses.set(res.url(), res);
  });
  return responses;
}

// The <img> finished loading with real pixels, and its HTTP response was a
// 200 image with a non-trivial body.
export async function expectImageLoaded(page, img, responses, label = "image") {
  await expect(img, `${label} is in the page`).toBeVisible();
  await expect
    .poll(async () => img.evaluate((el) => el.complete && el.naturalWidth > 0), {
      message: `${label} decoded with naturalWidth > 0`,
      timeout: 30_000,
    })
    .toBe(true);
  const src = await img.evaluate((el) => el.currentSrc || el.src);
  let res = responses?.get(src);
  let status;
  let contentType;
  let bytes;
  if (res) {
    status = res.status();
    contentType = res.headers()["content-type"] || "";
    bytes = (await res.body()).length;
  } else {
    // served from the memory cache without a response event: fetch it again
    const again = await page.request.get(src);
    status = again.status();
    contentType = again.headers()["content-type"] || "";
    bytes = (await again.body()).length;
  }
  expect(status, `${label} HTTP status (${src})`).toBe(200);
  expect(contentType, `${label} content-type (${src})`).toMatch(/^image\//);
  expect(bytes, `${label} size in bytes (${src})`).toBeGreaterThan(500);
  const natural = await img.evaluate((el) => ({ w: el.naturalWidth, h: el.naturalHeight }));
  return { src, status, contentType, bytes, ...natural };
}

// Fails the test on uncaught page errors (a crash must never pass silently).
export function watchPageErrors(page) {
  const errors = [];
  page.on("pageerror", (err) => errors.push(err.message));
  return errors;
}

export async function apiLogin(request, email, password) {
  const res = await request.post(`${API_URL}/login`, { data: { email, password } });
  const body = await res.json().catch(() => ({}));
  return { status: res.status(), body };
}
