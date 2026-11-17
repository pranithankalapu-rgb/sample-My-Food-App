import { createApi, type Api } from "../../../src/api/endpoints";
import { createHttpClient, type HttpResponse } from "../../../src/api/http";
import { ApiError } from "../../../src/api/errors";
import type { LoginResponse } from "../../../src/api/types";
import { captureExchange } from "./recorder";
import { credentials, env, type Account } from "./env";

/** A typed client for one API instance; every exchange is captured as evidence. */
export function client(baseUrl: string, token: string | null = null, timeoutMs = 60_000): Api {
  return createApi(
    createHttpClient({
      baseUrl,
      getToken: () => token,
      onExchange: captureExchange,
      defaultTimeoutMs: timeoutMs,
    }),
  );
}

/** Resolves with the ApiError of a call that must fail (fails the test if it succeeds). */
export async function failure(promise: Promise<HttpResponse<unknown>>): Promise<ApiError> {
  try {
    const res = await promise;
    throw new Error(`expected an error, got HTTP ${res.status}: ${JSON.stringify(res.data).slice(0, 400)}`);
  } catch (err) {
    if (err instanceof ApiError) return err;
    throw err;
  }
}

export interface Session {
  id: string;
  email: string;
  password: string;
  token: string;
  api: Api;
  login: LoginResponse;
}

export async function login(baseUrl: string, account: Account, cms = false): Promise<Session> {
  const anon = client(baseUrl);
  const res = cms ? await anon.admin.cmsLogin(account) : await anon.auth.login(account);
  return {
    id: res.data.user.id,
    email: account.email,
    password: account.password,
    token: res.data.token,
    api: client(baseUrl, res.data.token),
    login: res.data,
  };
}

let seq = 0;
/**
 * Signs up a dedicated user (email under example.test) and logs it in.
 * On the test stack the account is created through api-perf (same database,
 * no rate limit), so test setup never uses up api-t's sign-up limit of 20 an
 * hour per network: that limit is itself under test. Sign-up behaviour is
 * tested against api-t directly in 02-auth.
 */
export async function newUser(baseUrl: string, label: string): Promise<Session> {
  seq += 1;
  const email = `e2e-${label}-${env.runId}-${seq}@example.test`;
  const password = `E2e-${env.runId}-pw!`;
  const signupBase = baseUrl === env.testApi ? env.perfApi : baseUrl;
  await client(signupBase).auth.signup({
    first_name: "Eetwoe",
    last_name: "Tester",
    email,
    password,
    repassword: password,
  });
  return login(baseUrl, { email, password });
}

/** Deletes a test user through the API; ignores users that are already gone. */
export async function removeUser(session: Session | undefined): Promise<void> {
  if (!session) return;
  try {
    await session.api.user.remove(session.id);
  } catch (err) {
    if (!(err instanceof ApiError) || ![401, 404].includes(err.status)) throw err;
  }
}

export const accounts = () => credentials();
export const realAdmin = () => login(env.realApi, credentials().real.admin);
export const realUser = () => login(env.realApi, credentials().real.user);
export const testAdmin = () => login(env.testApi, credentials().test.admin);
