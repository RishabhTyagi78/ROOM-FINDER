import { Link } from "react-router-dom";
import { MapPin, Star, Heart, BadgeCheck, Sparkles } from "lucide-react";
import { useMemo } from "react";
import { computeMatch, loadPrefs } from "@/lib/match";

export default function PropertyCard({ p, onSave, saved }) {
  const img = p.images?.[0]
    ? (p.images[0].startsWith("http") ? p.images[0] : `${process.env.REACT_APP_BACKEND_URL}${p.images[0]}`)
    : "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80";
  const occupied = p.status !== "available";
  const match = useMemo(() => computeMatch(loadPrefs(), p), [p.id]);

  return (
    <article className={`card card-hover overflow-hidden group relative ${occupied ? "opacity-70 grayscale-[40%]" : ""}`} data-testid={`property-card-${p.id}`}>
      <Link to={`/property/${p.id}`} className="block relative aspect-[4/3] overflow-hidden">
        <img src={img} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        <div className="absolute top-3 left-3 flex gap-1.5 flex-wrap">
          <span className={`badge ${occupied ? "badge-mute" : "badge-success"}`}>
            {occupied ? "Occupied" : "Available"}
          </span>
          <span className="badge bg-white/90 text-slate-700 border-white/50">{p.property_type}</span>
          {p.owner?.verified && <span className="badge bg-white/90 text-[var(--accent)] border-white/50"><BadgeCheck className="w-3 h-3" /> Verified</span>}
        </div>
        {match.score > 0 && (
          <div className="absolute bottom-3 left-3 px-2 py-1 rounded-md bg-black/65 backdrop-blur-sm text-white text-xs font-semibold flex items-center gap-1" data-testid={`match-${p.id}`}>
            <Sparkles className="w-3 h-3" /> {match.score}% match
          </div>
        )}
        {onSave && (
          <button onClick={(e) => { e.preventDefault(); onSave(p.id); }} data-testid={`save-${p.id}`}
            className={`absolute top-3 right-3 w-9 h-9 rounded-full backdrop-blur-md flex items-center justify-center transition ${saved ? "bg-red-500 text-white" : "bg-white/90 text-slate-700 hover:bg-white"}`}>
            <Heart className="w-4 h-4" fill={saved ? "currentColor" : "none"} />
          </button>
        )}
        {occupied && (
          <div className="absolute inset-0 bg-black/15 flex items-end justify-center pb-3 pointer-events-none">
            <span className="px-2 py-1 rounded-md bg-slate-900/85 text-white text-xs font-medium">Currently occupied</span>
          </div>
        )}
      </Link>
      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <Link to={`/property/${p.id}`} className="font-semibold text-[15px] leading-snug line-clamp-1 hover:text-[var(--accent)]">{p.title}</Link>
          {p.rating > 0 && (
            <div className="flex items-center gap-1 text-xs flex-shrink-0">
              <Star className="w-3.5 h-3.5 star-fill" /> <span className="font-medium">{p.rating}</span>
              <span className="text-[var(--muted)]">({p.review_count})</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 text-xs text-[var(--muted)] mt-1">
          <MapPin className="w-3 h-3" /> <span className="truncate">{p.locality ? `${p.locality}, ${p.city}` : p.city}</span>
          {p.distance_km != null && <span className="ml-auto whitespace-nowrap">{p.distance_km} km</span>}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {p.bhk && <span className="badge">{p.bhk}</span>}
          {p.furnished && p.furnished !== "Unfurnished" && <span className="badge">{p.furnished}</span>}
          {p.ac && <span className="badge">AC</span>}
          {p.wifi && <span className="badge">Wi-Fi</span>}
          {p.parking && <span className="badge">Parking</span>}
          {(p.lifestyle_tags || []).slice(0, 2).map((t) => <span key={t} className="badge badge-info">{t}</span>)}
        </div>
        <div className="mt-3 pt-3 border-t border-[var(--border)] flex items-baseline gap-1">
          <span className="font-semibold text-lg">₹{p.rent.toLocaleString("en-IN")}</span>
          <span className="text-xs text-[var(--muted)]">/ month</span>
          {p.deposit > 0 && <span className="ml-auto text-xs text-[var(--muted)]">+ ₹{p.deposit.toLocaleString("en-IN")} deposit</span>}
        </div>
      </div>
    </article>
  );
}
