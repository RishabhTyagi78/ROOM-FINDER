import { Check, X } from "lucide-react";

export default function PasswordStrength({ value }) {
  const checks = [
    { ok: value.length >= 8, label: "At least 8 characters" },
    { ok: /[A-Z]/.test(value), label: "One uppercase letter" },
    { ok: /[a-z]/.test(value), label: "One lowercase letter" },
    { ok: /\d/.test(value), label: "One number" },
    { ok: /[^A-Za-z0-9\s]/.test(value), label: "One special character" },
    { ok: !!value && !/\s/.test(value), label: "No spaces" },
  ];
  const score = checks.filter((c) => c.ok).length;
  const pct = (score / checks.length) * 100;
  const color = score < 3 ? "bg-red-500" : score < 5 ? "bg-amber-500" : "bg-green-500";
  const label = score < 3 ? "Weak" : score < 5 ? "Medium" : "Strong";
  if (!value) return null;
  return (
    <div className="mt-2 fade-in" data-testid="pw-strength">
      <div className="flex items-center gap-2">
        <div className="flex-1 h-1.5 bg-[var(--bg-2)] rounded-full overflow-hidden">
          <div className={`h-full transition-all ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`text-xs font-medium ${score < 3 ? "text-red-600" : score < 5 ? "text-amber-600" : "text-green-600"}`}>{label}</span>
      </div>
      <ul className="mt-2 space-y-1">
        {checks.map((c, i) => (
          <li key={i} className={`text-xs flex items-center gap-1.5 ${c.ok ? "text-green-600 dark:text-green-400" : "text-[var(--muted)]"}`} data-testid={`pw-check-${i}`}>
            {c.ok ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />} {c.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

export const isPasswordStrong = (v) =>
  v.length >= 8 && /[A-Z]/.test(v) && /[a-z]/.test(v) && /\d/.test(v) && /[^A-Za-z0-9\s]/.test(v) && !/\s/.test(v);
