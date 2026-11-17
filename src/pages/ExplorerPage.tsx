import { useMemo, useState } from "react";
import {
  api,
  buildUrl,
  endpointRegistry,
  isApiError,
  onExchange,
  type EndpointId,
  type Exchange,
} from "../api";
import { appConfig } from "../config";
import { AUTH_LABELS, inventory, type InventoryEndpoint } from "../data/inventory";
import { useSession } from "../auth/session";
import { CopyButton, JsonView } from "../components/common";
import { usePageTitle } from "../components/states";
import { formatBytes, formatMs } from "../lib/format";

type AuthMode = "session" | "none" | "custom";

interface Outcome {
  exchange: Exchange | null;
  ok: boolean;
  error?: string;
  blobUrl?: string;
  blobSize?: number;
}

function fillPlaceholders(value: unknown, userId: string | undefined): unknown {
  const now = new Date();
  const map: Record<string, string> = {
    "<own user id>": userId ?? "<sign in first>",
    "<now ISO>": now.toISOString(),
    "<now+30d ISO>": new Date(now.getTime() + 30 * 86_400_000).toISOString(),
    "<run>": String(now.getTime()),
  };
  const text = JSON.stringify(value ?? null);
  const filled = Object.entries(map).reduce((acc, [k, v]) => acc.split(k).join(v), text);
  return JSON.parse(filled) as unknown;
}

function toStrings(record: Record<string, unknown> | undefined): Record<string, string> {
  return Object.fromEntries(Object.entries(record ?? {}).map(([k, v]) => [k, String(v)]));
}

export function curlFor(
  ep: InventoryEndpoint,
  params: Record<string, string>,
  query: Record<string, string>,
  body: string,
  auth: AuthMode,
): string {
  const path = ep.path.replace(/\{(\w+)\}/g, (_, name: string) => encodeURIComponent(params[name] ?? ""));
  const url = buildUrl(`${window.location.origin}${appConfig.apiPath}`, path, query);
  const parts = [`curl -i -X ${ep.method} '${url}'`];
  if (auth !== "none" && ep.auth !== "none") parts.push(`-H "x-access-token: $TOKEN"`);
  if (ep.contentType === "multipart/form-data") {
    for (const field of ep.body)
      parts.push(`-F '${field.name}=@./${field.name === "images" ? "photo.jpg" : "file"}'`);
  } else if (ep.body.length && body.trim()) {
    parts.push(
      `-H 'Content-Type: application/json'`,
      `--data '${body.replace(/'/g, "'\\''").replace(/\s*\n\s*/g, " ")}'`,
    );
  }
  return parts.join(" \\\n  ");
}

