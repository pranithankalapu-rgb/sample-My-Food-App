// HTTP core shared by every endpoint function: base URL, auth header,
// timeout (AbortController), retry with backoff for safe methods, JSON /
// multipart bodies, upload progress, and one ApiError type for failures.
import { ApiError, serverMessageOf } from "./errors";

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "HEAD";
export type QueryValue = string | number | boolean | null | undefined;

export interface HttpRequest {
  method: HttpMethod;
  /** path below the base URL, e.g. "/product/123" */
  path: string;
  query?: Record<string, QueryValue> | undefined;
  json?: unknown;
  form?: FormData | undefined;
  /** undefined: use the client's token provider; null: send no token; string: this token */
  token?: string | null | undefined;
  headers?: Record<string, string> | undefined;
  timeoutMs?: number | undefined;
  signal?: AbortSignal | undefined;
  /** extra attempts for GET/HEAD (default 2); ignored for other methods */
  retries?: number | undefined;
  /** browser only: upload progress 0..1 (uses XMLHttpRequest) */
  onUploadProgress?: ((fraction: number) => void) | undefined;
  /** "auto" parses JSON when the server says so, else text; "blob" for files */
  responseType?: "auto" | "blob" | undefined;
}

export interface HttpResponse<T> {
  data: T;
  status: number;
  headers: Record<string, string>;
  durationMs: number;
  method: HttpMethod;
  url: string;
}

/** One request/response pair, reported to onExchange (API Explorer, test evidence). */
export interface Exchange {
  method: HttpMethod;
  url: string;
  requestHeaders: Record<string, string>;
  requestBody?: unknown;
  status: number;
  responseHeaders: Record<string, string>;
  responseBody: unknown;
  durationMs: number;
  attempt: number;
  error?: string | undefined;
}

export interface HttpClientOptions {
  baseUrl: string;
  getToken?: () => string | null | undefined;
  onUnauthorized?: (error: ApiError) => void;
  onExchange?: (exchange: Exchange) => void;
  defaultTimeoutMs?: number;
  fetchImpl?: typeof fetch;
}

const RETRYABLE_STATUS = new Set([502, 503, 504]);
const MAX_RETRY_AFTER_MS = 5_000;

export function buildUrl(baseUrl: string, path: string, query?: Record<string, QueryValue>): string {
  const url = `${baseUrl.replace(/\/+$/, "")}${path.startsWith("/") ? path : `/${path}`}`;
  if (!query) return url;
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") params.set(key, String(value));
  }
  const qs = params.toString();
  return qs ? `${url}?${qs}` : url;
}

function headersToObject(headers: Headers): Record<string, string> {
  const out: Record<string, string> = {};
  headers.forEach((value, key) => {
    out[key] = value;
  });
  return out;
}

function retryAfterMs(headers: Record<string, string>): number | undefined {
  const raw = headers["retry-after"];
  if (!raw) return undefined;
  const seconds = Number(raw);
  return Number.isFinite(seconds) ? seconds * 1000 : undefined;
}

const sleep = (ms: number, signal?: AbortSignal): Promise<void> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });

