import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import PropertyCard from "@/components/PropertyCard";
import api from "@/lib/api";
import { Heart } from "lucide-react";

export default function Saved() {
  const nav = useNavigate();
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savedIds, setSavedIds] = useState(new Set());

  const load = async () => {
    try {
      const { data } = await api.get("/favorites");
      setSaved(data);
      setSavedIds(new Set(data.map((p) => p.id)));
    } catch { nav("/login"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const toggleSave = async (pid) => {
    if (savedIds.has(pid)) { await api.delete(`/favorites/${pid}`); setSaved((s) => s.filter((x) => x.id !== pid)); setSavedIds((s) => { const n = new Set(s); n.delete(pid); return n; }); }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-2)]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2"><Heart className="w-6 h-6 text-red-500" fill="currentColor" /> Saved properties</h1>
        <p className="text-sm text-[var(--muted)] mt-1">{loading ? "Loading…" : `${saved.length} saved`}</p>
        {!loading && saved.length === 0 ? (
          <div className="card p-12 text-center mt-6">
            <Heart className="w-10 h-10 mx-auto text-[var(--muted)] mb-3" />
            <div className="font-medium">No saved properties yet</div>
            <div className="text-sm text-[var(--muted)] mt-1">Tap the heart on any property to save it for later.</div>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
            {saved.map((p) => <PropertyCard key={p.id} p={p} onSave={toggleSave} saved={savedIds.has(p.id)} />)}
          </div>
        )}
      </div>
    </div>
  );
}
