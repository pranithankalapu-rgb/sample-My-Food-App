// Status probes: the API and its database through the API itself, and the
// external services through this app's nginx (/probe/*). External probes show
// reachability from the frontend container, not the API's own view.
import { appConfig } from "../config";
import { api } from "./index";
import { createHttpClient } from "./http";
import { isApiError } from "./errors";

export interface ProbeResult {
  ok: boolean;
  status: number;
  durationMs: number;
  detail: string;
}

const probeHttp = createHttpClient({ baseUrl: appConfig.probePath, defaultTimeoutMs: 12_000 });

async function timed(
  run: () => Promise<{ status: number; durationMs: number }>,
  okDetail: string,
): Promise<ProbeResult> {
  const started = performance.now();
  try {
    const res = await run();
    return { ok: true, status: res.status, durationMs: res.durationMs, detail: okDetail };
  } catch (err) {
    const durationMs = Math.round(performance.now() - started);
    if (isApiError(err)) return { ok: false, status: err.status, durationMs, detail: err.message };
    return { ok: false, status: 0, durationMs, detail: "Probe failed." };
  }
}

/** External service through nginx; `reachableStatuses` are answers that prove the service is up. */
async function external(path: string, reachableStatuses: number[], okDetail: string): Promise<ProbeResult> {
  const started = performance.now();
  try {
    const res = await probeHttp.request({ method: "GET", path, retries: 0, token: null });
    return { ok: true, status: res.status, durationMs: res.durationMs, detail: okDetail };
  } catch (err) {
    const durationMs = Math.round(performance.now() - started);
    if (isApiError(err) && err.kind === "http" && reachableStatuses.includes(err.status)) {
      return { ok: true, status: err.status, durationMs, detail: okDetail };
    }
    if (isApiError(err) && err.kind === "http" && (err.status === 502 || err.status === 504)) {
      return {
        ok: false,
        status: err.status,
        durationMs,
        detail: err.status === 504 ? "Timed out." : "Unreachable (connection failed).",
      };
    }
    return {
      ok: false,
      status: isApiError(err) ? err.status : 0,
      durationMs,
      detail: isApiError(err) ? err.message : "Probe failed.",
    };
  }
}

export const probe = {
  api: () => timed(() => api.system.health({ retries: 0 }), "GET /health answered ok."),
  database: () =>
    timed(
      () => api.billing.identifiers({ retries: 0 }),
      "GET /identifiers read the database (the API has no DB health endpoint).",
    ),
  openFoodFacts: () => external("/off", [], "world.openfoodfacts.org answered a product read."),
  openAi: () =>
    external(
      "/openai",
      [401],
      "api.openai.com is reachable (401 without a key is expected; the key itself is not checked).",
    ),
  ocr: () => external("/ocr", [404, 405], "ocr.findmyproductapp.com answered."),
};
