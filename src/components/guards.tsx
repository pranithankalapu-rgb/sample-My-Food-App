import type { ReactNode } from "react";
import { Link, Navigate, useLocation } from "react-router-dom";
import { useSession } from "../auth/session";

export function RequireAuth({ children }: { children: ReactNode }) {
  const { session } = useSession();
  const location = useLocation();
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <>{children}</>;
}

export function RequireAdmin({ children }: { children: ReactNode }) {
  const { session, isAdmin } = useSession();
  const location = useLocation();
  if (!session) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (!isAdmin) {
    return (
      <section className="card narrow" role="alert" data-testid="admin-only">
        <h1>Admins only</h1>
        <p>This area needs an admin account. You are signed in as {session.user.email}.</p>
        <Link className="button" to="/lookup">
          Back to barcode lookup
        </Link>
      </section>
    );
  }
  return <>{children}</>;
}
