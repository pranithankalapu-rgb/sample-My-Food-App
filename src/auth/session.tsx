import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { onUnauthorized, setApiToken, type PublicUser } from "../api";
import { useToast } from "../components/Toasts";

// The key is kept from the first version of the app, so existing sessions survive.
const STORAGE_KEY = "mfa-sample-session";

export interface Session {
  token: string;
  user: PublicUser;
  /** "cms" when signed in through /cms/login (short-lived admin token) */
  via?: "user" | "cms";
}

interface SessionContextValue {
  session: Session | null;
  isAdmin: boolean;
  signIn: (session: Session, options?: { remember?: boolean }) => void;
  signOut: (message?: string) => void;
  updateUser: (patch: Partial<PublicUser>) => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

// "Remember me" keeps the session in localStorage (survives a browser restart);
// without it the session lives in sessionStorage (this tab only).
function parse(raw: string | null): Session | null {
  if (!raw) return null;
  const parsed = JSON.parse(raw) as Partial<Session>;
  return typeof parsed.token === "string" && parsed.user ? (parsed as Session) : null;
}

function load(): Session | null {
  try {
    return parse(localStorage.getItem(STORAGE_KEY)) ?? parse(sessionStorage.getItem(STORAGE_KEY));
  } catch {
    return null;
  }
}

function isRemembered(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

function save(session: Session | null, remember = true): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(STORAGE_KEY);
    if (session) (remember ? localStorage : sessionStorage).setItem(STORAGE_KEY, JSON.stringify(session));
  } catch {
    // storage blocked (private mode): the session lives in memory only
  }
}

export function SessionProvider({ children }: { children: ReactNode }) {
  const toast = useToast();
  const [session, setSession] = useState<Session | null>(() => {
    const s = load();
    setApiToken(s?.token ?? null);
    return s;
  });

  const signIn = useCallback((next: Session, options?: { remember?: boolean }) => {
    setApiToken(next.token);
    save(next, options?.remember ?? true);
    setSession(next);
  }, []);

  const signOut = useCallback(
    (message?: string) => {
      setApiToken(null);
      save(null);
      setSession(null);
      if (message) toast.show({ kind: "info", message });
    },
    [toast],
  );

  const updateUser = useCallback((patch: Partial<PublicUser>) => {
    setSession((current) => {
      if (!current) return current;
      const next = { ...current, user: { ...current.user, ...patch } };
      save(next, isRemembered());
      return next;
    });
  }, []);

  useEffect(
    () =>
      onUnauthorized(() => {
        signOut("Your session has ended. Please log in again.");
      }),
    [signOut],
  );

  const value = useMemo<SessionContextValue>(
    () => ({
      session,
      isAdmin: (session?.user.role ?? "").toLowerCase() === "admin",
      signIn,
      signOut,
      updateUser,
    }),
    [session, signIn, signOut, updateUser],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}
