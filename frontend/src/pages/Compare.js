import { useEffect, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import api from "@/lib/api";
import { Check, X, Plus } from "lucide-react";

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

  const addProp = (id) => {
    const next = [...ids, id]; setSp({ ids: next.join(",") });
  };
  const remove = (id) => setSp({ ids: ids.filter((i) => i !== id).join(",") });

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <h1 className="font-display text-4xl uppercase">Compare</h1>
        <p className="font-mono text-xs uppercase opacity-70 mt-1">Side by side. No nonsense.</p>

        {props.length === 0 ? (
          <div className="card-brutal p-6 mt-6">
            <div>Pick properties to compare:</div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-4">
              {all.slice(0, 9).map((p) => (
                <button key={p.id} onClick={() => addProp(p.id)} className="card-brutal p-3 text-left" data-testid={`pick-${p.id}`}>
                  <div className="font-bold">{p.title}</div>
                  <div className="text-xs">{p.city} · ₹{p.rent}</div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto mt-6">
            <table className="w-full card-brutal text-sm">
              <thead>
                <tr className="bg-zinc-950 text-white">
                  <th className="p-3 text-left">Feature</th>
                  {props.map((p) => (
                    <th key={p.id} className="p-3 text-left min-w-[200px]">
                      <div className="flex items-center gap-2">
                        <Link to={`/property/${p.id}`} className="hover:underline">{p.title}</Link>
                        <button onClick={() => remove(p.id)} className="badge-brutal bg-[#FF4D00] text-white"><X className="w-3 h-3" strokeWidth={3} /></button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  ["City", (p) => p.city], ["Type", (p) => p.property_type],
                  ["Rent", (p) => `₹${p.rent.toLocaleString("en-IN")}`],
                  ["Deposit", (p) => `₹${p.deposit.toLocaleString("en-IN")}`],
                  ["Furnished", (p) => p.furnished],
                  ["AC", (p) => p.ac ? <Check className="w-4 h-4 text-green-700" /> : <X className="w-4 h-4 text-red-700" />],
                  ["WiFi", (p) => p.wifi ? <Check className="w-4 h-4 text-green-700" /> : <X className="w-4 h-4 text-red-700" />],
                  ["Parking", (p) => p.parking ? <Check className="w-4 h-4 text-green-700" /> : <X className="w-4 h-4 text-red-700" />],
                  ["Rating", (p) => `${p.rating || 0} (${p.review_count || 0})`],
                ].map(([label, fn]) => (
                  <tr key={label} className="border-t border-dashed border-zinc-300">
                    <td className="p-3 font-bold">{label}</td>
                    {props.map((p) => <td key={p.id} className="p-3">{fn(p)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
            {props.length < 4 && (
              <div className="mt-4">
                <select onChange={(e) => addProp(e.target.value)} className="input-brutal" data-testid="add-compare">
                  <option>+ Add another to compare</option>
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
