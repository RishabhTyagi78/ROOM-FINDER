import { Link } from "react-router-dom";
import { MapPin, Star, Heart } from "lucide-react";

export default function PropertyCard({ p, onSave, saved }) {
  const img = p.images?.[0]
    ? (p.images[0].startsWith("http") ? p.images[0] : `${process.env.REACT_APP_BACKEND_URL}${p.images[0]}`)
    : "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80";

  return (
    <article className="card card-hover overflow-hidden group" data-testid={`property-card-${p.id}`}>
      <Link to={`/property/${p.id}`} className="block relative aspect-[4/3] overflow-hidden">
        <img src={img} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute top-3 left-3 flex gap-1.5">
          <span className={`badge ${p.status === "available" ? "badge-success" : "badge-mute"}`}>
            {p.status === "available" ? "Available" : "Occupied"}
          </span>
          <span className="badge bg-white/90 text-slate-700 border-white/50">{p.property_type}</span>
        </div>
        {onSave && (
          <button onClick={(e) => { e.preventDefault(); onSave(p.id); }} data-testid={`save-${p.id}`}
            className={`absolute top-3 right-3 w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition ${saved ? "bg-red-500 text-white" : "bg-white/90 text-slate-700 hover:bg-white"}`}>
            <Heart className="w-4 h-4" fill={saved ? "currentColor" : "none"} />
          </button>
        )}
      </Link>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <Link to={`/property/${p.id}`} className="font-semibold text-[15px] leading-snug line-clamp-1 hover:text-[var(--accent)]">{p.title}</Link>
          {p.rating > 0 && (
            <div className="flex items-center gap-1 text-xs text-[var(--ink)] flex-shrink-0">
              <Star className="w-3.5 h-3.5 star-fill" /> <span className="font-medium">{p.rating}</span>
              <span className="text-[var(--muted)]">({p.review_count})</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-[var(--muted)] mt-1">
          <MapPin className="w-3 h-3" /> <span className="truncate">{p.city}</span>
          {p.distance_km != null && <span className="ml-auto">{p.distance_km} km away</span>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {p.bhk && <span className="badge">{p.bhk}</span>}
          {p.furnished && p.furnished !== "Unfurnished" && <span className="badge">{p.furnished}</span>}
          {p.ac && <span className="badge">AC</span>}
          {p.wifi && <span className="badge">Wi-Fi</span>}
          {p.parking && <span className="badge">Parking</span>}
        </div>
        <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-baseline gap-1">
          <span className="font-semibold text-lg">₹{p.rent.toLocaleString("en-IN")}</span>
          <span className="text-xs text-[var(--muted)]">/ month</span>
        </div>
      </div>
    </article>
  );
}
