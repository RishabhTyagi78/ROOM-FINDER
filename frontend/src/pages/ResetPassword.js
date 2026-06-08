import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import api, { formatError } from "@/lib/api";
import { toast } from "sonner";

export default function ResetPassword() {
  const [sp] = useSearchParams();
  const [token, setToken] = useState(sp.get("token") || "");
  const [pw, setPw] = useState("");
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try { await api.post("/auth/reset-password", { token, new_password: pw }); toast.success("Password reset!"); nav("/login"); }
    catch (err) { toast.error(formatError(err)); }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="font-display text-2xl block mb-6">← KHATTA·MEETHA</Link>
        <form onSubmit={submit} className="card-brutal p-8 space-y-3">
          <h1 className="font-display text-2xl uppercase">Reset password</h1>
          <input className="input-brutal" placeholder="Token" value={token} onChange={(e) => setToken(e.target.value)} required data-testid="rp-token" />
          <input className="input-brutal" placeholder="New password" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} data-testid="rp-password" />
          <button className="btn-brutal btn-meetha w-full" data-testid="rp-submit">Reset</button>
        </form>
      </div>
    </div>
  );
}
