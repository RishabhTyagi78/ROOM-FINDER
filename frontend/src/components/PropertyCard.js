import { Link } from "react-router-dom";
import { MapPin, Star, BedDouble, Bath, Wifi, Car } from "lucide-react";

export default function PropertyCard({ p, onSave, saved }) {
  const img = p.images?.[0]
    ? (p.images[0].startsWith("http") ? p.images[0] : `${process.env.REACT_APP_BACKEND_URL}${p.images[0]}`)
    : "https://images.pexels.com/photos/8146330/pexels-photo-8146330.jpeg";

  return (
    <div className="card-brutal shadow-brutal-hover flex flex-col" data-testid={`property-card-${p.id}`}>
      <Link to={`/property/${p.id}`} className="block relative">
        <img src={img} alt={p.title} className="w-full h-52 object-cover border-b-2 border-zinc-950" />
        <span className="absolute top-3 left-3 badge-brutal bg-[#D9F845]">{p.property_type}</span>
        <span className={`absolute top-3 right-3 badge-brutal ${p.status === "available" ? "bg-white" : "bg-zinc-200"}`}>
          {p.status === "available" ? "AVAILABLE" : "OCCUPIED"}
        </span>
      </Link>
      <div className="p-4 flex flex-col gap-2 flex-1">
        <div className="flex items-start justify-between gap-2">
          <Link to={`/property/${p.id}`} className="font-display text-xl leading-tight hover:underline">
            {p.title}
          </Link>
          {onSave && (
            <button onClick={(e) => { e.preventDefault(); onSave(p.id); }} data-testid={`save-${p.id}`}
              className={`w-9 h-9 border-2 border-zinc-950 shadow-brutal flex items-center justify-center ${saved ? "bg-[#FF4D00] text-white" : "bg-white"}`}>
              <Star className="w-4 h-4" strokeWidth={3} fill={saved ? "white" : "none"} />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1 text-sm text-zinc-600">
          <MapPin className="w-3 h-3" strokeWidth={3} /> {p.city}
          {p.distance_km != null && <span className="ml-auto font-mono text-xs">{p.distance_km} KM</span>}
        </div>
        <div className="flex flex-wrap items-center gap-1 mt-1">
          {p.bhk && <span className="badge-brutal bg-white">{p.bhk}</span>}
          {p.furnished && <span className="badge-brutal bg-white">{p.furnished}</span>}
          {p.ac && <span className="badge-brutal bg-white">AC</span>}
          {p.wifi && <span className="badge-brutal bg-white">WiFi</span>}
          {p.parking && <span className="badge-brutal bg-white">Parking</span>}
        </div>
        <div className="mt-auto pt-3 border-t-2 border-dashed border-zinc-300 flex items-end justify-between">
          <div>
            <div className="font-mono text-xs uppercase text-zinc-500">Rent / Month</div>
            <div className="font-display text-2xl">₹{p.rent.toLocaleString("en-IN")}</div>
          </div>
          {p.rating > 0 && (
            <div className="flex items-center gap-1 badge-brutal bg-[#D9F845]">
              <Star className="w-3 h-3 fill-zinc-950" strokeWidth={3} />
              {p.rating} <span className="opacity-60">({p.review_count})</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
