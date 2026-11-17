import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useSession } from "../auth/session";

const NAV: { to: string; label: string; admin?: boolean; auth?: boolean }[] = [
  { to: "/status", label: "Status" },
  { to: "/lookup", label: "Barcode lookup", auth: true },
  { to: "/search", label: "Browse & search", auth: true },
  { to: "/scan", label: "Label scan", auth: true },
  { to: "/profile", label: "Account & profile", auth: true },
  { to: "/admin", label: "Admin", admin: true },
  { to: "/explorer", label: "API Explorer" },
  { to: "/tests", label: "Test dashboard" },
];

export function Layout() {
  const { session, isAdmin, signOut } = useSession();
  const navigate = useNavigate();
  const items = NAV.filter((item) => (item.admin ? isAdmin : item.auth ? Boolean(session) : true));

  return (
    <div className="app">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          // the app uses hash routes: move focus instead of changing the hash
          e.preventDefault();
          document.getElementById("main-content")?.focus();
        }}
      >
        Skip to main content
      </a>
      <header className="header">
        <NavLink to="/lookup" className="brand">
          My Food App <small>API tester</small>
        </NavLink>
        <div className="account">
          {session ? (
            <>
              <span className="who" data-testid="current-user">
                {session.user.email}
              </span>
              {isAdmin && <span className="badge">admin</span>}
              <button
                type="button"
                className="link"
                onClick={() => {
                  signOut("You are logged out.");
                  void navigate("/login");
                }}
              >
                Log out
              </button>
            </>
          ) : (
            <NavLink to="/login" className="button">
              Log in
            </NavLink>
          )}
        </div>
      </header>
      <div className="layout">
        <aside className="sidebar">
          <nav className="sidenav" aria-label="Main">
            {items.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => (isActive ? "active" : "")}>
                {item.label}
              </NavLink>
            ))}
            {!session && (
              <NavLink to="/login" className={({ isActive }) => (isActive ? "active" : "")}>
                Log in / Sign up
              </NavLink>
            )}
          </nav>
        </aside>
        <main className="main" id="main-content" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
