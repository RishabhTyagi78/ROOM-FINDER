import { useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import api, { formatError } from "@/lib/api";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.post("/auth/forgot-password", { email });
      setDone(data.dev_token || "(check server logs)");
      toast.success("Reset link sent (dev mode shows token)");
    } catch (err) { toast.error(formatError(err)); }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="font-display text-2xl block mb-6">← KHATTA·MEETHA</Link>
        <form onSubmit={submit} className="card-brutal p-8">
          <h1 className="font-display text-2xl uppercase">Forgot password</h1>
          <input className="input-brutal mt-4" placeholder="Your email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required data-testid="fp-email" />
          <button className="btn-brutal btn-meetha w-full mt-4" data-testid="fp-submit">Send reset link</button>
          {done && (
            <div className="mt-4 card-brutal p-3 bg-[#D9F845] text-xs font-mono break-all" data-testid="fp-token">
              DEV TOKEN: {done}
              <Link to={`/reset-password?token=${done}`} className="block underline mt-2">→ Reset now</Link>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
