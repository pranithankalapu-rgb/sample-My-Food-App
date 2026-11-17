// Fails fast with a clear message when the stacks are not up.
export default async function setup(): Promise<void> {
  const targets = [
    ["real API", process.env.REAL_API_URL ?? "http://api:9595"],
    ["test API", process.env.TEST_API_URL ?? "http://api-t:9595"],
    ["perf API", process.env.PERF_API_URL ?? "http://api-perf:9595"],
  ];
  for (const [name, url] of targets) {
    try {
      const res = await fetch(`${url}/health`, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
      throw new Error(
        `${name} at ${url} is not reachable (${err instanceof Error ? err.message : String(err)}). Start the stacks with scripts/run-all-tests.sh.`,
        { cause: err },
      );
    }
  }
}
