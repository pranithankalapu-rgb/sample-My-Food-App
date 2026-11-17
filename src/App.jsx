import React, { useCallback, useEffect, useState } from "react";
import { loadSession, saveSession, setUnauthorizedHandler } from "./api.js";
import AuthScreen from "./screens/AuthScreen.jsx";
import LookupScreen from "./screens/LookupScreen.jsx";
import ProductScreen from "./screens/ProductScreen.jsx";
import SearchScreen from "./screens/SearchScreen.jsx";
import LabelScanScreen from "./screens/LabelScanScreen.jsx";

// Minimal hash router: #/lookup, #/product/<code>, #/search?q=&page=, #/scan
function parseHash() {
  const raw = window.location.hash.replace(/^#/, "") || "/lookup";
  const [path, qs = ""] = raw.split("?");
  return { path, params: new URLSearchParams(qs) };
}

export function navigate(to) {
  window.location.hash = to;
}

export default function App() {
  const [session, setSession] = useState(loadSession);
  const [route, setRoute] = useState(parseHash);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const logout = useCallback((message) => {
    saveSession(null);
    setSession(null);
    setNotice(message || null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => logout("Your session has ended. Please log in again."));
  }, [logout]);

  const onLoggedIn = (newSession) => {
    saveSession(newSession);
    setSession(newSession);
    setNotice(null);
    if (route.path === "/" || route.path === "/login") navigate("/lookup");
  };

  if (!session) {
    return (
      <Shell>
        {notice && <p className="notice" role="status">{notice}</p>}
        <AuthScreen onLoggedIn={onLoggedIn} />
      </Shell>
    );
  }

  const token = session.token;
  let screen;
  if (route.path.startsWith("/product/")) {
    const code = decodeURIComponent(route.path.slice("/product/".length));
    screen = <ProductScreen key={code} token={token} code={code} />;
  } else if (route.path === "/search") {
    screen = <SearchScreen token={token} params={route.params} />;
  } else if (route.path === "/scan") {
    screen = <LabelScanScreen token={token} />;
  } else {
    screen = <LookupScreen />;
  }

  return (
    <Shell
      nav={
        <nav className="nav" aria-label="Main">
          <a href="#/lookup" className={route.path === "/lookup" ? "active" : ""}>Barcode lookup</a>
          <a href="#/search" className={route.path === "/search" ? "active" : ""}>Browse &amp; search</a>
          <a href="#/scan" className={route.path === "/scan" ? "active" : ""}>Label scan</a>
          <span className="spacer" />
          <span className="who" data-testid="current-user">{session.user?.email}</span>
          <button type="button" className="link" onClick={() => logout()}>Log out</button>
        </nav>
      }
    >
      {screen}
    </Shell>
  );
}

function Shell({ nav, children }) {
  return (
    <div className="app">
      <header className="header">
        <a href="#/lookup" className="brand">My Food App <small>sample frontend</small></a>
        {nav}
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