export default function ExplorerPage() {
  usePageTitle("API Explorer");
  const [selectedId, setSelectedId] = useState<string>(inventory.endpoints[0]?.id ?? "");
  const [filter, setFilter] = useState("");
  const endpoint = inventory.endpoints.find((e) => e.id === selectedId);
  const groups = useMemo(() => {
    const out = new Map<string, InventoryEndpoint[]>();
    const f = filter.toLowerCase();
    for (const ep of inventory.endpoints) {
      if (f && !`${ep.method} ${ep.path} ${ep.purpose}`.toLowerCase().includes(f)) continue;
      out.set(ep.group, [...(out.get(ep.group) ?? []), ep]);
    }
    return out;
  }, [filter]);

  return (
    <div className="explorer">
      <aside className="card explorer-list" aria-label="Endpoints">
        <h1>API Explorer</h1>
        <p className="muted small">
          All {inventory.endpoints.length} endpoints, sent through the app's typed client via{" "}
          <code>{appConfig.apiPath}</code>.
        </p>
        <label>
          Filter
          <input
            type="search"
            value={filter}
            placeholder="method, path or purpose"
            onChange={(e) => {
              setFilter(e.target.value);
            }}
          />
        </label>
        {[...groups].map(([group, eps]) => (
          <div key={group}>
            <h2 className="small-heading">{group}</h2>
            <ul className="endpoint-list">
              {eps.map((ep) => (
                <li key={ep.id}>
                  <button
                    type="button"
                    className={ep.id === selectedId ? "active" : ""}
                    aria-current={ep.id === selectedId}
                    onClick={() => {
                      setSelectedId(ep.id);
                    }}
                    data-testid={`explorer-endpoint-${ep.id}`}
                  >
                    <span className={`method method-${ep.method}`}>{ep.method}</span> <code>{ep.path}</code>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </aside>
      {endpoint && <EndpointForm key={endpoint.id} endpoint={endpoint} />}
    </div>
  );
}

function EndpointForm({ endpoint }: { endpoint: InventoryEndpoint }) {
  const { session } = useSession();
  const example = useMemo(
    () => fillPlaceholders(endpoint.example, session?.user.id) as InventoryEndpoint["example"],
    [endpoint, session?.user.id],
  );
  const [params, setParams] = useState<Record<string, string>>(() => toStrings(example.params));
  const [query, setQuery] = useState<Record<string, string>>(() => toStrings(example.query));
  const multipart = endpoint.contentType === "multipart/form-data";
  const [body, setBody] = useState(() =>
    !multipart && endpoint.body.length ? JSON.stringify(example.body ?? {}, null, 2) : "",
  );
  const [files, setFiles] = useState<Record<string, File[]>>({});
  const [auth, setAuth] = useState<AuthMode>(endpoint.auth === "none" ? "none" : "session");
  const [customToken, setCustomToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [bodyError, setBodyError] = useState<string | null>(null);

  const send = async () => {
    let parsed: unknown;
    if (!multipart && endpoint.body.length) {
      try {
        parsed = body.trim() ? (JSON.parse(body) as unknown) : undefined;
        setBodyError(null);
      } catch {
        setBodyError("The body is not valid JSON.");
        return;
      }
    }
    setBusy(true);
    if (outcome?.blobUrl) URL.revokeObjectURL(outcome.blobUrl);
    let last: Exchange | null = null;
    const stop = onExchange((ex) => {
      last = ex;
    });
    const token = auth === "none" ? null : auth === "custom" ? customToken : (session?.token ?? null);
    try {
      const entry = endpointRegistry[endpoint.id as EndpointId] as
        (typeof endpointRegistry)[EndpointId] | undefined;
      if (!entry) throw new Error(`No client function for ${endpoint.id}`);
      const res = await entry.send(api, { params, query, body: parsed, files, opts: { token, retries: 0 } });
      const blob = res.data instanceof Blob ? res.data : null;
      setOutcome({
        exchange: last,
        ok: true,
        ...(blob ? { blobUrl: URL.createObjectURL(blob), blobSize: blob.size } : {}),
      });
    } catch (err) {
      setOutcome({
        exchange: last,
        ok: false,
        error: isApiError(err) ? err.message : "The request could not be sent.",
      });
    } finally {
      stop();
      setBusy(false);
    }
  };

  const ex = outcome?.exchange;
  const curl = curlFor(endpoint, params, query, body, auth);
  return (
    <section className="card explorer-form" aria-labelledby="ep-title" data-testid="explorer-form">
      <h2 id="ep-title">
        <span className={`method method-${endpoint.method}`}>{endpoint.method}</span>{" "}
        <code>{endpoint.path}</code>
      </h2>
      <p>{endpoint.purpose}</p>
      <p className="badges">
        <span className="badge">{AUTH_LABELS[endpoint.auth]}</span>
        {endpoint.rateLimit && <span className="badge badge-neutral">Rate limit: {endpoint.rateLimit}</span>}
        <span className="badge badge-neutral">Data: {endpoint.dataSource.join(", ")}</span>
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
        aria-label="Request"
      >
        {endpoint.params.map((f) => (
          <label key={f.name}>
            Path: {f.name}{" "}
            <span className="muted small">
              {f.type}
              {f.rules ? ` · ${f.rules}` : ""}
            </span>
            <input
              value={params[f.name] ?? ""}
              required
              onChange={(e) => {
                setParams({ ...params, [f.name]: e.target.value });
              }}
            />
          </label>
        ))}
        {endpoint.query.map((f) => (
          <label key={f.name}>
            Query: {f.name} {f.required && "*"}{" "}
            <span className="muted small">
              {f.type}
              {f.rules ? ` · ${f.rules}` : ""}
            </span>
            <input
              value={query[f.name] ?? ""}
              onChange={(e) => {
                setQuery({ ...query, [f.name]: e.target.value });
              }}
            />
          </label>
        ))}
        {multipart &&
          endpoint.body.map((f) => (
            <label key={f.name}>
              File field: {f.name} <span className="muted small">{f.rules}</span>
              <input
                type="file"
                multiple={f.type.endsWith("[]")}
                onChange={(e) => {
                  setFiles({ ...files, [f.name]: [...(e.target.files ?? [])] });
                }}
              />
            </label>
          ))}
        {!multipart && endpoint.body.length > 0 && (
          <label>
            JSON body
            <textarea
              className="code-input"
              rows={Math.min(14, body.split("\n").length + 1)}
              value={body}
              spellCheck={false}
              onChange={(e) => {
                setBody(e.target.value);
              }}
              aria-invalid={Boolean(bodyError)}
              data-testid="explorer-body"
            />
            <span className="muted small">
              Fields: {endpoint.body.map((f) => `${f.name}${f.required ? "*" : ""} (${f.type})`).join(", ")}
            </span>
          </label>
        )}
        {bodyError && (
          <p className="error" role="alert">
            {bodyError}
          </p>
        )}
        <div className="row3">
          <label>
            Auth
            <select
              value={auth}
              onChange={(e) => {
                setAuth(e.target.value as AuthMode);
              }}
            >
              <option value="session" disabled={!session}>
                My session token{session ? "" : " (not signed in)"}
              </option>
              <option value="none">No token</option>
              <option value="custom">Custom token</option>
            </select>
          </label>
          {auth === "custom" && (
            <label>
              Token
              <input
                value={customToken}
                onChange={(e) => {
                  setCustomToken(e.target.value);
                }}
                placeholder="paste a JWT or try an invalid one"
              />
            </label>
          )}
        </div>
        <div className="actions">
          <button type="submit" className="primary" disabled={busy} data-testid="explorer-send">
            {busy ? "Sending…" : "Send"}
          </button>
          <CopyButton text={curl} label="Copy as curl" testId="explorer-curl" />
        </div>
      </form>

      {outcome && (
        <div className="explorer-result" data-testid="explorer-result" data-status={ex?.status ?? 0}>
          <h3>
            Response{" "}
            <span className={`badge ${outcome.ok ? "" : "badge-error"}`} data-testid="explorer-status">
              {ex?.status ? `HTTP ${ex.status}` : (ex?.error ?? "no response")}
            </span>{" "}
            <span className="muted" data-testid="explorer-time">
              {formatMs(ex?.durationMs)}
            </span>
          </h3>
          {!outcome.ok && (
            <p className="error" role="alert">
              {outcome.error}
            </p>
          )}
          {outcome.blobUrl && (
            <figure>
              <img src={outcome.blobUrl} alt="Response image" className="explorer-image" />
              <figcaption className="muted small">{formatBytes(outcome.blobSize ?? 0)}</figcaption>
            </figure>
          )}
          {ex && !outcome.blobUrl && (
            <JsonView value={ex.responseBody ?? "(empty body)"} testId="explorer-response-body" />
          )}
          {ex && (
            <details>
              <summary>Headers</summary>
              <table className="table small">
                <tbody>
                  {Object.entries(ex.responseHeaders).map(([k, v]) => (
                    <tr key={k}>
                      <th scope="row">{k}</th>
                      <td>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <h4>Request</h4>
              <JsonView
                value={{ method: ex.method, url: ex.url, headers: ex.requestHeaders, body: ex.requestBody }}
              />
            </details>
          )}
        </div>
      )}
      <details>
        <summary>Documented responses</summary>
        <table className="table small">
          <tbody>
            {endpoint.responses.map((r, i) => (
              <tr key={i}>
                <th scope="row">{r.status}</th>
                <td>{r.when}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </section>
  );
}
