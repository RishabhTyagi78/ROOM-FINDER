import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { loadPrefs, savePrefs } from "@/lib/match";
import { toast } from "sonner";
import { Sparkles } from "lucide-react";

const TAGS = ["Student Friendly", "Family Friendly", "Working Professional", "Pet Friendly", "Female Friendly", "Male Friendly", "Co-Living"];

export default function Preferences() {
  const [p, setP] = useState({ max_budget: 20000, property_type: "", furnished: "", ac: false, wifi: false, parking: false, balcony: false, attached_bath: false, lifestyle_tags: [] });
  useEffect(() => { const saved = loadPrefs(); if (Object.keys(saved).length) setP({ ...p, ...saved }); }, []); // eslint-disable-line

  const toggleTag = (t) => {
    setP((s) => ({ ...s, lifestyle_tags: s.lifestyle_tags.includes(t) ? s.lifestyle_tags.filter((x) => x !== t) : [...s.lifestyle_tags, t] }));
  };
  const save = () => { savePrefs(p); toast.success("Preferences saved — match scores will update"); };

  return (
    <div className="min-h-screen bg-[var(--bg-2)]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Sparkles className="w-6 h-6 text-amber-500" /> Your preferences</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Set these to get a personalised match score on every property.</p>
        <div className="card p-6 mt-6 space-y-5">
          <div>
            <label className="label">Maximum monthly budget</label>
            <div className="relative mt-1.5"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]">₹</span>
              <input type="number" className="field !pl-7" value={p.max_budget} onChange={(e) => setP({ ...p, max_budget: Number(e.target.value) })} data-testid="pref-budget" /></div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Preferred property type</label>
              <select className="field mt-1.5" value={p.property_type} onChange={(e) => setP({ ...p, property_type: e.target.value })} data-testid="pref-type">
                <option value="">No preference</option>
                {["PG", "Single Room", "Shared Room", "Flat", "Apartment", "Independent House"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Furnishing</label>
              <select className="field mt-1.5" value={p.furnished} onChange={(e) => setP({ ...p, furnished: e.target.value })} data-testid="pref-furnished">
                <option value="">No preference</option>
                <option>Furnished</option><option>Semi-Furnished</option><option>Unfurnished</option>
              </select>
            </div>
          </div>
          <div>
            <label className="label">Must-have amenities</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
              {[["ac", "AC"], ["wifi", "Wi-Fi"], ["parking", "Parking"], ["balcony", "Balcony"], ["attached_bath", "Attached bath"]].map(([k, l]) => (
                <label key={k} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer ${p[k] ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)]"}`}>
                  <input type="checkbox" checked={p[k]} onChange={(e) => setP({ ...p, [k]: e.target.checked })} className="accent-[var(--accent)]" data-testid={`pref-${k}`} /> <span className="text-sm">{l}</span>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="label">Lifestyle tags</label>
            <div className="flex flex-wrap gap-2 mt-2">
              {TAGS.map((t) => (
                <button key={t} type="button" onClick={() => toggleTag(t)} className={`px-3 py-1.5 rounded-full text-sm border transition ${p.lifestyle_tags.includes(t) ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`} data-testid={`pref-tag-${t}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <button onClick={save} className="btn btn-primary" data-testid="pref-save">Save preferences</button>
        </div>
      </div>
    </div>
  );
}
