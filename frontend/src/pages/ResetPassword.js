import { useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import api, { formatError } from "@/lib/api";
import { toast } from "sonner";
import { Building2 } from "lucide-react";

export default function ResetPassword() {
  const [sp] = useSearchParams();
  const [token, setToken] = useState(sp.get("token") || "");
  const [pw, setPw] = useState("");
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    try { await api.post("/auth/reset-password", { token, new_password: pw }); toast.success("Password reset"); nav("/login"); }
    catch (err) { toast.error(formatError(err)); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg-2)]">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 rounded-lg bg-[var(--ink)] flex items-center justify-center"><Building2 className="w-4 h-4 text-white" /></div>
          <div className="font-semibold">khatta·meetha</div>
        </Link>
        <form onSubmit={submit} className="card p-7 space-y-3">
          <h1 className="text-2xl font-semibold">Reset password</h1>
          <div>
            <label className="label">Reset token</label>
            <input className="field mt-1.5" value={token} onChange={(e) => setToken(e.target.value)} required data-testid="rp-token" />
          </div>
          <div>
            <label className="label">New password</label>
            <input className="field mt-1.5" type="password" value={pw} onChange={(e) => setPw(e.target.value)} required minLength={6} data-testid="rp-password" />
          </div>
          <button className="btn btn-primary w-full" data-testid="rp-submit">Reset password</button>
        </form>
      </div>
    </div>
  );
}
