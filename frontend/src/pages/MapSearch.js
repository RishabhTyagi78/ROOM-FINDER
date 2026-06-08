import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import PropertyMap from "@/components/PropertyMap";
import PropertyCard from "@/components/PropertyCard";
import api from "@/lib/api";
import { MapPin, Crosshair } from "lucide-react";
import { toast } from "sonner";

export default function MapSearch() {
  const [properties, setProperties] = useState([]);
  const [center, setCenter] = useState([12.9716, 77.5946]);
  const [userLoc, setUserLoc] = useState(null);
  const [radius, setRadius] = useState(2);
  const [picked, setPicked] = useState(null);

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
      (pos) => {
        const c = [pos.coords.latitude, pos.coords.longitude];
        setUserLoc(c); setCenter(c); reload(c[0], c[1], radius);
        toast.success("Searching near your location");
      },
      () => toast.error("Could not get location"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const nearLanmark = async (label) => {
    // Use Nominatim
    try {
      const { data } = await import("axios").then(({ default: ax }) => ax.get(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(label)}&format=json&limit=1`));
      if (data?.[0]) {
        const c = [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        setCenter(c); setUserLoc(c); reload(c[0], c[1], radius);
        toast.success(`Searching near ${label}`);
      }
    } catch { toast.error("Lookup failed"); }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        <div className="card-brutal p-4 mb-4 flex flex-wrap items-center gap-3">
          <button onClick={useMyLocation} className="btn-brutal btn-meetha" data-testid="map-locate">
            <Crosshair className="w-4 h-4" strokeWidth={3} /> Use My Location
          </button>
          <div className="flex items-center gap-2">
            <label className="font-mono text-xs uppercase">Radius (km):</label>
            <select className="input-brutal py-1" value={radius} onChange={(e) => { const r = parseFloat(e.target.value); setRadius(r); reload(center[0], center[1], r); }} data-testid="map-radius">
              {[0.5, 1, 2, 5, 10, 25].map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="flex flex-wrap gap-1 font-mono text-xs">
            <span className="opacity-60 mr-1">Near:</span>
            {["IIT Bombay", "Connaught Place Delhi", "MG Road Bangalore", "Bandra Mumbai", "Hitech City Hyderabad"].map((l) => (
              <button key={l} onClick={() => nearLanmark(l)} className="badge-brutal hover:bg-[#D9F845]" data-testid={`near-${l}`}>{l}</button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-[640px]">
            <PropertyMap properties={properties} center={center} radius={radius} userLocation={userLoc} onPick={setPicked} />
          </div>
          <div className="space-y-3 max-h-[640px] overflow-y-auto scrollbar-thin pr-1">
            <div className="font-display text-2xl uppercase">{properties.length} nearby</div>
            {properties.length === 0 ? (
              <div className="card-brutal p-4 text-sm">No properties in this radius. Try increasing it.</div>
            ) : properties.map((p) => <PropertyCard key={p.id} p={p} />)}
          </div>
        </div>
      </div>
    </div>
  );
}
