import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Navbar from "@/components/Navbar";
import api, { formatError } from "@/lib/api";
import { toast } from "sonner";
import { Upload } from "lucide-react";

export default function PropertyForm() {
  const { id } = useParams();
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

  useEffect(() => {
    if (id) (async () => {
      try { const { data } = await api.get(`/properties/${id}`); setForm({ ...form, ...data }); } catch {}
    })();
  }, [id]); // eslint-disable-line

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
      const payload = { ...form, rent: parseFloat(form.rent), deposit: parseFloat(form.deposit), latitude: parseFloat(form.latitude), longitude: parseFloat(form.longitude) };
      if (id) { await api.put(`/properties/${id}`, payload); toast.success("Updated"); }
      else { await api.post("/properties", payload); toast.success("Property listed!"); }
      nav("/khatta");
    } catch (err) { toast.error(formatError(err)); }
    finally { setBusy(false); }
  };

  const set = (k, v) => setForm((s) => ({ ...s, [k]: v }));

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Navbar />
      <div className="max-w-4xl mx-auto px-4 md:px-8 py-8">
        <h1 className="font-display text-4xl uppercase">{id ? "Edit" : "Add"} Property</h1>
        <form onSubmit={submit} className="card-brutal p-6 mt-6 space-y-4">
          <input className="input-brutal" placeholder="Title" value={form.title} onChange={(e) => set("title", e.target.value)} required data-testid="pf-title" />
          <textarea className="input-brutal" rows={4} placeholder="Description" value={form.description} onChange={(e) => set("description", e.target.value)} required data-testid="pf-description" />
          <div className="grid grid-cols-2 gap-4">
            <select className="input-brutal" value={form.property_type} onChange={(e) => set("property_type", e.target.value)} data-testid="pf-type">
              {["PG", "Single Room", "Shared Room", "Flat", "Apartment", "Independent House"].map((t) => <option key={t}>{t}</option>)}
            </select>
            <select className="input-brutal" value={form.furnished} onChange={(e) => set("furnished", e.target.value)} data-testid="pf-furnished">
              <option>Unfurnished</option><option>Semi-Furnished</option><option>Furnished</option>
            </select>
            <input className="input-brutal" placeholder="Rent ₹/mo" type="number" value={form.rent} onChange={(e) => set("rent", e.target.value)} required data-testid="pf-rent" />
            <input className="input-brutal" placeholder="Deposit ₹" type="number" value={form.deposit} onChange={(e) => set("deposit", e.target.value)} required data-testid="pf-deposit" />
            <input className="input-brutal" placeholder="City" value={form.city} onChange={(e) => set("city", e.target.value)} required data-testid="pf-city" />
            <input className="input-brutal" placeholder="BHK" value={form.bhk} onChange={(e) => set("bhk", e.target.value)} data-testid="pf-bhk" />
          </div>
          <input className="input-brutal" placeholder="Address" value={form.address} onChange={(e) => set("address", e.target.value)} required data-testid="pf-address" />
          <div className="grid grid-cols-2 gap-4">
            <input className="input-brutal" placeholder="Latitude" type="number" step="any" value={form.latitude} onChange={(e) => set("latitude", e.target.value)} data-testid="pf-lat" />
            <input className="input-brutal" placeholder="Longitude" type="number" step="any" value={form.longitude} onChange={(e) => set("longitude", e.target.value)} data-testid="pf-lng" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs">
            {[["ac", "AC"], ["wifi", "WiFi"], ["parking", "Parking"], ["food_included", "Food"], ["attached_bath", "Attached Bath"], ["balcony", "Balcony"], ["pet_friendly", "Pet Friendly"]].map(([k, l]) => (
              <label key={k} className="flex items-center gap-1 cursor-pointer">
                <input type="checkbox" checked={form[k]} onChange={(e) => set(k, e.target.checked)} data-testid={`pf-${k}`} /> {l}
              </label>
            ))}
          </div>
          <select className="input-brutal" value={form.gender_preference} onChange={(e) => set("gender_preference", e.target.value)} data-testid="pf-gender">
            <option>Any</option><option>Male</option><option>Female</option>
          </select>
          <textarea className="input-brutal" rows={2} placeholder="Amenities (comma separated)" value={(form.amenities || []).join(", ")} onChange={(e) => set("amenities", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} data-testid="pf-amenities" />
          <textarea className="input-brutal" rows={2} placeholder="Rules (comma separated)" value={(form.rules || []).join(", ")} onChange={(e) => set("rules", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} data-testid="pf-rules" />

          <div>
            <label className="btn-brutal cursor-pointer" data-testid="pf-upload">
              <Upload className="w-4 h-4" strokeWidth={3} /> Upload Images
              <input type="file" hidden multiple accept="image/*" onChange={upload} />
            </label>
            <div className="grid grid-cols-4 gap-2 mt-3">
              {form.images.map((u, i) => (
                <div key={i} className="card-brutal p-0 relative">
                  <img src={u.startsWith("http") ? u : `${process.env.REACT_APP_BACKEND_URL}${u}`} alt="" className="w-full h-20 object-cover" />
                  <button type="button" onClick={() => set("images", form.images.filter((_, ix) => ix !== i))} className="absolute top-1 right-1 bg-[#FF4D00] text-white px-2 text-xs font-bold border border-zinc-950">x</button>
                </div>
              ))}
            </div>
          </div>

          <button disabled={busy} className="btn-brutal btn-meetha w-full" data-testid="pf-submit">{busy ? "Saving…" : id ? "Update" : "Create Property"}</button>
        </form>
      </div>
    </div>
  );
}
