// Format of test-results/results.json, written by scripts/merge-results.mjs
// from the Vitest API run, the Playwright run and the speed/accuracy checks,
// and read by the Test Dashboard. baseline.json has the same format.

export type CaseStatus = "passed" | "failed" | "skipped";

export interface EvidenceExchange {
  method: string;
  url: string;
  status: number;
  durationMs: number;
  requestBody?: unknown;
  responseBody?: unknown;
  responseHeaders?: Record<string, string>;
  error?: string;
}

export interface TestCase {
  id: string;
  suite: "api" | "ui" | "outage" | "fallback" | "unit";
  endpointId: string | null;
  page?: string;
  category: string;
  title: string;
  status: CaseStatus;
  durationMs: number;
  error?: string;
  evidence?: EvidenceExchange[];
}

export interface PerfRow {
  endpointId: string;
  label: string;
  target: string;
  kind: "db" | "external";
  samples: number;
  errors: number;
  p50: number | null;
  p95: number | null;
  max: number | null;
  budgetMs: number;
  flagged: boolean;
  note?: string;
}

export interface FieldCheck {
  field: string;
  api: string;
  reference: string;
  match: boolean;
  note?: string;
}

export interface AccuracyRow {
  code: string;
  name: string;
  ok: boolean;
  /** set when the live reference could not be fetched: neither a match nor a mismatch */
  unchecked?: string;
  fields: FieldCheck[];
}

export interface IngredientRow {
  code: string;
  name: string;
  ok: boolean;
  text: string;
  issues: string[];
}

export interface LighthouseRow {
  page: string;
  preset: string;
  performance: number;
  accessibility: number;
  bestPractices: number;
  seo?: number;
}

export interface TestResults {
  runId: string;
  label: string;
  startedAt: string;
  finishedAt: string;
  backendCommit: string;
  frontendCommit?: string;
  summary: { total: number; passed: number; failed: number; skipped: number; durationMs: number };
  coverage: { endpoints: number; integrated: number; tested: number; untested: string[] };
  cases: TestCase[];
  perf: PerfRow[];
  accuracy: AccuracyRow[];
  ingredients: IngredientRow[];
  lighthouse: LighthouseRow[];
  notes?: string[];
}
