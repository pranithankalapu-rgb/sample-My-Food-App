import { useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useSession } from "../auth/session";
import { useToast } from "../components/Toasts";
import { ErrorPanel, usePageTitle } from "../components/states";

type Tab = "login" | "signup" | "admin" | "social" | "verify" | "reset";
const TABS: { id: Tab; label: string }[] = [
  { id: "login", label: "Log in" },
  { id: "signup", label: "Sign up" },
  { id: "admin", label: "Admin (CMS) login" },
  { id: "social", label: "Social sign-in" },
  { id: "verify", label: "Verify email" },
  { id: "reset", label: "Reset password" },
];

export function LoginPage() {
  usePageTitle("Log in");
  const [tab, setTab] = useState<Tab>("login");
  return (
    <section className="card narrow">
      <h1>Account access</h1>
      <div className="tabs wrap" role="tablist" aria-label="Account actions">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => {
              setTab(t.id);
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "login" && <PasswordLogin kind="user" />}
        {tab === "signup" && <Signup />}
        {tab === "admin" && <PasswordLogin kind="cms" />}
        {tab === "social" && <SocialSignIn />}
        {tab === "verify" && <VerifyEmail />}
        {tab === "reset" && <ResetPassword />}
      </div>
    </section>
  );
}

function useFinishLogin() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  return (token: string, user: Parameters<typeof signIn>[0]["user"], via: "user" | "cms") => {
    signIn({ token, user, via });
    toast.show({ kind: "success", message: `Signed in as ${user.email}.` });
    const from = (location.state as { from?: string } | null)?.from;
    void navigate(from && from !== "/login" ? from : via === "cms" ? "/admin" : "/lookup", { replace: true });
  };
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label>
      {label}
      {children}
    </label>
  );
}

function PasswordLogin({ kind }: { kind: "user" | "cms" }) {
  const finish = useFinishLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const m = useMutation({
    mutationFn: () =>
      kind === "cms" ? api.admin.cmsLogin({ email, password }) : api.auth.login({ email, password }),
    onSuccess: (res) => {
      finish(res.data.token, res.data.user, kind);
    },
  });
  return (
    <form
      aria-label={kind === "cms" ? "Admin login" : "Log in"}
      onSubmit={(e) => {
        e.preventDefault();
        m.mutate();
      }}
    >
      {kind === "cms" && <p className="muted">For admins: a short-lived CMS session (POST /cms/login).</p>}
      <Field label="Email">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
          }}
        />
      </Field>
      <Field label="Password">
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
          }}
        />
      </Field>
      {m.isError && <ErrorPanel error={m.error} title="Could not sign in" testId="login-error" />}
      <button type="submit" className="primary" disabled={m.isPending}>
        {m.isPending ? "Signing in…" : kind === "cms" ? "Log in as admin" : "Log in"}
      </button>
    </form>
  );
}

function Signup() {
  const finish = useFinishLogin();
  const [f, setF] = useState({ first_name: "", last_name: "", email: "", password: "", repassword: "" });
  const [localError, setLocalError] = useState<string | null>(null);
  const set = (key: keyof typeof f) => (e: { target: { value: string } }) => {
    setF((v) => ({ ...v, [key]: e.target.value }));
  };
  const m = useMutation({
    mutationFn: async () => {
      await api.auth.signup(f);
      return api.auth.login({ email: f.email, password: f.password });
    },
    onSuccess: (res) => {
      finish(res.data.token, res.data.user, "user");
    },
  });
  const submit = (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const problem =
      f.password.length < 8
        ? "The password needs at least 8 characters."
        : f.password !== f.repassword
          ? "The two passwords do not match."
          : null;
    setLocalError(problem);
    if (!problem) m.mutate();
  };
  return (
    <form aria-label="Sign up" onSubmit={submit} noValidate>
      <div className="row2">
        <Field label="First name">
          <input required autoComplete="given-name" value={f.first_name} onChange={set("first_name")} />
        </Field>
        <Field label="Last name">
          <input required autoComplete="family-name" value={f.last_name} onChange={set("last_name")} />
        </Field>
      </div>
      <Field label="Email">
        <input type="email" required autoComplete="email" value={f.email} onChange={set("email")} />
      </Field>
      <Field label="Password (at least 8 characters)">
        <input
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          value={f.password}
          onChange={set("password")}
        />
      </Field>
      <Field label="Repeat password">
        <input
          type="password"
          required
          autoComplete="new-password"
          value={f.repassword}
          onChange={set("repassword")}
        />
      </Field>
      {localError && (
        <p className="error" role="alert" data-testid="signup-local-error">
          {localError}
        </p>
      )}
      {m.isError && <ErrorPanel error={m.error} title="Could not create the account" testId="signup-error" />}
      <button type="submit" className="primary" disabled={m.isPending}>
        {m.isPending ? "Creating…" : "Create account"}
      </button>
    </form>
  );
}

