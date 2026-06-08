import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { useEffect } from "react";

// Fix default icon paths
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const pinIcon = (color = "#2563eb") => L.divIcon({
  className: "",
  html: `<div style="width:30px;height:38px;position:relative;">
    <svg width="30" height="38" viewBox="0 0 30 38" xmlns="http://www.w3.org/2000/svg">
      <path d="M15 0C6.7 0 0 6.7 0 15c0 11.3 15 23 15 23s15-11.7 15-23C30 6.7 23.3 0 15 0z" fill="${color}"/>
      <circle cx="15" cy="15" r="6" fill="white"/>
    </svg></div>`,
  iconSize: [30, 38], iconAnchor: [15, 38], popupAnchor: [0, -32],
});

const userIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#2563eb;border:3px solid white;box-shadow:0 0 0 2px #2563eb55;"></div>`,
  iconSize: [18, 18], iconAnchor: [9, 9],
});

function FlyTo({ center }) {
  const map = useMap();
  useEffect(() => { if (center) map.flyTo(center, map.getZoom() < 12 ? 13 : map.getZoom(), { duration: 0.6 }); }, [center, map]);
  return null;
}

function ClickPicker({ onPick }) {
  useMapEvents({ click(e) { onPick && onPick([e.latlng.lat, e.latlng.lng]); } });
  return null;
}

export default function PropertyMap({ properties = [], center = [12.9716, 77.5946], radius, userLocation, onPick, draggable, pinPosition, onPinDrag }) {
  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-[var(--border)]">
      <MapContainer center={center} zoom={12} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer attribution='© OpenStreetMap' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <FlyTo center={center} />
        {draggable && <ClickPicker onPick={onPinDrag} />}

        {userLocation && (
          <>
            <Marker position={userLocation} icon={userIcon} />
            {radius > 0 && <Circle center={userLocation} radius={radius * 1000} pathOptions={{ color: "#2563eb", fillOpacity: 0.07, weight: 2 }} />}
          </>
        )}

        {draggable && pinPosition && (
          <Marker position={pinPosition} draggable icon={pinIcon("#ea580c")}
            eventHandlers={{ dragend: (e) => { const { lat, lng } = e.target.getLatLng(); onPinDrag && onPinDrag([lat, lng]); } }}>
            <Popup>Drag me or click on map</Popup>
          </Marker>
        )}

        {!draggable && properties.map((p) => (
          <Marker key={p.id} position={[p.latitude, p.longitude]} icon={pinIcon("#2563eb")}
            eventHandlers={{ click: () => onPick && onPick(p) }}>
            <Popup>
              <div className="text-sm">
                <div className="font-semibold">{p.title}</div>
                <div className="text-slate-600">₹{p.rent.toLocaleString("en-IN")} / mo · {p.city}</div>
                <a href={`/property/${p.id}`} className="text-blue-600 font-medium">View details →</a>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
