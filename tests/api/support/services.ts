// Test-only services of the apitest stack: the mail inbox and the fault
// injection proxies. These are the only deliberate "outages" in the suite.
import { env } from "./env";

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (!res.ok) throw new Error(`${init?.method ?? "GET"} ${url} -> HTTP ${res.status}: ${await res.text()}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

// ---------------------------------------------------------------- mailpit
interface MailSummary {
  ID: string;
  Subject: string;
  To: { Address: string }[];
  Created: string;
}

/** Waits for the newest email to `address` and returns its 6-digit code. */
export async function codeFromInbox(address: string, after: Date, timeoutMs = 20_000): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const list = await json<{ messages: MailSummary[] | null }>(
      `${env.mailpit}/api/v1/search?query=${encodeURIComponent(`to:"${address}"`)}`,
    );
    const fresh = (list.messages ?? []).filter(
      (m) => new Date(m.Created) >= new Date(after.getTime() - 2000),
    );
    const newest = fresh[0];
    if (newest) {
      const msg = await json<{ Text: string; HTML: string }>(`${env.mailpit}/api/v1/message/${newest.ID}`);
      const code = /\b(\d{6})\b/.exec(`${msg.Text}\n${msg.HTML.replace(/<[^>]+>/g, " ")}`)?.[1];
      if (code) return code;
      throw new Error(`email "${newest.Subject}" to ${address} has no 6-digit code`);
    }
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`no email to ${address} within ${timeoutMs} ms`);
}

export async function inboxCount(address: string): Promise<number> {
  const list = await json<{ messages_count?: number; messages: unknown[] | null }>(
    `${env.mailpit}/api/v1/search?query=${encodeURIComponent(`to:"${address}"`)}`,
  );
  return (list.messages ?? []).length;
}

// ---------------------------------------------------------------- toxiproxy
type Proxy = "off" | "openai";
const base = (proxy: Proxy) => (proxy === "off" ? env.toxOff : env.toxAi);

export const faults = {
  async reset(proxy: Proxy): Promise<void> {
    await json(`${base(proxy)}/reset`, { method: "POST" });
  },
  async down(proxy: Proxy): Promise<void> {
    await json(`${base(proxy)}/proxies/${proxy}`, {
      method: "POST",
      body: JSON.stringify({ enabled: false }),
    });
  },
  async up(proxy: Proxy): Promise<void> {
    await json(`${base(proxy)}/proxies/${proxy}`, {
      method: "POST",
      body: JSON.stringify({ enabled: true }),
    });
  },
  /** adds latency to every response chunk from the service */
  async slow(proxy: Proxy, ms: number): Promise<void> {
    await json(`${base(proxy)}/proxies/${proxy}/toxics`, {
      method: "POST",
      body: JSON.stringify({
        name: "slow",
        type: "latency",
        stream: "downstream",
        attributes: { latency: ms, jitter: 0 },
      }),
    });
  },
  /** accepts the connection and never answers (blackhole) */
  async blackhole(proxy: Proxy): Promise<void> {
    await json(`${base(proxy)}/proxies/${proxy}/toxics`, {
      method: "POST",
      body: JSON.stringify({
        name: "blackhole",
        type: "timeout",
        stream: "upstream",
        attributes: { timeout: 0 },
      }),
    });
  },
};
