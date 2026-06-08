import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api, { formatError } from "@/lib/api";
import { Building2 } from "lucide-react";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setDone(data.dev_token || "(check server logs)");
      toast.success("Reset link sent");
    } catch (err) { toast.error(formatError(err)); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-[var(--bg-2)]">
      <div className="w-full max-w-md">
        <Link to="/" className="flex items-center gap-2 mb-8 justify-center">
          <div className="w-9 h-9 rounded-lg bg-[var(--ink)] flex items-center justify-center"><Building2 className="w-4 h-4 text-white" /></div>
          <div className="font-semibold">khatta·meetha</div>
        </Link>
        <form onSubmit={submit} className="card p-7">
          <h1 className="text-2xl font-semibold">Forgot password</h1>
          <p className="text-sm text-[var(--muted)] mt-1">We'll email you a reset link.</p>
          <label className="label mt-5 block">Email</label>
          <input className="field mt-1.5" placeholder="your@email.com" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="fp-email" />
          <button className="btn btn-primary w-full mt-4" data-testid="fp-submit">Send reset link</button>
          {done && (
            <div className="mt-4 card !bg-[var(--accent-soft)] p-3 text-xs break-all" data-testid="fp-token">
              <div className="font-medium">Dev token (since email is not configured):</div>
              <div className="mt-1 font-mono">{done}</div>
              <Link to={`/reset-password?token=${done}`} className="link block mt-2">→ Reset now</Link>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
