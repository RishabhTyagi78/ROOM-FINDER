import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import api, { formatError } from "@/lib/api";
import { toast } from "sonner";
import { Upload, X, MapPin, Search } from "lucide-react";
import PropertyMap from "@/components/PropertyMap";

export default function PropertyForm() {
  const [sp] = useSearchParams();
  const id = sp.get("id");
  const nav = useNavigate();
  const [form, setForm] = useState({
    title: "", description: "", property_type: "Flat", rent: 10000, deposit: 20000,
    address: "", city: "", latitude: 12.9716, longitude: 77.5946,
    amenities: [], rules: [], images: [], videos: [],
    furnished: "Unfurnished", bhk: "1BHK", gender_preference: "Any",
    food_included: false, ac: false, wifi: false, parking: false,
    attached_bath: false, balcony: false, pet_friendly: false, status: "available",
  });
  const [busy, setBusy] = useState(false);
  const [searchAddr, setSearchAddr] = useState("");
  const [searchResults, setSearchResults] = useState([]);

  useEffect(() => {
    if (id) (async () => {
      try { const { data } = await api.get(`/properties/${id}`); setForm((s) => ({ ...s, ...data })); } catch {}
    })();
  }, [id]);

  const upload = async (e) => {
    const files = Array.from(e.target.files || []);
    for (const f of files) {
      try {
        const fd = new FormData(); fd.append("file", f);
        const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
        setForm((s) => ({ ...s, images: [...s.images, data.url] }));
      } catch (err) { toast.error(formatError(err)); }
    }
  };

  const submit = async (e) => {
    e.preventDefault(); setBusy(true);
    try {
      const payload = { ...form, rent: parseFloat(form.rent), deposit: parseFloat(form.deposit),
        latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude) };
      if (id) { await api.put(`/properties/${id}`, payload); toast.success("Updated"); }
      else { await api.post("/properties", payload); toast.success("Property listed"); }
      nav("/dashboard");
    } catch (err) { toast.error(formatError(err)); }
    finally { setBusy(false); }
  };

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  const onPinDrag = async (pos) => {
    set("latitude", pos[0]); set("longitude", pos[1]);
    try {
      const { data } = await api.get("/geo/reverse", { params: { lat: pos[0], lng: pos[1] } });
      if (data?.display_name) {
        if (!form.address) set("address", data.display_name);
        if (data.address?.city || data.address?.state_district) set("city", data.address?.city || data.address?.state_district);
      }
    } catch {}
  };

  const doSearch = async () => {
    if (!searchAddr.trim()) return;
    try {
      const { data } = await api.get("/geo/search", { params: { q: searchAddr } });
      setSearchResults(data);
    } catch {}
  };
  const pickResult = (r) => {
    set("latitude", parseFloat(r.lat)); set("longitude", parseFloat(r.lon));
    if (!form.address) set("address", r.display_name);
    setSearchResults([]); setSearchAddr(r.display_name);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-2)]">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">{id ? "Edit property" : "List a property"}</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Reach thousands of verified renters — no broker fees.</p>

        <form onSubmit={submit} className="mt-6 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="card p-5 space-y-4">
              <h3 className="font-semibold">Basics</h3>
              <div>
                <label className="label">Title</label>
                <input className="field mt-1.5" value={form.title} onChange={(e) => set("title", e.target.value)} required data-testid="pf-title" placeholder="e.g. Spacious 2BHK with balcony" />
              </div>
              <div>
                <label className="label">Description</label>
                <textarea className="field mt-1.5" rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} required data-testid="pf-description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Property type</label>
                  <select className="field mt-1.5" value={form.property_type} onChange={(e) => set("property_type", e.target.value)} data-testid="pf-type">
                    {["PG", "Single Room", "Shared Room", "Flat", "Apartment", "Independent House"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="label">Furnishing</label>
                  <select className="field mt-1.5" value={form.furnished} onChange={(e) => set("furnished", e.target.value)} data-testid="pf-furnished">
                    <option>Unfurnished</option><option>Semi-Furnished</option><option>Furnished</option>
                  </select>
                </div>
                <div>
                  <label className="label">Monthly rent (₹)</label>
                  <input className="field mt-1.5" type="number" value={form.rent} onChange={(e) => set("rent", e.target.value)} required data-testid="pf-rent" />
                </div>
                <div>
                  <label className="label">Security deposit (₹)</label>
                  <input className="field mt-1.5" type="number" value={form.deposit} onChange={(e) => set("deposit", e.target.value)} required data-testid="pf-deposit" />
                </div>
                <div>
                  <label className="label">City</label>
                  <input className="field mt-1.5" value={form.city} onChange={(e) => set("city", e.target.value)} required data-testid="pf-city" />
                </div>
                <div>
                  <label className="label">Locality / Area</label>
                  <input className="field mt-1.5" value={form.locality || ""} onChange={(e) => set("locality", e.target.value)} placeholder="e.g. Indiranagar" data-testid="pf-locality" />
                </div>
                <div>
                  <label className="label">BHK</label>
                  <input className="field mt-1.5" value={form.bhk} onChange={(e) => set("bhk", e.target.value)} data-testid="pf-bhk" />
                </div>
              </div>
              <div>
                <label className="label">Full address</label>
                <input className="field mt-1.5" value={form.address} onChange={(e) => set("address", e.target.value)} required data-testid="pf-address" />
              </div>
              <div>
                <label className="label">Amenities (comma separated)</label>
                <input className="field mt-1.5" value={(form.amenities || []).join(", ")} onChange={(e) => set("amenities", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} data-testid="pf-amenities" placeholder="Gym, Pool, Lift" />
              </div>
              <div>
                <label className="label">House rules (comma separated)</label>
                <input className="field mt-1.5" value={(form.rules || []).join(", ")} onChange={(e) => set("rules", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} data-testid="pf-rules" placeholder="No smoking, No pets" />
              </div>
              <div>
                <label className="label">Gender preference</label>
                <select className="field mt-1.5" value={form.gender_preference} onChange={(e) => set("gender_preference", e.target.value)} data-testid="pf-gender">
                  <option>Any</option><option>Male</option><option>Female</option>
                </select>
              </div>
              <div>
                <label className="label">Lifestyle tags (helps tenants find your property)</label>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {["Student Friendly", "Family Friendly", "Working Professional", "Pet Friendly", "Female Friendly", "Male Friendly", "Co-Living"].map((t) => (
                    <button key={t} type="button" onClick={() => set("lifestyle_tags", (form.lifestyle_tags || []).includes(t) ? (form.lifestyle_tags || []).filter((x) => x !== t) : [...(form.lifestyle_tags || []), t])}
                      className={`px-3 py-1 rounded-full text-xs border ${(form.lifestyle_tags || []).includes(t) ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]" : "border-[var(--border)] text-[var(--muted)]"}`}
                      data-testid={`pf-tag-${t}`}>{t}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold">Features</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                {[["ac", "Air conditioning"], ["wifi", "Wi-Fi"], ["parking", "Parking"], ["food_included", "Food included"], ["attached_bath", "Attached bath"], ["balcony", "Balcony"], ["pet_friendly", "Pet friendly"]].map(([k, l]) => (
                  <label key={k} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition ${form[k] ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-[var(--border)]"}`}>
                    <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)} data-testid={`pf-${k}`} className="accent-[var(--accent)]" /> <span className="text-sm">{l}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold">Photos</h3>
              <label className="mt-3 flex flex-col items-center justify-center gap-2 border-2 border-dashed border-[var(--border-2)] rounded-lg py-8 cursor-pointer hover:bg-[var(--bg-2)]" data-testid="pf-upload">
                <Upload className="w-6 h-6 text-[var(--muted)]" />
                <div className="text-sm font-medium">Click to upload images</div>
                <div className="text-xs text-[var(--muted)]">JPG, PNG up to 10MB</div>
                <input type="file" hidden multiple accept="image/*" onChange={upload} />
              </label>
              {form.images.length > 0 && (
                <div className="grid grid-cols-4 gap-3 mt-4">
                  {form.images.map((u, i) => (
                    <div key={i} className="relative aspect-square rounded-lg overflow-hidden border border-[var(--border)]">
                      <img src={u.startsWith("http") ? u : `${process.env.REACT_APP_BACKEND_URL}${u}`} alt="" className="w-full h-full object-cover" />
                      <button type="button" onClick={() => set("images", form.images.filter((_, ix) => ix !== i))} className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right rail */}
          <div className="space-y-6">
            <div className="card p-5">
              <h3 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4" /> Location pin</h3>
              <p className="text-xs text-[var(--muted)] mt-1">Drag the pin or click to set exact location.</p>

              <div className="mt-3 relative">
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                    <input className="field !pl-9 !py-2" placeholder="Search address…" value={searchAddr} onChange={(e) => setSearchAddr(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), doSearch())} data-testid="pf-addr-search" />
                  </div>
                  <button type="button" onClick={doSearch} className="btn btn-outline !py-2 !text-xs">Search</button>
                </div>
                {searchResults.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full card max-h-60 overflow-y-auto scrollbar-thin">
                    {searchResults.map((r, i) => (
                      <button key={i} type="button" onClick={() => pickResult(r)} className="block w-full text-left px-3 py-2 hover:bg-[var(--bg-2)] text-xs border-b border-[var(--border)] last:border-b-0" data-testid={`pf-addr-res-${i}`}>
                        {r.display_name}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="h-72 mt-3">
                <PropertyMap draggable pinPosition={[form.latitude, form.longitude]} onPinDrag={onPinDrag} center={[form.latitude, form.longitude]} />
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div><div className="label">Latitude</div><div className="font-mono">{form.latitude}</div></div>
                <div><div className="label">Longitude</div><div className="font-mono">{form.longitude}</div></div>
              </div>
            </div>

            <button disabled={busy} className="btn btn-primary w-full !py-3" data-testid="pf-submit">{busy ? "Saving…" : id ? "Update property" : "Publish property"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
