import { useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
export default function AuthCallback() {
  const nav = useNavigate();
  const location = useLocation();
  const { setUser } = useAuth();
  const processed = useRef(false);

  useEffect(() => {
    if (processed.current) return;
    processed.current = true;
    const hash = location.hash || window.location.hash;
    const params = new URLSearchParams(hash.replace("#", ""));
    const session_id = params.get("session_id");
    if (!session_id) { nav("/login"); return; }
    (async () => {
      try {
        const { data } = await api.post("/auth/google/session", { session_id });
        localStorage.setItem("km_token", data.token);
        setUser(data.user);
        nav(data.user.roles?.includes("admin") ? "/admin" : "/dashboard", { replace: true });
      } catch { nav("/login", { replace: true }); }
    })();
  }, []); // eslint-disable-line

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-2)]">
      <div className="card p-7 text-center">
        <div className="font-semibold">Signing you in…</div>
        <div className="text-sm text-[var(--muted)] mt-1">One moment</div>
      </div>
    </div>
  );
}
