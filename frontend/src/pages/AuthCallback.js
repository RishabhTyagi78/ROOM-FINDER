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
    if (!session_id) {
      nav("/login");
      return;
    }
    (async () => {
      try {
        const { data } = await api.post("/auth/google/session", { session_id });
        if (data.token) localStorage.setItem("km_token", data.token);
        setUser(data.user);
        const dest = data.user.role === "khatta" ? "/khatta" : data.user.role === "admin" ? "/admin" : "/meetha";
        nav(dest, { replace: true });
      } catch (e) {
        nav("/login", { replace: true });
      }
    })();
  }, []); // eslint-disable-line

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="card-brutal p-8 font-display text-2xl">Signing you in…</div>
    </div>
  );
}
