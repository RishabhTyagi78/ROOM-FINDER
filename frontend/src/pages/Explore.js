import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import PropertyCard from "@/components/PropertyCard";
import api, { formatError } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Filter, Grid3x3, List, Map as MapIcon } from "lucide-react";
import PropertyMap from "@/components/PropertyMap";

export default function Explore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [props, setProps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("grid");
  const [savedIds, setSavedIds] = useState(new Set());
  const [filters, setFilters] = useState({
    q: searchParams.get("q") || "",
    city: searchParams.get("city") || "",
    property_type: "",
    min_rent: "",
    max_rent: "",
    furnished: "",
    ac: false, wifi: false, parking: false, pet_friendly: false,
    gender_preference: "",
  });

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v !== "" && v !== false) params[k] = v; });
      const { data } = await api.get("/properties", { params });
      setProps(data);
    } catch (e) { toast.error(formatError(e)); }
    finally { setLoading(false); }
  };

  const loadSaved = async () => {
    if (user?.role !== "meetha") return;
    try {
      const { data } = await api.get("/favorites");
      setSavedIds(new Set(data.map((p) => p.id)));
    } catch {}
  };

  useEffect(() => { load(); }, []); // eslint-disable-line
  useEffect(() => { loadSaved(); }, [user]); // eslint-disable-line

  const toggleSave = async (pid) => {
    if (!user) return toast.error("Please login to save");
    try {
      if (savedIds.has(pid)) { await api.delete(`/favorites/${pid}`); setSavedIds((s) => { const n = new Set(s); n.delete(pid); return n; }); }
      else { await api.post("/favorites", { property_id: pid }); setSavedIds((s) => new Set(s).add(pid)); }
    } catch (e) { toast.error(formatError(e)); }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Navbar />
      <div className="border-b-2 border-zinc-950 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-6 grid lg:grid-cols-12 gap-4 items-end">
          <div className="lg:col-span-3">
            <label className="font-mono text-xs uppercase">Search</label>
            <input className="input-brutal mt-1" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} placeholder="Title, area…" data-testid="filter-q" />
          </div>
          <div className="lg:col-span-2">
            <label className="font-mono text-xs uppercase">City</label>
            <input className="input-brutal mt-1" value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} data-testid="filter-city" />
          </div>
          <div className="lg:col-span-2">
            <label className="font-mono text-xs uppercase">Type</label>
            <select className="input-brutal mt-1" value={filters.property_type} onChange={(e) => setFilters({ ...filters, property_type: e.target.value })} data-testid="filter-type">
              <option value="">Any</option>
              {["PG", "Single Room", "Shared Room", "Flat", "Apartment", "Independent House"].map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="lg:col-span-2">
            <label className="font-mono text-xs uppercase">Min ₹</label>
            <input className="input-brutal mt-1" type="number" value={filters.min_rent} onChange={(e) => setFilters({ ...filters, min_rent: e.target.value })} data-testid="filter-min" />
          </div>
          <div className="lg:col-span-2">
            <label className="font-mono text-xs uppercase">Max ₹</label>
            <input className="input-brutal mt-1" type="number" value={filters.max_rent} onChange={(e) => setFilters({ ...filters, max_rent: e.target.value })} data-testid="filter-max" />
          </div>
          <button onClick={load} className="btn-brutal btn-meetha lg:col-span-1" data-testid="filter-apply">
            <Filter className="w-4 h-4" strokeWidth={3} />
          </button>
        </div>
        <div className="max-w-7xl mx-auto px-4 md:px-8 pb-4 flex flex-wrap items-center gap-3 font-mono text-xs uppercase">
          {[["ac", "AC"], ["wifi", "WiFi"], ["parking", "Parking"], ["pet_friendly", "Pets"]].map(([k, l]) => (
            <label key={k} className="flex items-center gap-1 cursor-pointer">
              <input type="checkbox" checked={filters[k]} onChange={(e) => setFilters({ ...filters, [k]: e.target.checked })} data-testid={`chk-${k}`} /> {l}
            </label>
          ))}
          <select className="input-brutal py-1" value={filters.furnished} onChange={(e) => setFilters({ ...filters, furnished: e.target.value })} data-testid="filter-furnished">
            <option value="">Any furnishing</option>
            <option>Furnished</option><option>Semi-Furnished</option><option>Unfurnished</option>
          </select>
          <select className="input-brutal py-1" value={filters.gender_preference} onChange={(e) => setFilters({ ...filters, gender_preference: e.target.value })} data-testid="filter-gender">
            <option value="">Any gender</option><option>Male</option><option>Female</option>
          </select>
          <div className="ml-auto flex gap-1">
            {[["grid", Grid3x3], ["list", List], ["map", MapIcon]].map(([v, Icn]) => (
              <button key={v} onClick={() => setView(v)} className={`btn-brutal ${view === v ? "btn-ink" : ""}`} data-testid={`view-${v}`}>
                <Icn className="w-4 h-4" strokeWidth={3} />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="font-display text-3xl uppercase">{props.length} properties</h1>
        </div>

        {loading ? <div className="font-display text-2xl">Loading…</div> : props.length === 0 ? (
          <div className="card-brutal p-10 text-center">
            <div className="font-display text-2xl uppercase">No properties found</div>
            <p className="text-zinc-600 mt-2">Try widening your filters or browse a different city.</p>
          </div>
        ) : view === "map" ? (
          <div className="h-[600px]">
            <PropertyMap properties={props} center={props.length ? [props[0].latitude, props[0].longitude] : [12.97, 77.59]} />
          </div>
        ) : view === "list" ? (
          <div className="space-y-4">
            {props.map((p) => <PropertyCard key={p.id} p={p} onSave={user?.role === "meetha" ? toggleSave : null} saved={savedIds.has(p.id)} />)}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {props.map((p) => <PropertyCard key={p.id} p={p} onSave={user?.role === "meetha" ? toggleSave : null} saved={savedIds.has(p.id)} />)}
          </div>
        )}
      </div>
    </div>
  );
}
