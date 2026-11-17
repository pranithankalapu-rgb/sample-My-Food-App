import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createHttpClient, isApiError } from "../api";
import { appConfig } from "../config";
import type { TestCase, TestResults } from "../data/results";
import { inventory } from "../data/inventory";
import { JsonView } from "../components/common";
import { EmptyState, ErrorPanel, Skeleton, usePageTitle } from "../components/states";
import { formatDate, formatMs } from "../lib/format";

const resultsHttp = createHttpClient({ baseUrl: appConfig.testResultsPath, defaultTimeoutMs: 10_000 });

async function loadResults(file: string): Promise<TestResults | null> {
  try {
    const res = await resultsHttp.request<TestResults>({
      method: "GET",
      path: `/${file}`,
      token: null,
      retries: 0,
      query: { t: Date.now() },
    });
    return res.data;
  } catch (err) {
    if (isApiError(err) && err.status === 404) return null;
    throw err;
  }
}

type Filter = "all" | "failed" | "passed";

export default function TestDashboardPage() {
  usePageTitle("Test dashboard");
  const latest = useQuery({
    queryKey: ["test-results", "latest"],
    queryFn: () => loadResults("results.json"),
  });
  const baseline = useQuery({
    queryKey: ["test-results", "baseline"],
    queryFn: () => loadResults("baseline.json"),
  });

  if (latest.isPending)
    return (
      <section className="card">
        <h1>Test dashboard</h1>
        <Skeleton lines={6} />
      </section>
    );
  if (latest.isError) {
    return (
      <section className="card">
        <h1>Test dashboard</h1>
        <ErrorPanel
          error={latest.error}
          title="Could not load test results"
          onRetry={() => {
            void latest.refetch();
          }}
        />
      </section>
    );
  }
  if (!latest.data) {
    return (
      <section className="card">
        <h1>Test dashboard</h1>
        <EmptyState title="No test results yet" testId="no-results">
          <p>
            Run <code>./scripts/run-all-tests.sh</code>; it writes <code>test-results/results.json</code>,
            which this page shows.
          </p>
        </EmptyState>
      </section>
    );
  }
  return <Dashboard results={latest.data} baseline={baseline.data ?? null} />;
}

