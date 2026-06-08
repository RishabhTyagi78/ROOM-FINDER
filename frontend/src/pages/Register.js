import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { formatError } from "@/lib/api";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "", phone: "", role: "meetha" });
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const u = await register(form);
      toast.success("Welcome to KHATTA-MEETHA!");
      nav(u.role === "khatta" ? "/khatta" : "/meetha");
    } catch (err) {
      toast.error(formatError(err));
    } finally { setBusy(false); }
  };

  const onGoogle = () => {
    const redirectUrl = window.location.origin + "/auth/callback";
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <Link to="/" className="font-display text-2xl block mb-6">← KHATTA·MEETHA</Link>
        <div className="card-brutal p-8">
          <h1 className="font-display text-3xl uppercase">Create account</h1>
          <p className="text-sm text-zinc-600 mt-1">Pick your side. You can always change later.</p>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <button type="button" onClick={() => setForm({ ...form, role: "khatta" })}
              className={`card-brutal p-4 text-left ${form.role === "khatta" ? "bg-[#D9F845]" : ""}`} data-testid="role-khatta">
              <div className="font-display text-xl">KHATTA</div>
              <div className="font-mono text-xs uppercase mt-1">I own properties</div>
            </button>
            <button type="button" onClick={() => setForm({ ...form, role: "meetha" })}
              className={`card-brutal p-4 text-left ${form.role === "meetha" ? "bg-[#FF4D00] text-white" : ""}`} data-testid="role-meetha">
              <div className="font-display text-xl">MEETHA</div>
              <div className="font-mono text-xs uppercase mt-1">I need a home</div>
            </button>
          </div>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            <div>
              <label className="font-mono text-xs uppercase">Full Name</label>
              <input className="input-brutal mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required data-testid="register-name" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="font-mono text-xs uppercase">Email</label>
                <input className="input-brutal mt-1" value={form.email} type="email" onChange={(e) => setForm({ ...form, email: e.target.value })} required data-testid="register-email" />
              </div>
              <div>
                <label className="font-mono text-xs uppercase">Phone</label>
                <input className="input-brutal mt-1" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} data-testid="register-phone" />
              </div>
            </div>
            <div>
              <label className="font-mono text-xs uppercase">Password</label>
              <input className="input-brutal mt-1" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} data-testid="register-password" />
            </div>
            <button disabled={busy} className="btn-brutal btn-meetha w-full" data-testid="register-submit">
              {busy ? "Creating…" : "Create account"}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <div className="h-px bg-zinc-950 flex-1" /><span className="font-mono text-xs uppercase">or</span><div className="h-px bg-zinc-950 flex-1" />
          </div>
          <button onClick={onGoogle} className="btn-brutal btn-khatta w-full" data-testid="register-google">Continue with Google</button>

          <div className="mt-5 font-mono text-xs text-center">
            Already have one? <Link to="/login" className="underline" data-testid="register-to-login">Login</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
