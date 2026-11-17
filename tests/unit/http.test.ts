// The HTTP core against a real local server (no fetch mocks).
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createHttpClient, type Exchange } from "../../src/api/http";
import { ApiError } from "../../src/api/errors";

let server: http.Server;
let base = "";
const hits = new Map<string, number>();

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    hits.set(url.pathname, (hits.get(url.pathname) ?? 0) + 1);
    const count = hits.get(url.pathname) ?? 0;
    // returns true so each switch branch can `return json(...)`
    const json = (status: number, body: unknown, headers: Record<string, string> = {}): true => {
      res.writeHead(status, { "Content-Type": "application/json", ...headers });
      res.end(JSON.stringify(body));
      return true;
    };
    switch (url.pathname) {
      case "/ok":
        return json(200, {
          ok: true,
          token: req.headers["x-access-token"] ?? null,
          q: url.searchParams.get("q"),
        });
      case "/echo": {
        let body = "";
        req.on("data", (c: Buffer) => (body += c.toString()));
        req.on("end", () => {
          json(201, {
            method: req.method,
            type: req.headers["content-type"],
            body: JSON.parse(body) as unknown,
          });
        });
        return;
      }
      case "/flaky":
        return count < 3
          ? json(503, { message: "busy" }, { "Retry-After": "0" })
          : json(200, { attempt: count });
      case "/flaky-post":
        return json(503, { message: "busy" });
      case "/slow":
        setTimeout(() => {
          json(200, { late: true });
        }, 1500);
        return;
      case "/validation":
        return json(400, {
          error: "Bad Request",
          message: "Please check the request inputs",
          details: '"email" is required',
        });
      case "/no-token":
        return json(403, { status: 403, message: "A token is required for authentication" });
      case "/bad-token":
        return json(401, { status: 401, message: "Invalid Token" });
      case "/limited":
        return json(
          429,
          { status: 429, message: "Too many requests. Please try again later." },
          { "Retry-After": "60" },
        );
      case "/text":
        res.writeHead(500, { "Content-Type": "text/html" });
        return res.end("<html>Bad gateway</html>");
      default:
        return json(404, { status: 404, message: "Not found." });
    }
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(() => {
  server.close();
});

describe("http client", () => {
  it("sends the token, query and JSON body", async () => {
    const client = createHttpClient({ baseUrl: base, getToken: () => "t0k" });
    const ok = await client.request<{ token: string; q: string }>({
      method: "GET",
      path: "/ok",
      query: { q: "a b", empty: "" },
    });
    expect(ok.status).toBe(200);
    expect(ok.data).toMatchObject({ token: "t0k", q: "a b" });
    const noToken = await client.request<{ token: string | null }>({
      method: "GET",
      path: "/ok",
      token: null,
    });
    expect(noToken.data.token).toBeNull();
    const echo = await client.request<{ body: unknown; type: string }>({
      method: "POST",
      path: "/echo",
      json: { a: 1 },
    });
    expect(echo.data).toMatchObject({ body: { a: 1 }, type: "application/json" });
  });

  it("retries safe GETs on 503 and reports every attempt", async () => {
    const seen: Exchange[] = [];
    const client = createHttpClient({ baseUrl: base, onExchange: (e) => seen.push(e) });
    const res = await client.request<{ attempt: number }>({ method: "GET", path: "/flaky" });
    expect(res.data.attempt).toBe(3);
    expect(seen.map((e) => e.status)).toEqual([503, 503, 200]);
  });

  it("never retries POST", async () => {
    const client = createHttpClient({ baseUrl: base });
    await expect(client.request({ method: "POST", path: "/flaky-post", json: {} })).rejects.toMatchObject({
      status: 503,
    });
    expect(hits.get("/flaky-post")).toBe(1);
  });

  it("times out with a clear error", async () => {
    const client = createHttpClient({ baseUrl: base });
    const err = await client
      .request({ method: "GET", path: "/slow", timeoutMs: 200, retries: 0 })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ kind: "timeout", status: 0 });
    expect((err as ApiError).message).toMatch(/took too long/);
  });

  it("reports network errors", async () => {
    const client = createHttpClient({ baseUrl: "http://127.0.0.1:1" });
    await expect(client.request({ method: "GET", path: "/x", retries: 0 })).rejects.toMatchObject({
      kind: "network",
    });
  });

  it("maps every backend error shape to a friendly message", async () => {
    const client = createHttpClient({ baseUrl: base });
    const get = (path: string): Promise<ApiError> =>
      client.request({ method: "GET", path, retries: 0 }).then(
        () => {
          throw new Error(`${path} should have failed`);
        },
        (e: unknown) => e as ApiError,
      );
    const validation = await get("/validation");
    expect(validation).toMatchObject({ status: 400, details: '"email" is required' });
    expect(validation.message).toBe('Please check your input: "email" is required');
    expect((await get("/no-token")).message).toBe("Please log in first.");
    expect((await get("/bad-token")).message).toBe("Your session has ended. Please log in again.");
    const limited = await get("/limited");
    expect(limited.retryAfterSeconds).toBe(60);
    expect(limited.message).toBe("Too many requests. Try again in 60 s.");
    const text = await get("/text");
    expect(text.message).toBe("Something went wrong on the server. Please try again.");
    expect(text.message).not.toContain("<html>");
  });

  it("calls onUnauthorized only when a token was sent", async () => {
    let calls = 0;
    const client = createHttpClient({
      baseUrl: base,
      getToken: () => "expired",
      onUnauthorized: () => {
        calls += 1;
      },
    });
    await client.request({ method: "GET", path: "/bad-token", retries: 0 }).catch(() => undefined);
    await client
      .request({ method: "GET", path: "/bad-token", retries: 0, token: null })
      .catch(() => undefined);
    expect(calls).toBe(1);
  });

  it("stops when the caller aborts", async () => {
    const client = createHttpClient({ baseUrl: base });
    const ctrl = new AbortController();
    const p = client.request({ method: "GET", path: "/slow", signal: ctrl.signal });
    setTimeout(() => {
      ctrl.abort();
    }, 50);
    await expect(p).rejects.toMatchObject({ kind: "aborted" });
  });
});
