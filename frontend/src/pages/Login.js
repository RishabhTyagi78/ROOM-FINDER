import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { formatError } from "@/lib/api";

// REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
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
      const dest = u.role === "khatta" ? "/khatta" : u.role === "admin" ? "/admin" : "/meetha";
      nav(loc.state?.from || dest);
    } catch (err) {
      toast.error(formatError(err));
    } finally { setBusy(false); }
  };

  const onGoogle = () => {
    const redirectUrl = window.location.origin + "/auth/callback";
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <Link to="/" className="font-display text-2xl block mb-6" data-testid="auth-logo">← KHATTA·MEETHA</Link>
        <div className="card-brutal p-8">
          <h1 className="font-display text-3xl uppercase">Welcome back</h1>
          <p className="text-sm text-zinc-600 mt-1">Login to find or list properties.</p>
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="font-mono text-xs uppercase">Email</label>
              <input className="input-brutal mt-1" value={email} onChange={(e) => setEmail(e.target.value)} type="email" required data-testid="login-email" />
            </div>
            <div>
              <label className="font-mono text-xs uppercase">Password</label>
              <input className="input-brutal mt-1" value={password} onChange={(e) => setPassword(e.target.value)} type="password" required data-testid="login-password" />
            </div>
            <button disabled={busy} className="btn-brutal btn-meetha w-full" data-testid="login-submit">
              {busy ? "Logging in…" : "Login"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px bg-zinc-950 flex-1" /><span className="font-mono text-xs uppercase">or</span><div className="h-px bg-zinc-950 flex-1" />
          </div>
          <button onClick={onGoogle} className="btn-brutal btn-khatta w-full" data-testid="login-google">Continue with Google</button>

          <div className="mt-5 flex items-center justify-between font-mono text-xs">
            <Link to="/forgot-password" data-testid="login-forgot" className="underline">Forgot password?</Link>
            <Link to="/register" data-testid="login-to-register" className="underline">Create account</Link>
          </div>
          <div className="mt-3">
            <Link to="/explore" className="btn-brutal w-full" data-testid="login-guest">Continue as Guest →</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
