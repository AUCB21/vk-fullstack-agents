"use client";

import { useState } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ChevronDown,
  Sun,
  Moon,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

export default function LoginPage() {
  const { login, loginAsGuest } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [sapOpen, setSapOpen] = useState(false);
  const [sapHost, setSapHost] = useState("");
  const [sapCompany, setSapCompany] = useState("");
  const [sapUser, setSapUser] = useState("");
  const [sapPass, setSapPass] = useState("");

  const [theme, setTheme] = useState<"dark" | "light">("dark");

  function toggleTheme(t: "dark" | "light") {
    setTheme(t);
    document.documentElement.classList.toggle("theme-light", t === "light");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setError(null);
    setSubmitting(true);

    const loginUser = sapUser || email;
    const loginPass = sapPass || password;

    const err = await login(loginUser, loginPass);
    if (err) {
      setError(err);
      setSubmitting(false);
    }
  }

  async function handleGuest(e: React.MouseEvent) {
    e.preventDefault();
    await loginAsGuest();
  }

  const canSubmit = email.trim().length > 0 && !submitting;

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

        <div className="field">
          <label htmlFor="email">Usuario</label>
          <div className="field-wrap">
            <span className="lead-ic">
              <Mail className="ic" />
            </span>
            <input
              id="email"
              type="text"
              placeholder="manager"
              className="with-ic"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="username"
              autoFocus
            />
          </div>
        </div>

        <div className="field">
          <label htmlFor="pw">Contrasena</label>
          <div className="field-wrap">
            <span className="lead-ic">
              <Lock className="ic" />
            </span>
            <input
              id="pw"
              type={showPw ? "text" : "password"}
              placeholder="&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;&#x2022;"
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

        <button
          type="button"
          className={"sap-toggle" + (sapOpen ? " open" : "")}
          onClick={() => setSapOpen((o) => !o)}
        >
          <ChevronDown className="chev" />
          SAP B1 Service Layer
          <span className="opt">Opcional</span>
        </button>

        {sapOpen && (
          <div className="sap-body">
            <div className="field-row">
              <div className="field">
                <input
                  type="text"
                  placeholder="Host : puerto"
                  value={sapHost}
                  onChange={(e) => setSapHost(e.target.value)}
                />
              </div>
              <div className="field">
                <input
                  type="text"
                  placeholder="CompanyDB"
                  value={sapCompany}
                  onChange={(e) => setSapCompany(e.target.value)}
                />
              </div>
            </div>
            <div className="field-row">
              <div className="field">
                <input
                  type="text"
                  placeholder="B1 usuario"
                  value={sapUser}
                  onChange={(e) => setSapUser(e.target.value)}
                />
              </div>
              <div className="field">
                <input
                  type="password"
                  placeholder="B1 contrasena"
                  value={sapPass}
                  onChange={(e) => setSapPass(e.target.value)}
                />
              </div>
            </div>
          </div>
        )}

        <button type="submit" className="btn-primary" disabled={!canSubmit}>
          {submitting ? "Ingresando\u2026" : "Ingresar"}
        </button>

        <button type="button" className="skip-link" onClick={handleGuest}>
          Saltar y continuar en modo demo
        </button>
      </form>
    </div>
  );
}
