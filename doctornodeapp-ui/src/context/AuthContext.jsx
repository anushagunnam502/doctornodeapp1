import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem("token") || "");
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem("user") || "null"); }
    catch { return null; }
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // keep localStorage in sync
  useEffect(() => {
    if (token) localStorage.setItem("token", token);
    else localStorage.removeItem("token");
  }, [token]);
  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  async function register({ name, email, password }) {
    setLoading(true); setError("");
    try {
      const { data } = await api.post("/api/auth/register", { name, email, password });
      // optional: auto-login right after register? we’ll just return user here.
      return data.user;
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Register failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }

  async function login({ email, password }) {
    setLoading(true); setError("");
    try {
      const { data } = await api.post("/api/auth/login", { email, password });
      setToken(data.token);
      setUser(data.user);
      return data.user;
    } catch (e) {
      setError(e?.response?.data?.error || e.message || "Login failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    setToken("");
    setUser(null);
  }

  const value = useMemo(() => ({
    token, user, loading, error,
    register, login, logout,
    isAuthed: !!token,
  }), [token, user, loading, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
