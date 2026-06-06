import { createContext, useContext, useEffect, useMemo, useState } from "react";
import api, { clearStoredSession } from "../services/api";

const AuthContext = createContext(null);
const SESSION_EXPIRED_EVENT = "visiondesk:session-expired";

const getTokenExpiry = (token) => {
  try {
    const base64Url = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const encodedPayload = base64Url.padEnd(base64Url.length + ((4 - base64Url.length % 4) % 4), "=");
    const payload = JSON.parse(atob(encodedPayload));
    return payload.exp ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
};

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => {
    const storedToken = localStorage.getItem("visondesk_token");
    const expiresAt = storedToken ? getTokenExpiry(storedToken) : null;
    if (expiresAt && expiresAt <= Date.now()) {
      clearStoredSession();
      return null;
    }
    return storedToken;
  });
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem("visondesk_user");
    return stored ? JSON.parse(stored) : null;
  });

  const login = async (loginId, password) => {
    const { data } = await api.post("/auth/login", { login_id: loginId, password });
    localStorage.setItem("visondesk_token", data.token);
    localStorage.setItem("visondesk_user", JSON.stringify(data.user));
    setToken(data.token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    clearStoredSession();
    setToken(null);
    setUser(null);
  };

  useEffect(() => {
    const expireSession = () => logout();
    window.addEventListener(SESSION_EXPIRED_EVENT, expireSession);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, expireSession);
  }, []);

  useEffect(() => {
    if (!token) return undefined;

    const expiresAt = getTokenExpiry(token);
    if (!expiresAt) return undefined;

    const delay = expiresAt - Date.now();
    if (delay <= 0) {
      logout();
      return undefined;
    }

    const timer = window.setTimeout(() => logout(), delay);
    return () => window.clearTimeout(timer);
  }, [token]);

  const value = useMemo(() => ({ token, user, login, logout, isAuthenticated: Boolean(token) }), [token, user]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);