async function parseBody(
  contentType: string,
  read: { text: () => Promise<string>; blob: () => Promise<Blob> },
  responseType: "auto" | "blob",
): Promise<unknown> {
  if (
    responseType === "blob" ||
    /^(image|video|application\/pdf|application\/octet-stream)/.test(contentType)
  ) {
    return read.blob();
  }
  const text = await read.text();
  if (!text) return null;
  if (contentType.includes("json")) return JSON.parse(text) as unknown;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

/** Redacts the token in headers that are shown or stored. */
export function redactHeaders(headers: Record<string, string>): Record<string, string> {
  const out = { ...headers };
  if (out["x-access-token"]) out["x-access-token"] = "<token>";
  if (out.Authorization) out.Authorization = "Bearer <token>";
  return out;
}

export function createHttpClient(options: HttpClientOptions) {
  const fetchImpl = options.fetchImpl ?? ((input, init) => fetch(input, init));
  const defaultTimeoutMs = options.defaultTimeoutMs ?? 20_000;

  async function once<T>(req: HttpRequest, attempt: number): Promise<HttpResponse<T>> {
    const url = buildUrl(options.baseUrl, req.path, req.query);
    const headers: Record<string, string> = { Accept: "application/json", ...req.headers };
    const token = req.token === undefined ? options.getToken?.() : req.token;
    if (token) headers["x-access-token"] = token;
    let body: BodyInit | undefined;
    if (req.json !== undefined) {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(req.json);
    } else if (req.form) {
      body = req.form;
    }

    const controller = new AbortController();
    const abortState = { timedOut: false };
    const timeoutMs = req.timeoutMs ?? defaultTimeoutMs;
    const timer = setTimeout(() => {
      abortState.timedOut = true;
      controller.abort();
    }, timeoutMs);
    const onCallerAbort = () => controller.abort();
    req.signal?.addEventListener("abort", onCallerAbort, { once: true });

    const started = performance.now();
    const report = (
      partial: Omit<Exchange, "method" | "url" | "requestHeaders" | "requestBody" | "attempt">,
    ) =>
      options.onExchange?.({
        method: req.method,
        url,
        requestHeaders: redactHeaders(headers),
        requestBody: req.json ?? (req.form ? "<multipart form>" : undefined),
        attempt,
        ...partial,
      });

    let status = 0;
    let responseHeaders: Record<string, string> = {};
    let data: unknown;
    try {
      if (req.onUploadProgress && typeof XMLHttpRequest !== "undefined" && req.form) {
        ({ status, responseHeaders, data } = await xhrRequest(
          req.method,
          url,
          headers,
          req.form,
          controller.signal,
          req.onUploadProgress,
        ));
      } else {
        const res = await fetchImpl(url, { method: req.method, headers, body, signal: controller.signal });
        status = res.status;
        responseHeaders = headersToObject(res.headers);
        try {
          data =
            req.method === "HEAD"
              ? null
              : await parseBody(responseHeaders["content-type"] ?? "", res, req.responseType ?? "auto");
        } catch {
          throw new ApiError({ kind: "parse", status, method: req.method, url });
        }
      }
    } catch (err) {
      const durationMs = Math.round(performance.now() - started);
      if (err instanceof ApiError) {
        report({ status, responseHeaders, responseBody: null, durationMs, error: err.kind });
        throw err;
      }
      const aborted = err instanceof DOMException && err.name === "AbortError";
      const kind = aborted ? (abortState.timedOut ? "timeout" : "aborted") : "network";
      report({ status: 0, responseHeaders: {}, responseBody: null, durationMs, error: kind });
      throw new ApiError({ kind, status: 0, method: req.method, url, durationMs });
    } finally {
      clearTimeout(timer);
      req.signal?.removeEventListener("abort", onCallerAbort);
    }

    const durationMs = Math.round(performance.now() - started);
    report({ status, responseHeaders, responseBody: data, durationMs });
    if (status < 200 || status >= 300) {
      const { message, details } = serverMessageOf(data);
      const retryAfter = retryAfterMs(responseHeaders);
      const error = new ApiError({
        kind: "http",
        status,
        method: req.method,
        url,
        serverMessage: message,
        details,
        body: data,
        retryAfterSeconds: retryAfter ? Math.round(retryAfter / 1000) : undefined,
        durationMs,
      });
      if (status === 401 && token) options.onUnauthorized?.(error);
      throw error;
    }
    return { data: data as T, status, headers: responseHeaders, durationMs, method: req.method, url };
  }

  async function request<T>(req: HttpRequest): Promise<HttpResponse<T>> {
    const safe = req.method === "GET" || req.method === "HEAD";
    const retries = safe ? (req.retries ?? 2) : 0;
    for (let attempt = 1; ; attempt += 1) {
      try {
        return await once<T>(req, attempt);
      } catch (err) {
        if (!(err instanceof ApiError) || attempt > retries || req.signal?.aborted) throw err;
        const transient =
          err.kind === "network" || err.kind === "timeout" || RETRYABLE_STATUS.has(err.status);
        if (!transient) throw err;
        const wait = Math.min(
          (err.retryAfterSeconds ?? 0) * 1000 || 300 * 2 ** (attempt - 1),
          MAX_RETRY_AFTER_MS,
        );
        await sleep(wait, req.signal);
      }
    }
  }

  return { request, baseUrl: options.baseUrl };
}

export type HttpClient = ReturnType<typeof createHttpClient>;

function xhrRequest(
  method: HttpMethod,
  url: string,
  headers: Record<string, string>,
  form: FormData,
  signal: AbortSignal,
  onProgress: (fraction: number) => void,
): Promise<{ status: number; responseHeaders: Record<string, string>; data: unknown }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    for (const [key, value] of Object.entries(headers)) xhr.setRequestHeader(key, value);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(event.loaded / event.total);
    };
    xhr.onload = () => {
      const responseHeaders: Record<string, string> = {};
      for (const line of xhr
        .getAllResponseHeaders()
        .trim()
        .split(/[\r\n]+/)) {
        const index = line.indexOf(":");
        if (index > 0)
          responseHeaders[line.slice(0, index).trim().toLowerCase()] = line.slice(index + 1).trim();
      }
      let data: unknown = xhr.responseText;
      try {
        data = xhr.responseText ? (JSON.parse(xhr.responseText) as unknown) : null;
      } catch {
        // keep text
      }
      onProgress(1);
      resolve({ status: xhr.status, responseHeaders, data });
    };
    xhr.onerror = () => {
      reject(new TypeError("Network error"));
    };
    xhr.onabort = () => {
      reject(new DOMException("Aborted", "AbortError"));
    };
    signal.addEventListener("abort", () => xhr.abort(), { once: true });
    xhr.send(form);
  });
}
