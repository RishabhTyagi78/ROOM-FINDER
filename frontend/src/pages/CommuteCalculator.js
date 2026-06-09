import { useState } from "react";
import Navbar from "@/components/Navbar";
import api from "@/lib/api";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import { Bike, Car, Bus, Footprints as FootprintsIcon, Search } from "lucide-react";
import { toast } from "sonner";

export default function CommuteCalculator() {
  const [from, setFrom] = useState({ q: "", lat: null, lng: null, label: "" });
  const [to, setTo] = useState({ q: "", lat: null, lng: null, label: "" });
  const [busy, setBusy] = useState(false);

  const resolve = async (q) => {
    const { data } = await api.get("/geo/search", { params: { q } });
    if (!data?.length) throw new Error("Not found");
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), label: data[0].display_name };
  };

  const calc = async () => {
    setBusy(true);
    try {
      const [a, b] = await Promise.all([resolve(from.q), resolve(to.q)]);
      setFrom({ ...from, ...a }); setTo({ ...to, ...b });
    } catch (e) { toast.error("Could not find one of the locations"); }
    finally { setBusy(false); }
  };

  const distance = from.lat && to.lat ? haversine(from.lat, from.lng, to.lat, to.lng) : null;
  const modes = distance == null ? [] : [
    { I: FootprintsIcon, label: "Walking", time: distance / 5 * 60, color: "text-green-600" },
    { I: Bike, label: "Cycle", time: distance / 15 * 60, color: "text-blue-600" },
    { I: Bus, label: "Public transport", time: distance / 22 * 60, color: "text-amber-600" },
    { I: Car, label: "Car", time: distance / 30 * 60, color: "text-purple-600" },
  ];

  return (
    <div className="min-h-screen bg-[var(--bg-2)]">
      <Navbar />
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Commute calculator</h1>
        <p className="text-sm text-[var(--muted)] mt-1">Estimate travel time to your college, office, or any landmark.</p>

        <div className="card p-5 mt-6 space-y-3">
          <div>
            <label className="label">From (property or address)</label>
            <div className="relative mt-1.5">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input className="field !pl-9" placeholder="e.g. Indiranagar Bangalore" value={from.q} onChange={(e) => setFrom({ ...from, q: e.target.value })} data-testid="commute-from" />
            </div>
          </div>
          <div>
            <label className="label">To (destination)</label>
            <div className="relative mt-1.5">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
              <input className="field !pl-9" placeholder="e.g. Whitefield Bangalore" value={to.q} onChange={(e) => setTo({ ...to, q: e.target.value })} data-testid="commute-to" />
            </div>
          </div>
          <button onClick={calc} disabled={busy || !from.q || !to.q} className="btn btn-primary" data-testid="commute-calc">{busy ? "Calculating…" : "Calculate"}</button>
        </div>

        {distance != null && (
          <div className="grid lg:grid-cols-2 gap-6 mt-6">
            <div className="card p-5">
              <h3 className="font-semibold">Travel options</h3>
              <div className="text-sm text-[var(--muted)] mt-1">Distance: <b className="text-[var(--ink)]">{distance.toFixed(1)} km</b></div>
              <div className="mt-4 space-y-2">
                {modes.map((m, i) => (
                  <div key={i} className="card p-3 flex items-center gap-3" data-testid={`mode-${i}`}>
                    <div className={`w-9 h-9 rounded-lg bg-[var(--bg-2)] flex items-center justify-center ${m.color}`}><m.I className="w-4 h-4" /></div>
                    <div className="flex-1 text-sm font-medium">{m.label}</div>
                    <div className="font-semibold">{m.time < 60 ? `${Math.round(m.time)} min` : `${(m.time / 60).toFixed(1)} hr`}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="card p-5">
              <h3 className="font-semibold mb-3">Route</h3>
              <div className="h-72">
                <MapContainer center={[(from.lat + to.lat) / 2, (from.lng + to.lng) / 2]} zoom={12} style={{ height: "100%", width: "100%" }} key={`${from.lat}_${to.lat}`}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[from.lat, from.lng]} />
                  <Marker position={[to.lat, to.lng]} />
                  <Polyline positions={[[from.lat, from.lng], [to.lat, to.lng]]} pathOptions={{ color: "#2563eb", weight: 4 }} />
                </MapContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371; const dLat = (lat2 - lat1) * Math.PI / 180; const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

// Note: lucide doesn't have FootprintsIcon — use a fallback
export function FootprintsIcon2() { return null; }
