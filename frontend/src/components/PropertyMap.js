import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";

// Custom brutalist marker
const brutalIcon = L.divIcon({
  className: "",
  html: `<div style="background:#FF4D00;border:2px solid #09090B;box-shadow:2px 2px 0 #09090B;color:white;font-weight:900;font-size:11px;padding:4px 8px;white-space:nowrap;">PIN</div>`,
  iconSize: [44, 22],
  iconAnchor: [22, 22],
});

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) map.flyTo(center, 13, { duration: 0.8 });
  }, [center, map]);
  return null;
}

export default function PropertyMap({ properties, center = [12.9716, 77.5946], radius, userLocation, onPick }) {
  return (
    <div className="w-full h-full">
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer attribution='© OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FlyTo center={center} />
        {userLocation && (
          <>
            <Marker position={userLocation} icon={L.divIcon({
              html: `<div style="background:#D9F845;border:2px solid #09090B;box-shadow:2px 2px 0 #09090B;font-weight:900;font-size:11px;padding:4px 8px;">YOU</div>`,
              iconSize: [44, 22], iconAnchor: [22, 22], className: "",
            })} />
            {radius > 0 && <Circle center={userLocation} radius={radius * 1000} pathOptions={{ color: "#FF4D00", fillOpacity: 0.05, weight: 2 }} />}
          </>
        )}
        {properties.map((p) => (
          <Marker key={p.id} position={[p.latitude, p.longitude]} icon={brutalIcon} eventHandlers={{ click: () => onPick && onPick(p) }}>
            <Popup>
              <div className="font-bold uppercase text-xs">{p.title}</div>
              <div className="text-xs">₹{p.rent.toLocaleString("en-IN")} / mo · {p.city}</div>
              <a href={`/property/${p.id}`} className="text-[#FF4D00] font-bold text-xs">View →</a>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
