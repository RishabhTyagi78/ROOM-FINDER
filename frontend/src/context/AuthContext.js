import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "@/lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try { const { data } = await api.get("/auth/me"); setUser(data); }
    catch { setUser(null); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (window.location.hash?.includes("session_id=")) { setLoading(false); return; }
    if (!localStorage.getItem("km_token")) { setLoading(false); return; }
    refresh();
  }, [refresh]);

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("km_token", data.token);
    setUser(data.user);
    return data.user;
  };
  const register = async (payload) => {
    const { data } = await api.post("/auth/register", payload);
    localStorage.setItem("km_token", data.token);
    setUser(data.user);
    return data.user;
  };
  const logout = async () => {
    try { await api.post("/auth/logout"); } catch {}
    localStorage.removeItem("km_token");
    setUser(null);
  };
  const setActiveRole = async (role) => {
    const { data } = await api.post("/auth/set-role", { role });
    setUser(data);
    return data;
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refresh, setUser, setActiveRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
