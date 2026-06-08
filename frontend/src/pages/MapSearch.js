import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import PropertyMap from "@/components/PropertyMap";
import PropertyCard from "@/components/PropertyCard";
import api from "@/lib/api";
import { Crosshair, MapPin } from "lucide-react";
import { toast } from "sonner";

export default function MapSearch() {
  const [properties, setProperties] = useState([]);
  const [center, setCenter] = useState([12.9716, 77.5946]);
  const [userLoc, setUserLoc] = useState(null);
  const [radius, setRadius] = useState(2);

  const reload = async (lat, lng, r) => {
    try {
      const { data } = await api.get("/properties", { params: { lat, lng, radius_km: r } });
      setProperties(data);
    } catch {}
  };

  useEffect(() => { reload(center[0], center[1], radius); }, []); // eslint-disable-line

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (pos) => { const c = [pos.coords.latitude, pos.coords.longitude]; setUserLoc(c); setCenter(c); reload(c[0], c[1], radius); toast.success("Searching near you"); },
      () => toast.error("Could not get location"), { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const nearLanmark = async (label) => {
    try {
      const { data } = await api.get("/geo/search", { params: { q: label } });
      if (data?.[0]) {
        const c = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        setCenter(c); setUserLoc(c); reload(c[0], c[1], radius);
        toast.success(`Searching near ${label}`);
      }
    } catch { toast.error("Lookup failed"); }
  };

  return (
    <div className="min-h-screen bg-[var(--bg-2)]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <h1 className="text-2xl font-semibold tracking-tight">Map search</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">Find properties near you, your college, or office.</p>

        <div className="card p-3 mt-4 flex flex-wrap items-center gap-3">
          <button onClick={useMyLocation} className="btn btn-primary" data-testid="map-locate"><Crosshair className="w-4 h-4" /> Use my location</button>
          <div className="flex items-center gap-2">
            <span className="label">Radius</span>
            <select className="field !w-auto !py-2" value={radius} onChange={(e) => { const r = parseFloat(e.target.value); setRadius(r); reload(center[0], center[1], r); }} data-testid="map-radius">
              {[0.5, 1, 2, 5, 10, 25].map((r) => <option key={r} value={r}>{r} km</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            <span className="text-[var(--muted)] self-center">Near:</span>
            {["IIT Bombay", "Connaught Place Delhi", "MG Road Bangalore", "Bandra Mumbai", "Hitech City Hyderabad"].map((l) => (
              <button key={l} onClick={() => nearLanmark(l)} className="badge hover:bg-[var(--accent-soft)] hover:text-[var(--accent)] cursor-pointer" data-testid={`near-${l}`}>{l}</button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4 mt-4">
          <div className="lg:col-span-2 h-[640px]">
            <PropertyMap properties={properties} center={center} radius={radius} userLocation={userLoc} />
          </div>
          <div className="space-y-3 max-h-[640px] overflow-y-auto scrollbar-thin pr-1">
            <div className="font-medium">{properties.length} nearby</div>
            {properties.length === 0 ? <div className="card p-6 text-sm text-[var(--muted)]">No properties in this radius. Try increasing it.</div> : properties.map((p) => <PropertyCard key={p.id} p={p} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
