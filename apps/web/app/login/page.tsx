"use client";

import { useState } from "react";
import { Mail, Lock, Eye, EyeOff, Sun, Moon, Building2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

// Companies available for login — extend this list as needed
const AVAILABLE_COMPANIES = [
  { db: "DEMO_VK", label: "DEMO_VK" },
];

export default function LoginPage() {
  const { login, loginAsGuest } = useAuth();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [companydb, setCompanydb] = useState(AVAILABLE_COMPANIES[0].db);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  function toggleTheme(t: "dark" | "light") {
    setTheme(t);
    const el = document.documentElement;
    el.classList.add("theme-transitioning");
    el.classList.toggle("theme-light", t === "light");
    setTimeout(() => el.classList.remove("theme-transitioning"), 250);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim() || !password.trim()) return;
    setError(null);
    setSubmitting(true);

    const err = await login(username.trim(), password, companydb);
    if (err) {
      setError(err);
      setSubmitting(false);
    }
  }

  async function handleGuest(e: React.MouseEvent) {
    e.preventDefault();
    await loginAsGuest();
  }

  const canSubmit = username.trim().length > 0 && password.length > 0 && !submitting;

  return (
    <div className="login-page">
      <div className="theme-tog-fixed">
        <div className="theme-toggle">
          <button
            type="button"
            className={theme === "light" ? "active" : ""}
            onClick={() => toggleTheme("light")}
            title="Light"
          >
            <Sun className="ic" />
          </button>
          <button
            type="button"
            className={theme === "dark" ? "active" : ""}
            onClick={() => toggleTheme("dark")}
            title="Dark"
          >
            <Moon className="ic" />
          </button>
        </div>
      </div>

      <form className="login-card" onSubmit={handleSubmit}>
        <div className="login-hd">
          <div className="sb-logo">VK</div>
          <h1>Ingresar a VK Agents</h1>
        </div>

        {error && (
          <div className="rounded-lg border border-[var(--status-err)]/30 bg-[var(--status-err)]/10 px-3 py-2 text-[13px] text-[var(--status-err)]">
            {error}
          </div>
        )}

        {/* Company selector */}
        <div className="field">
          <label htmlFor="companydb">Empresa (CompanyDB)</label>
          <div className="field-wrap">
            <span className="lead-ic">
              <Building2 className="ic" />
            </span>
            {AVAILABLE_COMPANIES.length > 1 ? (
              <select
                id="companydb"
                className="with-ic"
                value={companydb}
                onChange={(e) => setCompanydb(e.target.value)}
              >
                {AVAILABLE_COMPANIES.map((c) => (
                  <option key={c.db} value={c.db}>
                    {c.label}
                  </option>
                ))}
              </select>
            ) : (
              <input
                id="companydb"
                type="text"
                className="with-ic"
                value={companydb}
                onChange={(e) => setCompanydb(e.target.value)}
              />
            )}
          </div>
        </div>

        <div className="field">
          <label htmlFor="username">Usuario SAP B1</label>
          <div className="field-wrap">
            <span className="lead-ic">
              <Mail className="ic" />
            </span>
            <input
              id="username"
              type="text"
              placeholder="manager"
              className="with-ic"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="pw">Contraseña</label>
          <div className="field-wrap">
            <span className="lead-ic">
              <Lock className="ic" />
            </span>
            <input
              id="pw"
              type={showPw ? "text" : "password"}
              placeholder="••••••••"
              className="with-ic"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
            <button
              type="button"
              className="trail-btn"
              onClick={() => setShowPw((s) => !s)}
              title={showPw ? "Ocultar" : "Mostrar"}
            >
              {showPw ? <EyeOff className="ic" /> : <Eye className="ic" />}
            </button>
          </div>
        </div>

        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          {submitting ? "Ingresando…" : "Ingresar"}
        </button>

        <button type="button" className="skip-link" onClick={handleGuest}>
          Saltar y continuar en modo demo
        </button>
      </form>
    </div>
  );
}
