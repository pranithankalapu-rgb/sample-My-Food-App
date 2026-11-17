// Wraps Vitest's `it` so every case is recorded for the Test Dashboard with
// its request/response evidence. The test itself is unchanged: failures still
// fail the run.
import path from "node:path";
import { afterAll, it } from "vitest";
import type { EvidenceExchange, TestCase } from "../../../src/data/results";
import type { Exchange } from "../../../src/api/http";
import { env, writeRaw } from "./env";

let current: Exchange[] | null = null;
const cases: TestCase[] = [];
let fileKey = "api";

export function captureExchange(exchange: Exchange): void {
  current?.push(exchange);
}

const MAX_BODY = 4000;

// Evidence is committed and shown on the dashboard: passwords, tokens and
// emailed codes never go into it (a "code" next to an "email" is an emailed
// code; elsewhere "code" is a barcode and stays).
const SECRET_KEYS = new Set(["password", "repassword", "new_password", "token", "social_token"]);
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object" && !(value instanceof Blob)) {
    const record = value as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(record).map(([k, v]) => [
        k,
        typeof v === "string" && (SECRET_KEYS.has(k) || (k === "code" && "email" in record))
          ? "<redacted>"
          : redact(v),
      ]),
    );
  }
  return value;
}

function trim(raw: unknown): unknown {
  if (raw instanceof Blob) return `<${raw.type || "binary"} ${raw.size} bytes>`;
  const value = redact(raw);
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (text.length <= MAX_BODY) return value;
  return `${text.slice(0, MAX_BODY)}… (${text.length} chars)`;
}

function toEvidence(ex: Exchange): EvidenceExchange {
  return {
    method: ex.method,
    url: ex.url,
    status: ex.status,
    durationMs: ex.durationMs,
    ...(ex.requestBody !== undefined ? { requestBody: trim(ex.requestBody) } : {}),
    responseBody: trim(ex.responseBody),
    responseHeaders: Object.fromEntries(
      Object.entries(ex.responseHeaders).filter(([k]) =>
        /^(content-type|retry-after|ratelimit|x-|location)/i.test(k),
      ),
    ),
    ...(ex.error ? { error: ex.error } : {}),
  };
}

export interface CaseMeta {
  endpoint: string | null;
  category: string;
  suite?: TestCase["suite"];
}

/** Registers the file's results file name (call once per test file). */
export function recordFile(importMetaUrl: string): void {
  fileKey = path.basename(new URL(importMetaUrl).pathname).replace(/\.test\.ts$/, "");
  afterAll(() => {
    writeRaw(`api-${fileKey}.json`, cases);
  });
}

export function check(
  meta: CaseMeta,
  title: string,
  fn: () => Promise<void> | void,
  timeoutMs?: number,
): void {
  it(
    title,
    async () => {
      const exchanges: Exchange[] = [];
      current = exchanges;
      const started = performance.now();
      const base = {
        id: `${fileKey}:${meta.endpoint ?? "-"}:${title}`,
        suite: meta.suite ?? "api",
        endpointId: meta.endpoint,
        category: meta.category,
        title,
      };
      try {
        await fn();
        cases.push({
          ...base,
          status: "passed",
          durationMs: Math.round(performance.now() - started),
          // the first exchange documents a passing case (examples in the report)
          evidence: exchanges.slice(0, 1).map(toEvidence),
        });
      } catch (err) {
        cases.push({
          ...base,
          status: "failed",
          durationMs: Math.round(performance.now() - started),
          error: err instanceof Error ? err.message.slice(0, 3000) : String(err),
          evidence: exchanges.slice(-4).map(toEvidence),
        });
        throw err;
      } finally {
        current = null;
      }
    },
    timeoutMs,
  );
}

export const runId = env.runId;
