import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import api from "@/lib/api";
import { Check, X } from "lucide-react";

export default function Compare() {
  const [sp, setSp] = useSearchParams();
  const ids = (sp.get("ids") || "").split(",").filter(Boolean);
  const [props, setProps] = useState([]);
  const [all, setAll] = useState([]);

  useEffect(() => {
    (async () => {
      const { data } = await api.get("/properties");
      setAll(data);
      setProps(data.filter((p) => ids.includes(p.id)));
    })();
  }, [sp]); // eslint-disable-line

  const addProp = (id) => { const next = [...ids, id]; setSp({ ids: next.join(",") }); };
  const remove = (id) => setSp({ ids: ids.filter((i) => i !== id).join(",") });

  return (
    <div className="min-h-screen bg-[var(--bg-2)]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Compare properties</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">Side-by-side comparison — pick up to 4.</p>

        {props.length === 0 ? (
          <div className="card p-6 mt-6">
            <div className="text-sm font-medium">Select properties to compare</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {all.slice(0, 9).map((p) => (
                <button key={p.id} onClick={() => addProp(p.id)} className="card card-hover p-4 text-left" data-testid={`pick-${p.id}`}>
                  <div className="font-medium text-sm line-clamp-1">{p.title}</div>
                  <div className="text-xs text-[var(--muted)] mt-1">{p.city} · ₹{p.rent.toLocaleString("en-IN")}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="card mt-6 overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-2)] border-b border-[var(--border)]">
                <tr>
                  <th className="p-3 text-left font-medium text-[var(--muted)]">Feature</th>
                  {props.map((p) => (
                    <th key={p.id} className="p-3 text-left min-w-[200px]">
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <Link to={`/property/${p.id}`} className="hover:text-[var(--accent)] font-medium">{p.title}</Link>
                          <div className="text-xs text-[var(--muted)] mt-0.5 font-normal">{p.city}</div>
                        </div>
                        <button onClick={() => remove(p.id)} className="text-[var(--muted)] hover:text-red-600"><X className="w-4 h-4" /></button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["Property type", (p) => p.property_type],
                  ["Monthly rent", (p) => `₹${p.rent.toLocaleString("en-IN")}`],
                  ["Security deposit", (p) => `₹${p.deposit.toLocaleString("en-IN")}`],
                  ["Furnishing", (p) => p.furnished],
                  ["AC", (p) => p.ac ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-[var(--muted)]" />],
                  ["Wi-Fi", (p) => p.wifi ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-[var(--muted)]" />],
                  ["Parking", (p) => p.parking ? <Check className="w-4 h-4 text-green-600" /> : <X className="w-4 h-4 text-[var(--muted)]" />],
                  ["Rating", (p) => `${p.rating || 0} (${p.review_count || 0})`],
                ].map(([label, fn]) => (
                  <tr key={label} className="border-b border-[var(--border)] last:border-b-0">
                    <td className="p-3 font-medium text-[var(--muted)]">{label}</td>
                    {props.map((p) => <td key={p.id} className="p-3">{fn(p)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {props.length < 4 && (
              <div className="p-3 border-t border-[var(--border)]">
                <select onChange={(e) => addProp(e.target.value)} className="field !w-auto" data-testid="add-compare">
                  <option>+ Add another property</option>
                  {all.filter((p) => !ids.includes(p.id)).map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
                </select>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
