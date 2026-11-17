import { useProbe, probe } from "../api/queries";
import type { ProbeResult } from "../api/probes";
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
        Live checks, refreshed every 15 seconds. External services are checked from this app's container; the
        API does not report its own view of them (there is no dependency health endpoint).
      </p>
      <ul className="status-list" data-testid="status-list">
        {PROBES.map((p) => (
          <ProbeRow key={p.id} {...p} />
        ))}
      </ul>
    </section>
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
