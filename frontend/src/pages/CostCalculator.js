import { useState } from "react";
import Navbar from "@/components/Navbar";
import { Wallet, Home, Utensils, Bus, Wifi, Zap, Droplet, ShoppingBag } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

const FIELDS = [
  { k: "rent", label: "Rent", I: Home, color: "#2563eb" },
  { k: "food", label: "Food", I: Utensils, color: "#16a34a" },
  { k: "transport", label: "Transport", I: Bus, color: "#f59e0b" },
  { k: "internet", label: "Internet", I: Wifi, color: "#8b5cf6" },
  { k: "electricity", label: "Electricity", I: Zap, color: "#ef4444" },
  { k: "water", label: "Water", I: Droplet, color: "#06b6d4" },
  { k: "misc", label: "Miscellaneous", I: ShoppingBag, color: "#64748b" },
];

export default function CostCalculator() {
  const [vals, setVals] = useState({ rent: 15000, food: 5000, transport: 2000, internet: 700, electricity: 1500, water: 300, misc: 2000 });
  const total = Object.values(vals).reduce((a, b) => a + Number(b || 0), 0);
  const data = FIELDS.map((f) => ({ name: f.label, value: Number(vals[f.k] || 0), color: f.color }));

  return (
    <div className="min-h-screen bg-[var(--bg-2)]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Wallet className="w-6 h-6" /> Cost of living calculator</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Plan your monthly budget before you move.</p>

        <div className="grid lg:grid-cols-2 gap-6 mt-6">
          <div className="card p-6">
            <h3 className="font-semibold mb-4">Monthly expenses</h3>
            <div className="space-y-3">
              {FIELDS.map((f) => (
                <div key={f.k} className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${f.color}20`, color: f.color }}><f.I className="w-4 h-4" /></div>
                  <label className="flex-1 text-sm">{f.label}</label>
                  <div className="relative w-32">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--muted)] text-sm">₹</span>
                    <input type="number" min="0" className="field !pl-7" value={vals[f.k]} onChange={(e) => setVals({ ...vals, [f.k]: e.target.value })} data-testid={`cost-${f.k}`} />
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-6 pt-4 border-t border-[var(--border)]">
              <div className="flex items-center justify-between">
                <div><div className="text-xs text-[var(--muted)]">Monthly total</div><div className="text-2xl font-semibold" data-testid="cost-monthly">₹{total.toLocaleString("en-IN")}</div></div>
                <div className="text-right"><div className="text-xs text-[var(--muted)]">Yearly</div><div className="text-2xl font-semibold" data-testid="cost-yearly">₹{(total * 12).toLocaleString("en-IN")}</div></div>
              </div>
            </div>
          </div>
          <div className="card p-6">
            <h3 className="font-semibold mb-4">Expense breakdown</h3>
            <div style={{ width: "100%", height: 320 }}>
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={110} paddingAngle={2}>
                    {data.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => `₹${Number(v).toLocaleString("en-IN")}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
