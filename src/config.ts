// Build-time settings (Vite env). The backend's real address is never baked
// in: the browser calls VITE_API_PATH (default "/api"), which this app's nginx
// proxies to API_BASE_URL at run time.
const env = import.meta.env as Record<string, string | undefined>;

function numberFrom(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

export const appConfig = {
  apiPath: (env.VITE_API_PATH ?? "/api").replace(/\/+$/, ""),
  /** default per-request timeout; lookups that may wait for the AI fallback use longer ones */
  requestTimeoutMs: numberFrom(env.VITE_REQUEST_TIMEOUT_MS, 20_000),
  /** where the Test Dashboard reads results (served by nginx from ./test-results) */
  testResultsPath: env.VITE_TEST_RESULTS_PATH ?? "/test-results",
  /** status probes served by this app's nginx (see nginx/default.conf.template) */
  probePath: env.VITE_PROBE_PATH ?? "/probe",
} as const;
