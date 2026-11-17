import { useDependencyHealth, useProbe, probe } from "../api/queries";
import type { ProbeResult } from "../api/probes";
import { ApiError } from "../api/errors";
import type { DependencyHealthResponse } from "../api/types";
import { formatMs } from "../lib/format";
import { Spinner, usePageTitle } from "../components/states";

const PROBES: { id: string; name: string; what: string; run: () => Promise<ProbeResult> }[] = [
  { id: "api", name: "API", what: "GET /health through this app's proxy", run: probe.api },
  {
    id: "database",
    name: "Database",
    what: "GET /identifiers (a public endpoint that reads the database)",
    run: probe.database,
  },
  {
    id: "off",
    name: "Open Food Facts",
    what: "Product read from world.openfoodfacts.org, via this app's nginx",
    run: probe.openFoodFacts,
  },
  {
    id: "openai",
    name: "OpenAI",
    what: "Reachability of api.openai.com, via this app's nginx",
    run: probe.openAi,
  },
  {
    id: "ocr",
    name: "OCR service",
    what: "Reachability of ocr.findmyproductapp.com (label scans)",
    run: probe.ocr,
  },
];

export function StatusPage() {
  usePageTitle("Status");
  return (
    <section className="card">
      <h1>Status</h1>
      <p className="muted">
        Live checks, refreshed every 15 seconds. External services are checked from this app's container.
      </p>
      <ul className="status-list" data-testid="status-list">
        {PROBES.map((p) => (
          <ProbeRow key={p.id} {...p} />
        ))}
      </ul>
      <ApiDependencies />
    </section>
  );
}

const DEPENDENCY_NAMES: Record<keyof DependencyHealthResponse["services"], string> = {
  database: "Database",
  open_food_facts: "Open Food Facts",
  openai: "OpenAI",
  ocr: "OCR service",
};

/** GET /health/deps: the same services, as the API itself sees them. */
function ApiDependencies() {
  const q = useDependencyHealth();
  // a 503 (database down) still carries the per-service body
  const body =
    q.data?.data ??
    (q.error instanceof ApiError ? (q.error.body as DependencyHealthResponse | undefined) : undefined);
  const state = body?.status ?? (q.isPending ? "checking" : "unknown");
  return (
    <div className="status-deps" data-testid="api-deps" data-state={state}>
      <h2>As the API sees them</h2>
      <p className="muted">
        GET /health/deps, cached by the API for 30 seconds
        {body ? ` (checked ${new Date(body.checked_at).toLocaleTimeString()})` : ""}.
      </p>
      {q.isPending && <Spinner label="Checking the API's dependencies" />}
      {!q.isPending && !body && (
        <p className="error" role="alert">
          {q.error ? q.error.message : "No answer from /health/deps."}
        </p>
      )}
      {body?.services && (
        <ul className="status-list">
          {(Object.keys(DEPENDENCY_NAMES) as (keyof typeof DEPENDENCY_NAMES)[]).map((key) => {
            const check = body.services[key];
            const good = check.status === "up" || check.status === "disabled";
            const label = check.status.charAt(0).toUpperCase() + check.status.slice(1);
            return (
              <li
                key={key}
                className={`status-row status-${check.status === "up" ? "up" : good ? "checking" : "down"}`}
                data-testid={`api-deps-${key}`}
                data-state={check.status}
              >
                <span className="status-dot" aria-hidden="true" />
                <div className="status-main">
                  <strong>{DEPENDENCY_NAMES[key]}</strong>
                </div>
                <div className="status-metrics">
                  <span className={`badge ${good ? "" : "badge-error"}`}>{label}</span>
                  <span>{formatMs(check.ms)}</span>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function ProbeRow({
  id,
  name,
  what,
  run,
}: {
  id: string;
  name: string;
  what: string;
  run: () => Promise<ProbeResult>;
}) {
  const q = useProbe(id, run);
  const result = q.data;
  const state = q.isPending ? "checking" : result?.ok ? "up" : "down";
  return (
    <li className={`status-row status-${state}`} data-testid={`status-${id}`} data-state={state}>
      <span className="status-dot" aria-hidden="true" />
      <div className="status-main">
        <strong>{name}</strong>
        <span className="muted">{what}</span>
        {result && <span className="status-detail">{result.detail}</span>}
      </div>
      <div className="status-metrics">
        {q.isPending ? (
          <Spinner label={`Checking ${name}`} />
        ) : (
          <>
            <span className={`badge ${result?.ok ? "" : "badge-error"}`}>{result?.ok ? "Up" : "Down"}</span>
            <span data-testid={`status-${id}-time`}>{formatMs(result?.durationMs)}</span>
            {result && result.status > 0 && <span className="muted">HTTP {result.status}</span>}
          </>
        )}
        <button
          type="button"
          onClick={() => {
            void q.refetch();
          }}
          aria-label={`Check ${name} again`}
          disabled={q.isFetching}
        >
          {q.isFetching ? "Checking…" : "Check now"}
        </button>
      </div>
    </li>
  );
}
