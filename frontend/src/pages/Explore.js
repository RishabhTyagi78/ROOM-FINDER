import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import PropertyCard from "@/components/PropertyCard";
import api, { formatError } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Filter, LayoutGrid, List as ListIcon, Map as MapIcon, SlidersHorizontal, X } from "lucide-react";
import PropertyMap from "@/components/PropertyMap";

export default function Explore() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [props, setProps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("grid");
  const [savedIds, setSavedIds] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    q: searchParams.get("q") || "",
    city: searchParams.get("city") || "",
    property_type: "", min_rent: "", max_rent: "",
    furnished: "", ac: false, wifi: false, parking: false, pet_friendly: false,
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
    if (!user) return;
    try { const { data } = await api.get("/favorites"); setSavedIds(new Set(data.map((p) => p.id))); } catch {}
  };

  useEffect(() => { load(); }, []); // eslint-disable-line
  useEffect(() => { loadSaved(); }, [user]); // eslint-disable-line

  const toggleSave = async (pid) => {
    if (!user) return toast.error("Please sign in to save");
    try {
      if (savedIds.has(pid)) { await api.delete(`/favorites/${pid}`); setSavedIds((s) => { const n = new Set(s); n.delete(pid); return n; }); }
      else { await api.post("/favorites", { property_id: pid }); setSavedIds((s) => new Set(s).add(pid)); }
    } catch (e) { toast.error(formatError(e)); }
  };

  const activeFilterCount = Object.values(filters).filter((v) => v !== "" && v !== false).length;

  return (
    <div className="min-h-screen bg-[var(--bg-2)]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Explore properties</h1>
            <p className="text-sm text-[var(--muted)] mt-0.5">{loading ? "Searching…" : `${props.length} properties found`}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setShowFilters(!showFilters)} className="btn btn-outline" data-testid="filter-toggle">
              <SlidersHorizontal className="w-4 h-4" /> Filters
              {activeFilterCount > 0 && <span className="badge badge-info ml-1">{activeFilterCount}</span>}
            </button>
            <div className="flex gap-0.5 p-1 bg-[var(--card)] border border-[var(--border)] rounded-lg">
              {[["grid", LayoutGrid], ["list", ListIcon], ["map", MapIcon]].map(([v, Icn]) => (
                <button key={v} onClick={() => setView(v)} className={`p-1.5 rounded-md ${view === v ? "bg-[var(--ink)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"}`} data-testid={`view-${v}`}>
                  <Icn className="w-4 h-4" />
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Quick search bar */}
        <div className="card p-3 mt-4 flex flex-wrap items-center gap-2">
          <input className="field flex-1 min-w-[180px]" placeholder="Search title, area…" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} data-testid="filter-q" />
          <input className="field w-32" placeholder="City" value={filters.city} onChange={(e) => setFilters({ ...filters, city: e.target.value })} data-testid="filter-city" />
          <select className="field w-32" value={filters.property_type} onChange={(e) => setFilters({ ...filters, property_type: e.target.value })} data-testid="filter-type">
            <option value="">Any type</option>{["PG", "Single Room", "Shared Room", "Flat", "Apartment", "Independent House"].map((t) => <option key={t}>{t}</option>)}
          </select>
          <input className="field w-24" type="number" placeholder="Min ₹" value={filters.min_rent} onChange={(e) => setFilters({ ...filters, min_rent: e.target.value })} data-testid="filter-min" />
          <input className="field w-24" type="number" placeholder="Max ₹" value={filters.max_rent} onChange={(e) => setFilters({ ...filters, max_rent: e.target.value })} data-testid="filter-max" />
          <button onClick={load} className="btn btn-primary" data-testid="filter-apply"><Filter className="w-4 h-4" /> Search</button>
        </div>

        {showFilters && (
          <div className="card p-4 mt-3 fade-in">
            <div className="flex items-center justify-between mb-3">
              <div className="font-medium text-sm">Advanced filters</div>
              <button onClick={() => setShowFilters(false)}><X className="w-4 h-4 text-[var(--muted)]" /></button>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Furnishing</label>
                <select className="field mt-1.5" value={filters.furnished} onChange={(e) => setFilters({ ...filters, furnished: e.target.value })} data-testid="filter-furnished">
                  <option value="">Any</option><option>Furnished</option><option>Semi-Furnished</option><option>Unfurnished</option>
                </select>
              </div>
              <div>
                <label className="label">Gender preference</label>
                <select className="field mt-1.5" value={filters.gender_preference} onChange={(e) => setFilters({ ...filters, gender_preference: e.target.value })} data-testid="filter-gender">
                  <option value="">Any</option><option>Male</option><option>Female</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2 items-end">
                {[["ac", "AC"], ["wifi", "Wi-Fi"], ["parking", "Parking"], ["pet_friendly", "Pets"]].map(([k, l]) => (
                  <label key={k} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-sm cursor-pointer ${filters[k] ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border-2)]"}`}>
                    <input type="checkbox" checked={filters[k]} onChange={(e) => setFilters({ ...filters, [k]: e.target.checked })} data-testid={`chk-${k}`} className="accent-[var(--accent)]" /> {l}
                  </label>
                ))}
              </div>
            </div>
          </div>
        )}

        <div className="mt-6">
          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-80 rounded-2xl" />)}</div>
          ) : props.length === 0 ? (
            <div className="card p-16 text-center">
              <Filter className="w-10 h-10 mx-auto text-[var(--muted)] mb-3" />
              <div className="font-medium">No properties match your filters</div>
              <div className="text-sm text-[var(--muted)] mt-1">Try widening your filters or browse a different city.</div>
            </div>
          ) : view === "map" ? (
            <div className="h-[640px]"><PropertyMap properties={props} center={props.length ? [props[0].latitude, props[0].longitude] : [12.97, 77.59]} /></div>
          ) : view === "list" ? (
            <div className="space-y-4">{props.map((p) => <PropertyCard key={p.id} p={p} onSave={user ? toggleSave : null} saved={savedIds.has(p.id)} />)}</div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">{props.map((p) => <PropertyCard key={p.id} p={p} onSave={user ? toggleSave : null} saved={savedIds.has(p.id)} />)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
