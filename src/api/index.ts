// The app's single API client. Components never call fetch directly: they use
// `api` (through the TanStack Query hooks in ./queries) or the registry.
import { appConfig } from "../config";
import { createApi } from "./endpoints";
import { createHttpClient, type Exchange } from "./http";
import type { ApiError } from "./errors";

type Listener<A> = (arg: A) => void;

let currentToken: string | null = null;
const unauthorizedListeners = new Set<Listener<ApiError>>();
const exchangeListeners = new Set<Listener<Exchange>>();

export const http = createHttpClient({
  baseUrl: appConfig.apiPath,
  defaultTimeoutMs: appConfig.requestTimeoutMs,
  getToken: () => currentToken,
  onUnauthorized: (error) => {
    unauthorizedListeners.forEach((fn) => {
      fn(error);
    });
  },
  onExchange: (exchange) => {
    exchangeListeners.forEach((fn) => {
      fn(exchange);
    });
  },
});

export const api = createApi(http);

export function setApiToken(token: string | null): void {
  currentToken = token;
}

export function onUnauthorized(fn: Listener<ApiError>): () => void {
  unauthorizedListeners.add(fn);
  return () => unauthorizedListeners.delete(fn);
}

export function onExchange(fn: Listener<Exchange>): () => void {
  exchangeListeners.add(fn);
  return () => exchangeListeners.delete(fn);
}

export { ApiError, isApiError } from "./errors";
export { createApi, endpointRegistry, type EndpointId, type ExplorerInput } from "./endpoints";
export { createHttpClient, buildUrl, redactHeaders, type Exchange, type HttpResponse } from "./http";
export type * from "./types";
