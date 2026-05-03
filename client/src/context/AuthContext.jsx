import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiFetch, clearAuthToken, getAuthToken } from "../api/api";

const AuthContext = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [serverUnavailable, setServerUnavailable] = useState(false);

  useEffect(() => {
    if (!getAuthToken()) {
      setUser(null);
      setLoading(false);
      setServerUnavailable(false);
      return undefined;
    }

    let alive = true;
    let retryTimer = null;
    let retryAttempt = 0;

    async function loadMe({ background = false } = {}) {
      try {
        const data = await apiFetch("/api/auth/me", { method: "GET" });
        if (!alive) return;
        setUser(data.user || null);
        setServerUnavailable(false);
        retryAttempt = 0;
      } catch (err) {
        if (!alive) return;

        if (err?.status === 401) {
          clearAuthToken();
          setUser(null);
          setServerUnavailable(false);
          return;
        }

        setServerUnavailable(true);

        clearTimeout(retryTimer);
        const nextDelayMs = Math.min(30000, 2000 * 2 ** retryAttempt);
        retryAttempt += 1;
        retryTimer = setTimeout(() => {
          if (alive) loadMe({ background: true });
        }, nextDelayMs);
      } finally {
        if (alive && !background) setLoading(false);
      }
    }

    loadMe();
    return () => {
      alive = false;
      clearTimeout(retryTimer);
    };
  }, []);

  const logout = useCallback(() => {
    clearAuthToken();
    setUser(null);
    setServerUnavailable(false);
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      loading,
      serverUnavailable,
      logout
    }),
    [user, loading, serverUnavailable, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

