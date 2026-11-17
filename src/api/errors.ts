// One error type for every API call. `message` is always safe to show to a
// person; the server's own words and body are kept for the explorer and logs.

export type ApiErrorKind = "http" | "network" | "timeout" | "aborted" | "parse";

export interface ApiErrorInit {
  kind: ApiErrorKind;
  status: number;
  method: string;
  url: string;
  serverMessage?: string | undefined;
  details?: string | undefined;
  body?: unknown;
  retryAfterSeconds?: number | undefined;
  durationMs?: number | undefined;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number;
  readonly method: string;
  readonly url: string;
  readonly serverMessage: string | undefined;
  readonly details: string | undefined;
  readonly body: unknown;
  readonly retryAfterSeconds: number | undefined;
  readonly durationMs: number | undefined;

  constructor(init: ApiErrorInit) {
    super(friendlyMessage(init));
    this.name = "ApiError";
    this.kind = init.kind;
    this.status = init.status;
    this.method = init.method;
    this.url = init.url;
    this.serverMessage = init.serverMessage;
    this.details = init.details;
    this.body = init.body;
    this.retryAfterSeconds = init.retryAfterSeconds;
    this.durationMs = init.durationMs;
  }

  get isAuthError(): boolean {
    return this.kind === "http" && this.status === 401;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

// The backend has several error shapes: {message}, {error}, {status, message},
// {error, message, details} (validation) and {status: "error", message}.
export function serverMessageOf(body: unknown): { message?: string; details?: string } {
  if (!body || typeof body !== "object") {
    return typeof body === "string" && body.trim() ? { message: body.trim().slice(0, 300) } : {};
  }
  const record = body as Record<string, unknown>;
  const pick = (key: string): string | undefined => {
    const value = record[key];
    return typeof value === "string" && value.trim() ? value.trim() : undefined;
  };
  const details = pick("details");
  const message = pick("message") ?? pick("error");
  return { ...(message ? { message } : {}), ...(details ? { details } : {}) };
}

function friendlyMessage(init: ApiErrorInit): string {
  switch (init.kind) {
    case "network":
      return "Cannot reach the API. Check that the backend is running, then try again.";
    case "timeout":
      return "The API took too long to answer. Please try again.";
    case "aborted":
      return "The request was cancelled.";
    case "parse":
      return "The API sent an answer this app could not read.";
    case "http":
      break;
  }
  const server = init.serverMessage;
  switch (init.status) {
    case 400:
      return init.details
        ? `Please check your input: ${init.details}`
        : (server ?? "Please check your input.");
    case 401:
      return server === "Invalid Token"
        ? "Your session has ended. Please log in again."
        : (server ?? "Not signed in.");
    case 403:
      if (server === "A token is required for authentication") return "Please log in first.";
      if (server === "Access forbidden.") return "You don't have permission to do this.";
      return server ?? "You don't have permission to do this.";
    case 404:
      return server ?? "Not found.";
    case 408:
      return server ?? "The upload took too long. Please try again.";
    case 409:
      return server ?? "This conflicts with existing data.";
    case 413:
      return "The file or request is too large.";
    case 422:
      return server ?? "The request could not be processed.";
    case 429:
      return `Too many requests. ${init.retryAfterSeconds ? `Try again in ${init.retryAfterSeconds} s.` : "Please wait a moment and try again."}`;
    case 502:
    case 503:
    case 504:
      return server ?? "A service the API depends on is unavailable. Please try again shortly.";
    default:
      if (init.status >= 500) return "Something went wrong on the server. Please try again.";
      return server ?? `Request failed (HTTP ${init.status}).`;
  }
}