function SocialSignIn() {
  const finish = useFinishLogin();
  const [token, setToken] = useState("");
  const [provider, setProvider] = useState("google");
  const m = useMutation({
    mutationFn: () => api.auth.socialSignIn({ token, provider }),
    onSuccess: (res) => {
      finish(res.data.token, res.data.user, "user");
    },
  });
  return (
    <form
      aria-label="Social sign-in"
      onSubmit={(e) => {
        e.preventDefault();
        m.mutate();
      }}
    >
      <p className="muted">
        Paste a Firebase ID token from the mobile app's Google, Apple or Facebook sign-in. The API verifies it
        with Firebase.
      </p>
      <Field label="Provider">
        <select
          value={provider}
          onChange={(e) => {
            setProvider(e.target.value);
          }}
        >
          <option value="google">Google</option>
          <option value="apple">Apple</option>
          <option value="facebook">Facebook</option>
        </select>
      </Field>
      <Field label="Firebase ID token">
        <textarea
          required
          rows={4}
          value={token}
          onChange={(e) => {
            setToken(e.target.value);
          }}
        />
      </Field>
      {m.isError && <ErrorPanel error={m.error} title="Sign-in failed" testId="social-error" />}
      <button type="submit" className="primary" disabled={m.isPending}>
        {m.isPending ? "Checking…" : "Sign in"}
      </button>
    </form>
  );
}

function CodeFlow({
  title,
  sendLabel,
  send,
  confirmFields,
  confirm,
  testId,
}: {
  title: string;
  sendLabel: string;
  send: (email: string) => Promise<unknown>;
  confirmFields: "code" | "code+password";
  confirm: (email: string, code: string, password: string) => Promise<unknown>;
  testId: string;
}) {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const sendM = useMutation({
    mutationFn: () => send(email),
    onSuccess: () => {
      toast.show({ kind: "success", message: "If the address has an account, a code is on its way." });
    },
  });
  const confirmM = useMutation({
    mutationFn: () => confirm(email, code, password),
    onSuccess: () => {
      toast.show({ kind: "success", message: `${title}: done.` });
    },
  });
  return (
    <div className="stack" data-testid={testId}>
      <form
        aria-label={`${title}: send code`}
        onSubmit={(e) => {
          e.preventDefault();
          sendM.mutate();
        }}
      >
        <Field label="Email">
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
          />
        </Field>
        {sendM.isSuccess && (
          <p className="notice" role="status" data-testid={`${testId}-sent`}>
            Code requested. Check the inbox (the API gives the same answer for unknown addresses).
          </p>
        )}
        {sendM.isError && <ErrorPanel error={sendM.error} title="Could not send the code" />}
        <button type="submit" disabled={sendM.isPending}>
          {sendM.isPending ? "Sending…" : sendLabel}
        </button>
      </form>
      <form
        aria-label={`${title}: confirm`}
        onSubmit={(e) => {
          e.preventDefault();
          confirmM.mutate();
        }}
      >
        <Field label="6-digit code">
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            required
            maxLength={16}
            value={code}
            onChange={(e) => {
              setCode(e.target.value.trim());
            }}
          />
        </Field>
        {confirmFields === "code+password" && (
          <Field label="New password (at least 8 characters)">
            <input
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
              }}
            />
          </Field>
        )}
        {confirmM.isSuccess && (
          <p className="notice" role="status" data-testid={`${testId}-done`}>
            {title}: done.
          </p>
        )}
        {confirmM.isError && (
          <ErrorPanel error={confirmM.error} title="The code was not accepted" testId={`${testId}-error`} />
        )}
        <button type="submit" className="primary" disabled={confirmM.isPending || !email}>
          {confirmM.isPending ? "Checking…" : "Confirm"}
        </button>
      </form>
    </div>
  );
}

function VerifyEmail() {
  return (
    <CodeFlow
      title="Verify email"
      sendLabel="Email me a verification code"
      send={(email) => api.auth.sendVerificationCode({ email })}
      confirmFields="code"
      confirm={(email, code) => api.auth.verify({ email, code })}
      testId="verify-flow"
    />
  );
}

function ResetPassword() {
  return (
    <CodeFlow
      title="Reset password"
      sendLabel="Email me a reset code"
      send={(email) => api.auth.forgotPasswordCode({ email })}
      confirmFields="code+password"
      confirm={(email, code, password) => api.auth.changePassword({ email, code, new_password: password })}
      testId="reset-flow"
    />
  );
}
