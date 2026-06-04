"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

export type AuthUser =
  | { type: "sap"; username: string }
  | { type: "guest" }
  | null;

type AuthContextValue = {
  user: AuthUser;
  loading: boolean;
  login: (username: string, password: string, companydb?: string) => Promise<string | null>;
  loginAsGuest: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Hydrate user from cookie on mount
  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => setUser(data.user ?? null))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(
    async (username: string, password: string, companydb?: string): Promise<string | null> => {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password, ...(companydb ? { companydb } : {}) }),
      });
      const data = await res.json();

      if (!res.ok) {
        return data.error || "Error de autenticacion";
      }

      setUser(data.user);
      router.push("/chat");
      return null;
    },
    [router],
  );

  const loginAsGuest = useCallback(async () => {
    await fetch("/api/auth/guest", { method: "POST" });
    setUser({ type: "guest" });
    router.push("/chat");
  }, [router]);

  const logout = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    router.push("/login");
  }, [router]);

  return (
    <AuthContext.Provider value={{ user, loading, login, loginAsGuest, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
