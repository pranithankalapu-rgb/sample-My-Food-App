import fs from "node:fs";
import path from "node:path";

// Where everything is, as seen from the tools container (see docker-compose.yml).
export const env = {
  /** the real stack's API (read-only checks and dedicated test users only) */
  realApi: process.env.REAL_API_URL ?? "http://api:9595",
  /** test-only API on a throwaway copy of the database (destructive tests, fault injection) */
  testApi: process.env.TEST_API_URL ?? "http://api-t:9595",
  /** same as testApi with RATE_LIMIT=off, for speed sampling */
  perfApi: process.env.PERF_API_URL ?? "http://api-perf:9595",
  mailpit: process.env.MAILPIT_URL ?? "http://mailpit:8025",
  toxOff: process.env.TOX_OFF_URL ?? "http://tox-off:8474",
  toxAi: process.env.TOX_AI_URL ?? "http://tox-ai:8474",
  runDir: process.env.RUN_DIR ?? ".e2e-run",
  rawDir: process.env.RAW_RESULTS_DIR ?? "test-results/raw",
  runId: process.env.RUN_ID ?? `local${Date.now().toString(36)}`,
};

export interface Account {
  email: string;
  password: string;
}

export interface Credentials {
  real: { user: Account; admin: Account };
  test: { user: Account; admin: Account };
}

/** Admin accounts are prepared by scripts/run-all-tests.sh (one-row role update). */
export function credentials(): Credentials {
  const file = path.join(env.runDir, "creds.json");
  if (!fs.existsSync(file))
    throw new Error(`${file} is missing: run the API tests through scripts/run-all-tests.sh`);
  return JSON.parse(fs.readFileSync(file, "utf8")) as Credentials;
}

/**
 * Real barcodes from Open Food Facts (one search per run by run-all-tests.sh;
 * the search API allows only 10 calls a minute).
 */
export function offCandidates(): string[] {
  const file = path.join(env.runDir, "off-candidates.json");
  if (!fs.existsSync(file))
    throw new Error(`${file} is missing: run the tests through scripts/run-all-tests.sh`);
  return JSON.parse(fs.readFileSync(file, "utf8")) as string[];
}

export function writeRaw(name: string, data: unknown): void {
  fs.mkdirSync(env.rawDir, { recursive: true });
  fs.writeFileSync(path.join(env.rawDir, name), JSON.stringify(data, null, 2));
}
