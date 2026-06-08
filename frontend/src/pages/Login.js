import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { formatError } from "@/lib/api";
import { Building2 } from "lucide-react";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await login(email, password);
      const dest = u.roles?.includes("admin") ? "/admin" : "/dashboard";
      nav(loc.state?.from || dest);
    } catch (err) { toast.error(formatError(err)); }
    finally { setBusy(false); }
  };

  const onGoogle = () => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    const redirectUrl = window.location.origin + "/auth/callback";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-[var(--bg-2)]">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center" data-testid="auth-logo">
          <div className="w-9 h-9 rounded-lg bg-[var(--ink)] flex items-center justify-center"><Building2 className="w-4 h-4 text-white" /></div>
          <div className="font-semibold">khatta·meetha</div>
        </Link>
        <div className="card p-7">
          <h1 className="text-2xl font-semibold">Welcome back</h1>
          <p className="text-sm text-[var(--muted)] mt-1">Sign in to your account.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="label">Email address</label>
              <input className="field mt-1.5" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required data-testid="login-email" />
            </div>
            <div>
              <div className="flex items-center justify-between"><label className="label">Password</label>
                <Link to="/forgot-password" className="text-xs text-[var(--accent)] hover:underline" data-testid="login-forgot">Forgot?</Link>
              </div>
              <input className="field mt-1.5" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required data-testid="login-password" />
            </div>
            <button disabled={busy} className="btn btn-primary w-full" data-testid="login-submit">{busy ? "Signing in…" : "Sign in"}</button>
          </form>
          <div className="my-5 flex items-center gap-3"><div className="h-px bg-[var(--border)] flex-1" /><span className="text-xs text-[var(--muted)]">or</span><div className="h-px bg-[var(--border)] flex-1" /></div>
          <button onClick={onGoogle} className="btn btn-outline w-full" data-testid="login-google">
            <svg width="16" height="16" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Continue with Google
          </button>
          <div className="mt-5 text-sm text-center text-[var(--muted)]">
            New here? <Link to="/register" className="text-[var(--accent)] hover:underline" data-testid="login-to-register">Create an account</Link>
          </div>
          <div className="mt-2 text-center">
            <Link to="/explore" className="text-xs text-[var(--muted)] hover:underline" data-testid="login-guest">Continue as guest →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
