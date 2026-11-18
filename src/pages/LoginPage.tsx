import { useState, type ReactNode } from "react";
import { useMutation } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { api } from "../api";
import { useSession } from "../auth/session";
import { useToast } from "../components/Toasts";
import { ErrorPanel, usePageTitle } from "../components/states";

type View = "login" | "signup" | "admin" | "social" | "verify" | "reset";
const VIEW_TITLES: Record<Exclude<View, "login">, string> = {
  signup: "Create your account",
  admin: "Admin (CMS) login",
  social: "Continue with Google",
  verify: "Verify your email",
  reset: "Reset your password",
};
// secondary flows, linked at the bottom of the card
const MORE: { id: View; label: string }[] = [
  { id: "admin", label: "Admin login" },
  { id: "verify", label: "Verify email" },
  { id: "reset", label: "Reset password" },
];

export function LoginPage() {
  usePageTitle("Log in");
  const [view, setView] = useState<View>("login");
  return (
    <div className="auth-screen">
      <main className="auth-card" aria-labelledby="auth-brand">
        <BrandMark />
        {view === "login" ? (
          <MainLogin onNavigate={setView} />
        ) : (
          <div className="auth-view">
            <h2>{VIEW_TITLES[view]}</h2>
            {view === "signup" && <Signup />}
            {view === "admin" && <PasswordLogin kind="cms" />}
            {view === "social" && <SocialSignIn />}
            {view === "verify" && <VerifyEmail />}
            {view === "reset" && <ResetPassword />}
            <button
              type="button"
              className="auth-link auth-back"
              onClick={() => {
                setView("login");
              }}
            >
              <ArrowIcon flip /> Back to log in
            </button>
          </div>
        )}
        <nav className="auth-more" aria-label="Other account options">
          {MORE.filter((m) => m.id !== view).map((m) => (
            <button
              key={m.id}
              type="button"
              className="auth-link"
              onClick={() => {
                setView(m.id);
              }}
            >
              {m.label}
            </button>
          ))}
          <Link to="/status" className="auth-link">
            Service status
          </Link>
        </nav>
      </main>
    </div>
  );
}

function BrandMark() {
  return (
    <div className="auth-brand">
      <svg className="auth-logo" viewBox="0 0 72 60" aria-hidden="true">
        <path d="M40 15c0-8 6-13 14-13 0 8-6 13-14 13z" fill="#3fa535" />
        <path d="M40 15c-1-6-5-9-11-9 0 6 4 10 11 9z" fill="#6cc04a" />
        <path
          d="M3 10h9l7 28h32l7-22H15"
          fill="none"
          stroke="#f37021"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path d="M18 23h36M21 31h30" stroke="#f37021" strokeWidth="4" strokeLinecap="round" />
        <circle cx="24" cy="50" r="5" fill="none" stroke="#3fa535" strokeWidth="4" />
        <circle cx="47" cy="50" r="5" fill="none" stroke="#3fa535" strokeWidth="4" />
      </svg>
      <div>
        <h1 id="auth-brand" className="auth-title">
          <span className="auth-title-my">My</span> <span className="auth-title-food">Food App</span>
        </h1>
        <p className="auth-tagline">Scan • Know • Choose Better</p>
      </div>
    </div>
  );
}

function MainLogin({ onNavigate }: { onNavigate: (view: View) => void }) {
  const finish = useFinishLogin();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const m = useMutation({
    mutationFn: () => api.auth.login({ email, password }),
    onSuccess: (res) => {
      finish(res.data.token, res.data.user, "user", remember);
    },
  });
  return (
    <>
      <form
        className="auth-form"
        aria-label="Log in"
        onSubmit={(e) => {
          e.preventDefault();
          m.mutate();
        }}
      >
        <label className="auth-input">
          <span className="sr-only">Email</span>
          <MailIcon />
          <input
            type="email"
            required
            autoComplete="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
            }}
          />
        </label>
        <div className="auth-input">
          <label htmlFor="login-password" className="sr-only">
            Password
          </label>
          <LockIcon />
          <input
            id="login-password"
            type={showPassword ? "text" : "password"}
            required
            autoComplete="current-password"
            placeholder="Password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
            }}
          />
          <button
            type="button"
            className="auth-eye"
            aria-label={showPassword ? "Hide the typed characters" : "Show the typed characters"}
            aria-pressed={showPassword}
            aria-controls="login-password"
            onClick={() => {
              setShowPassword((v) => !v);
            }}
          >
            <EyeIcon open={showPassword} />
          </button>
        </div>
        <div className="auth-row">
          <label className="auth-check">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => {
                setRemember(e.target.checked);
              }}
            />
            Remember me
          </label>
          <button
            type="button"
            className="auth-link"
            onClick={() => {
              onNavigate("reset");
            }}
          >
            Forgot password?
          </button>
        </div>
        {m.isError && <ErrorPanel error={m.error} title="Could not sign in" testId="login-error" />}
        <button type="submit" className="auth-primary" disabled={m.isPending}>
          {m.isPending ? "Signing in…" : "Log in"}
          {!m.isPending && <ArrowIcon />}
        </button>
      </form>
      <div className="auth-divider" role="separator">
        <span>or</span>
      </div>
      <button
        type="button"
        className="auth-google"
        onClick={() => {
          onNavigate("social");
        }}
      >
        <GoogleIcon />
        Continue with Google
      </button>
      <p className="auth-switch">
        Don’t have an account?{" "}
        <button
          type="button"
          className="auth-link strong"
          onClick={() => {
            onNavigate("signup");
          }}
        >
          Sign up
        </button>
      </p>
    </>
  );
}

const iconProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true,
  className: "auth-icon",
};

function MailIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg {...iconProps}>
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
      <circle cx="12" cy="16" r="1.2" fill="currentColor" />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  return (
    <svg {...iconProps}>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z" />
      <circle cx="12" cy="12" r="3" />
      {!open && <path d="M4 20 20 4" />}
    </svg>
  );
}

function ArrowIcon({ flip = false }: { flip?: boolean }) {
  return (
    <svg {...iconProps} className={flip ? "auth-icon flip" : "auth-icon"}>
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="auth-icon" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}

function useFinishLogin() {
  const { signIn } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  return (token: string, user: Parameters<typeof signIn>[0]["user"], via: "user" | "cms", remember = true) => {
    signIn({ token, user, via }, { remember });
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
