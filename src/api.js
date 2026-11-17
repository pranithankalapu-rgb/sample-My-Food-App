// HTTP client for the My Food App API. The browser only talks to its own
// origin: /api/* is proxied by this app's nginx to API_BASE_URL.
export const API_PATH = (import.meta.env.VITE_API_PATH || "/api").replace(/\/+$/, "");

const SESSION_KEY = "mfa-sample-session";

export class ApiError extends Error {
  constructor(status, message, body) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    // storage blocked (private mode): the session lives in memory only
  }
}

let onUnauthorized = () => {};
export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

function messageOf(body, fallback) {
  if (body && typeof body === "object") return body.message || body.error || fallback;
  if (typeof body === "string" && body.trim()) return body.trim().slice(0, 300);
  return fallback;
}

// Every request either resolves with the parsed body or throws an ApiError
// carrying the HTTP status and the API's own message.
export async function request(path, { method = "GET", token, json, form, signal } = {}) {
  const headers = { Accept: "application/json" };
  if (token) headers["x-access-token"] = token;
  let body;
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(json);
  } else if (form) {
    body = form;
  }

  let res;
  try {
    res = await fetch(`${API_PATH}${path}`, { method, headers, body, signal });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new ApiError(0, "Cannot reach the API. Is the backend running?", null);
  }

  const text = await res.text();
  let data = text;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    // non-JSON body (e.g. a proxy error page): keep the text
  }

  if (!res.ok) {
    const err = new ApiError(res.status, messageOf(data, `Request failed (HTTP ${res.status})`), data);
    // expired or revoked session: send the user back to the login screen
    if (token && res.status === 401) onUnauthorized(err);
    throw err;
  }
  return data;
}

export const api = {
  signup: (fields) => request("/user", { method: "POST", json: fields }),
  login: (email, password) => request("/login", { method: "POST", json: { email, password } }),
  product: (token, code, signal) => request(`/product/${encodeURIComponent(code)}`, { token, signal }),
  search: (token, { query, page, pageSize }) =>
    request("/product/search", { method: "POST", token, json: { query, page, page_size: pageSize } }),
  scanLabel: (token, file) => {
    const form = new FormData();
    // the API's upload field is named "images"
    form.append("images", file);
    return request("/product/scan", { method: "POST", token, form });
  },
  deleteUser: (token, id) => request(`/user/${encodeURIComponent(id)}`, { method: "DELETE", token }),
};

// EAN-8, UPC-A, EAN-13 and GTIN-14
export function validateBarcode(value) {
  const code = String(value || "").trim();
  if (!code) return "Enter a barcode.";
  if (!/^\d+$/.test(code)) return "A barcode contains digits only (no letters or spaces).";
  if (![8, 12, 13, 14].includes(code.length)) {
    return `A barcode has 8, 12, 13 or 14 digits (this one has ${code.length}).`;
  }
  return null;
}