function Dashboard({ results, baseline }: { results: TestResults; baseline: TestResults | null }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [suite, setSuite] = useState("all");
  const s = results.summary;
  const byEndpoint = useMemo(() => {
    const map = new Map<string, TestCase[]>();
    for (const c of results.cases) {
      if (!c.endpointId) continue;
      map.set(c.endpointId, [...(map.get(c.endpointId) ?? []), c]);
    }
    return map;
  }, [results]);
  const suites = [...new Set(results.cases.map((c) => c.suite))];
  const visible = results.cases.filter(
    (c) => (filter === "all" || c.status === filter) && (suite === "all" || c.suite === suite),
  );
  const baselineById = new Map((baseline?.cases ?? []).map((c) => [c.id, c]));

  return (
    <div className="stack" data-testid="dashboard">
      <section className="card">
        <h1>Test dashboard</h1>
        <p className="muted">
          {results.label} · run {results.runId} · {formatDate(results.finishedAt)} · backend{" "}
          <code>{results.backendCommit.slice(0, 7)}</code>
          {results.frontendCommit && (
            <>
              {" "}
              · app <code>{results.frontendCommit.slice(0, 7)}</code>
            </>
          )}
        </p>
        <div className="stats">
          <Stat label="Cases" value={s.total} />
          <Stat label="Passed" value={s.passed} tone="ok" />
          <Stat label="Failed" value={s.failed} tone={s.failed ? "bad" : "ok"} testId="stat-failed" />
          <Stat label="Endpoints tested" value={`${results.coverage.tested}/${results.coverage.endpoints}`} />
          <Stat label="Duration" value={formatMs(s.durationMs)} />
        </div>
        {results.notes && results.notes.length > 0 && (
          <ul className="notes">
            {results.notes.map((n) => (
              <li key={n}>{n}</li>
            ))}
          </ul>
        )}
      </section>

      {baseline && <Comparison results={results} baseline={baseline} />}

      <section className="card" aria-labelledby="ep-title">
        <h2 id="ep-title">Per endpoint</h2>
        <table className="table" data-testid="endpoint-table">
          <thead>
            <tr>
              <th scope="col">Endpoint</th>
              <th scope="col">Cases</th>
              <th scope="col">Passed</th>
              <th scope="col">Failed</th>
              <th scope="col">p50 / p95</th>
            </tr>
          </thead>
          <tbody>
            {inventory.endpoints.map((ep) => {
              const cases = byEndpoint.get(ep.id) ?? [];
              const failed = cases.filter((c) => c.status === "failed").length;
              const perf = results.perf.find((p) => p.endpointId === ep.id);
              return (
                <tr key={ep.id} className={failed ? "row-bad" : cases.length ? "" : "row-muted"}>
                  <td>
                    <span className={`method method-${ep.method}`}>{ep.method}</span> <code>{ep.path}</code>
                  </td>
                  <td>{cases.length}</td>
                  <td>{cases.filter((c) => c.status === "passed").length}</td>
                  <td>{failed || ""}</td>
                  <td>
                    {perf ? `${formatMs(perf.p50)} / ${formatMs(perf.p95)}${perf.flagged ? " ⚠" : ""}` : "—"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="card" aria-labelledby="cases-title">
        <h2 id="cases-title">Cases</h2>
        <div className="actions">
          {(["all", "failed", "passed"] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              aria-pressed={filter === f}
              onClick={() => {
                setFilter(f);
              }}
            >
              {f}
            </button>
          ))}
          <label className="inline">
            Suite
            <select
              value={suite}
              onChange={(e) => {
                setSuite(e.target.value);
              }}
            >
              <option value="all">all</option>
              {suites.map((x) => (
                <option key={x} value={x}>
                  {x}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ul className="case-list" data-testid="case-list">
          {visible.map((c) => {
            const before = baselineById.get(c.id);
            return (
              <li key={c.id} className={`case case-${c.status}`} data-status={c.status}>
                <details>
                  <summary>
                    <span
                      className={`badge ${c.status === "failed" ? "badge-error" : c.status === "skipped" ? "badge-neutral" : ""}`}
                    >
                      {c.status}
                    </span>{" "}
                    <span className="muted small">
                      {c.suite} · {c.category}
                    </span>{" "}
                    {c.title} <span className="muted small">{formatMs(c.durationMs)}</span>
                    {before && before.status !== c.status && (
                      <span className="badge badge-warn">was {before.status}</span>
                    )}
                  </summary>
                  {c.error && <pre className="json error-text">{c.error}</pre>}
                  {c.evidence?.map((ex, i) => (
                    <div key={i} className="evidence">
                      <p>
                        <strong>{ex.method}</strong> <code>{ex.url}</code> → HTTP {ex.status} in{" "}
                        {formatMs(ex.durationMs)}
                        {ex.error ? ` (${ex.error})` : ""}
                      </p>
                      {ex.requestBody !== undefined && (
                        <>
                          <h4>Request body</h4>
                          <JsonView value={ex.requestBody} maxHeight={200} />
                        </>
                      )}
                      <h4>Response body</h4>
                      <JsonView value={ex.responseBody ?? null} maxHeight={260} />
                    </div>
                  ))}
                </details>
              </li>
            );
          })}
        </ul>
      </section>

      {results.perf.length > 0 && (
        <section className="card" aria-labelledby="perf-title">
          <h2 id="perf-title">Speed</h2>
          <p className="muted small">
            Database-only calls are flagged above 500 ms (p95), external calls above 3 s.
          </p>
          <table className="table" data-testid="perf-table">
            <thead>
              <tr>
                <th scope="col">Call</th>
                <th scope="col">Samples</th>
                <th scope="col">p50</th>
                <th scope="col">p95</th>
                <th scope="col">Max</th>
                <th scope="col">Budget</th>
                <th scope="col">Errors</th>
              </tr>
            </thead>
            <tbody>
              {results.perf.map((p) => (
                <tr key={`${p.endpointId}-${p.label}`} className={p.flagged ? "row-bad" : ""}>
                  <td>
                    {p.label}
                    {p.note && <span className="muted small"> · {p.note}</span>}
                  </td>
                  <td>{p.samples}</td>
                  <td>{formatMs(p.p50)}</td>
                  <td>{formatMs(p.p95)}</td>
                  <td>{formatMs(p.max)}</td>
                  <td>
                    {p.kind} · {formatMs(p.budgetMs)}
                  </td>
                  <td>{p.errors || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {results.accuracy.length > 0 && (
        <section className="card" aria-labelledby="acc-title">
          <h2 id="acc-title">Accuracy against live Open Food Facts</h2>
          <p className="muted">
            {results.accuracy.filter((a) => a.ok && !a.unchecked).length} of{" "}
            {results.accuracy.filter((a) => !a.unchecked).length} checked products match on every field
            {results.accuracy.some((a) => a.unchecked) &&
              `; ${String(results.accuracy.filter((a) => a.unchecked).length)} could not be checked (Open Food Facts did not answer)`}
            .
          </p>
          <table className="table small" data-testid="accuracy-table">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Mismatches</th>
              </tr>
            </thead>
            <tbody>
              {results.accuracy.map((a) => (
                <tr key={a.code} className={a.ok ? "" : "row-bad"}>
                  <td>
                    {a.name} <code>{a.code}</code>
                  </td>
                  <td>
                    {a.fields
                      .filter((f) => !f.match)
                      .map((f) => (
                        <div key={f.field}>
                          <strong>{f.field}</strong>: API “{f.api}” vs OFF “{f.reference}”
                          {f.note ? ` (${f.note})` : ""}
                        </div>
                      ))}
                    {a.unchecked ? <span className="muted">Not checked: {a.unchecked}</span> : a.ok && "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {results.ingredients.length > 0 && (
        <section className="card" aria-labelledby="ing-title">
          <h2 id="ing-title">Ingredient lists</h2>
          <table className="table small" data-testid="ingredients-table">
            <thead>
              <tr>
                <th scope="col">Product</th>
                <th scope="col">Issues</th>
                <th scope="col">Text (start)</th>
              </tr>
            </thead>
            <tbody>
              {results.ingredients.map((r) => (
                <tr key={r.code} className={r.ok ? "" : "row-bad"}>
                  <td>
                    {r.name} <code>{r.code}</code>
                  </td>
                  <td>{r.issues.join("; ") || "—"}</td>
                  <td>{r.text.slice(0, 120)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {results.lighthouse.length > 0 && (
        <section className="card" aria-labelledby="lh-title">
          <h2 id="lh-title">Lighthouse</h2>
          <table className="table" data-testid="lighthouse-table">
            <thead>
              <tr>
                <th scope="col">Page</th>
                <th scope="col">Preset</th>
                <th scope="col">Performance</th>
                <th scope="col">Accessibility</th>
                <th scope="col">Best practices</th>
              </tr>
            </thead>
            <tbody>
              {results.lighthouse.map((l) => (
                <tr key={`${l.page}-${l.preset}`}>
                  <td>{l.page}</td>
                  <td>{l.preset}</td>
                  <td>{l.performance}</td>
                  <td>{l.accessibility}</td>
                  <td>{l.bestPractices}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

function Stat({
  label,
  value,
  tone,
  testId,
}: {
  label: string;
  value: string | number;
  tone?: "ok" | "bad";
  testId?: string;
}) {
  return (
    <div className={`stat ${tone ? `stat-${tone}` : ""}`} data-testid={testId}>
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}

function Comparison({ results, baseline }: { results: TestResults; baseline: TestResults }) {
  const before = new Map(baseline.cases.map((c) => [c.id, c]));
  const fixed = results.cases.filter((c) => c.status === "passed" && before.get(c.id)?.status === "failed");
  const broke = results.cases.filter((c) => c.status === "failed" && before.get(c.id)?.status === "passed");
  const perfBefore = new Map(baseline.perf.map((p) => [`${p.endpointId}-${p.label}`, p]));
  const perfChanges = results.perf
    .map((p) => ({ p, b: perfBefore.get(`${p.endpointId}-${p.label}`) }))
    .filter(
      (x): x is { p: typeof x.p; b: NonNullable<typeof x.b> } =>
        Boolean(x.b) && x.p.p95 !== null && x.b?.p95 !== null,
    );
  return (
    <section className="card" aria-labelledby="cmp-title" data-testid="comparison">
      <h2 id="cmp-title">Before / after</h2>
      <p className="muted">
        Baseline: {baseline.label} ({formatDate(baseline.finishedAt)}): {baseline.summary.failed} failed of{" "}
        {baseline.summary.total}. Now: {results.summary.failed} failed of {results.summary.total}.
      </p>
      <div className="row2">
        <div>
          <h3>Fixed ({fixed.length})</h3>
          <ul>
            {fixed.map((c) => (
              <li key={c.id}>{c.title}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3>Newly failing ({broke.length})</h3>
          <ul>
            {broke.map((c) => (
              <li key={c.id}>{c.title}</li>
            ))}
          </ul>
        </div>
      </div>
      {perfChanges.length > 0 && (
        <table className="table small">
          <thead>
            <tr>
              <th scope="col">Call</th>
              <th scope="col">p95 before</th>
              <th scope="col">p95 after</th>
            </tr>
          </thead>
          <tbody>
            {perfChanges.map(({ p, b }) => (
              <tr key={`${p.endpointId}-${p.label}`}>
                <td>{p.label}</td>
                <td>{formatMs(b.p95)}</td>
                <td>{formatMs(p.p95)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
