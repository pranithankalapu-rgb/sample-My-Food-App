import React, { useState } from "react";
import { api } from "../api.js";

export default function AuthScreen({ onLoggedIn }) {
  const [mode, setMode] = useState("login");
  const [fields, setFields] = useState({ first_name: "", last_name: "", email: "", password: "", repassword: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  const set = (name) => (e) => setFields((f) => ({ ...f, [name]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    if (mode === "signup" && fields.password !== fields.repassword) {
      setError("The two passwords do not match.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        await api.signup(fields);
      }
      const res = await api.login(fields.email, fields.password);
      if (!res?.token) throw new Error("The API did not return a token.");
      onLoggedIn({ token: res.token, user: res.user });
    } catch (err) {
      setError(err.message || "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="card narrow">
      <div className="tabs" role="tablist">
        <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => { setMode("login"); setError(null); }}>
          Log in
        </button>
        <button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => { setMode("signup"); setError(null); }}>
          Sign up
        </button>
      </div>

      <form onSubmit={submit} aria-label={mode === "login" ? "Log in" : "Sign up"}>
        {mode === "signup" && (
          <div className="row2">
            <label>First name<input required value={fields.first_name} onChange={set("first_name")} autoComplete="given-name" /></label>
            <label>Last name<input required value={fields.last_name} onChange={set("last_name")} autoComplete="family-name" /></label>
          </div>
        )}
        <label>Email<input required type="email" value={fields.email} onChange={set("email")} autoComplete="email" /></label>
        <label>Password
          <input required type="password" minLength={mode === "signup" ? 8 : undefined} value={fields.password}
            onChange={set("password")} autoComplete={mode === "signup" ? "new-password" : "current-password"} />
        </label>
        {mode === "signup" && (
          <label>Repeat password
            <input required type="password" value={fields.repassword} onChange={set("repassword")} autoComplete="new-password" />
          </label>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <button type="submit" className="primary" disabled={busy}>
          {busy ? "Please wait…" : mode === "login" ? "Log in" : "Create account"}
        </button>
      </form>
    </section>
  );
}
