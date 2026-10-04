import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { apiBaseUrl, getToken, setToken, type AuthUser } from "./auth";

export function AuthGate({ children }: { children: (user: AuthUser, logout: () => void) => ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checking, setChecking] = useState(true);
  const [mode, setMode] = useState<"login" | "register">("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const token = getToken();
    if (!token) { setChecking(false); return; }
    fetch(`${apiBaseUrl}/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (response) => {
        if (response.ok) setUser(((await response.json()) as { user?: AuthUser }).user ?? null);
        else setToken(null);
      })
      .catch(() => setError("Could not reach the server."))
      .finally(() => setChecking(false));
    const onExpired = () => { setToken(null); setUser(null); };
    window.addEventListener("mordheim:signed-out", onExpired);
    return () => window.removeEventListener("mordheim:signed-out", onExpired);
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      const response = await fetch(`${apiBaseUrl}/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Sign in failed.");
      setToken(result.token);
      setPassword("");
      setUser(result.user);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Sign in failed.");
    } finally {
      setBusy(false);
    }
  }

  function logout() {
    const token = getToken();
    if (token) void fetch(`${apiBaseUrl}/auth/logout`, { method: "POST", headers: { Authorization: `Bearer ${token}` } }).catch(() => undefined);
    setToken(null);
    setUser(null);
  }

  if (checking) return <div className="auth-screen"><p>Loading…</p></div>;
  if (user) return <>{children(user, logout)}</>;

  return (
    <div className="auth-screen">
      <form className="auth-card" onSubmit={submit}>
        <h1>MORDHEIM</h1>
        <p>{mode === "login" ? "Sign in to your roster ledger." : "Create an account."}</p>
        <label>Username<input autoFocus autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} /></label>
        <label>Password<input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} /></label>
        {error && <div className="api-error" role="alert">{error}</div>}
        <button className="primary-button" type="submit" disabled={busy || !username || !password}>{mode === "login" ? "Sign in" : "Register"}</button>
        <button className="outline-button" type="button" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}>
          {mode === "login" ? "Need an account? Register" : "Have an account? Sign in"}
        </button>
      </form>
    </div>
  );
}
