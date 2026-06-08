import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, MapPin, Search, Shield, MessageCircle, Star, Sparkles, CheckCircle2, Building2, Users, TrendingUp, BadgeCheck } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { useEffect, useState } from "react";
import api from "@/lib/api";

export default function Landing() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [featured, setFeatured] = useState([]);
  useEffect(() => { api.get("/properties", { params: { limit: 6 } }).then(r => setFeatured(r.data)).catch(() => {}); }, []);

  const dashTo = user ? "/dashboard" : "/register";

  return (
    <div className="bg-[var(--bg)]">
      <Navbar />

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-2)] to-[var(--bg)] -z-0" />
        <div className="max-w-7xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-20 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="fade-in">
              <span className="badge badge-info" data-testid="hero-badge"><BadgeCheck className="w-3 h-3" /> Verified · Broker-free</span>
              <h1 className="mt-5 text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight leading-[1.05]">
                Find your next home,<br className="hidden sm:block" /> <span className="text-[var(--accent)]">directly from owners.</span>
              </h1>
              <p className="mt-5 text-base sm:text-lg text-[var(--muted)] max-w-xl leading-relaxed">
                KHATTA-MEETHA connects property owners with renters — no brokers, no commission. Discover verified PGs, flats, and apartments near you.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link to="/explore" className="btn btn-primary" data-testid="hero-cta-explore">
                  Browse properties <ArrowRight className="w-4 h-4" />
                </Link>
                <Link to={dashTo} className="btn btn-outline" data-testid="hero-cta-list">
                  List your property
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap gap-8">
                {[["12K+", "Listings"], ["95%", "Verified owners"], ["₹0", "Brokerage"]].map(([v, l]) => (
                  <div key={l}>
                    <div className="text-2xl font-semibold">{v}</div>
                    <div className="text-xs text-[var(--muted)] uppercase tracking-wide">{l}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative">
              <div className="card overflow-hidden">
                <img src="https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&q=80" alt="" className="w-full h-[420px] object-cover" />
              </div>
              <div className="absolute -bottom-5 -left-5 card p-4 max-w-[200px] shadow-lg fade-in" data-testid="hero-floating-card">
                <div className="flex items-center gap-2 text-xs text-[var(--muted)]"><TrendingUp className="w-3 h-3 text-green-600" /> Avg saving</div>
                <div className="text-xl font-semibold">₹8,500</div>
                <div className="text-[10px] text-[var(--muted)]">vs. broker fees</div>
              </div>
              <div className="absolute -top-4 -right-4 card p-3 shadow-lg flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle2 className="w-4 h-4 text-green-600" /></div>
                <div>
                  <div className="text-xs font-medium">Verified owner</div>
                  <div className="text-[10px] text-[var(--muted)]">100% safe</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SEARCH */}
      <section className="border-b border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 -mt-8 mb-12">
          <div className="card p-3 md:p-4 shadow-lg" data-testid="search-card">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex-1 flex items-center gap-2 px-3">
                <Search className="w-4 h-4 text-[var(--muted)]" />
                <input className="flex-1 outline-none bg-transparent text-sm py-2.5"
                  placeholder="Search by city, locality, or college…" data-testid="search-input"
                  onKeyDown={(e) => { if (e.key === "Enter") nav(`/explore?q=${encodeURIComponent(e.target.value)}`); }} />
              </div>
              <Link to="/explore" className="btn btn-primary" data-testid="search-button">Search</Link>
              <Link to="/map" className="btn btn-outline" data-testid="search-map-button"><MapPin className="w-4 h-4" /> Map</Link>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs px-1">
            <span className="text-[var(--muted)]">Popular:</span>
            {["Bangalore", "Mumbai", "Delhi", "Pune", "Hyderabad", "Chennai"].map((c) => (
              <Link key={c} to={`/explore?city=${c}`} className="text-[var(--ink)] hover:text-[var(--accent)] transition" data-testid={`popular-${c}`}>{c}</Link>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED */}
      {featured.length > 0 && (
        <section>
          <div className="max-w-7xl mx-auto px-4 md:px-6 py-16">
            <div className="flex items-end justify-between mb-8">
              <div>
                <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Featured properties</h2>
                <p className="text-[var(--muted)] text-sm mt-1">Handpicked listings ready to move in.</p>
              </div>
              <Link to="/explore" className="text-sm text-[var(--accent)] hover:underline">View all →</Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {featured.slice(0, 6).map((p) => (
                <div key={p.id} className="fade-in"><PropertyCardThumb p={p} /></div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* WHY */}
      <section className="bg-[var(--bg-2)] border-y border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-16">
          <div className="max-w-2xl">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">A modern way to rent.</h2>
            <p className="text-[var(--muted)] mt-2">Everything you need to find, visit, and move in — without the broker overhead.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-5 mt-10">
            {[
              { I: Shield, t: "Zero brokerage", d: "Talk to owners directly. Save thousands on broker fees." },
              { I: MapPin, t: "Hyperlocal search", d: "Find rooms within 500m of your college, office, or metro." },
              { I: MessageCircle, t: "Instant chat", d: "DM owners, schedule visits, get details — all in one place." },
              { I: BadgeCheck, t: "Verified listings", d: "Every owner and document is screened for safety." },
              { I: Building2, t: "Manage everything", d: "Track rent, appointments, tenants in your dashboard." },
              { I: Sparkles, t: "Premium experience", d: "Clean design, fast search, mobile-first." },
            ].map((f, i) => (
              <div key={i} className="card p-5" data-testid={`feature-${i + 1}`}>
                <div className="w-9 h-9 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center">
                  <f.I className="w-4 h-4" />
                </div>
                <div className="font-semibold mt-3">{f.t}</div>
                <div className="text-sm text-[var(--muted)] mt-1">{f.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW */}
      <section>
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-16">
          <div className="text-center max-w-xl mx-auto">
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">Three simple steps.</h2>
            <p className="text-[var(--muted)] mt-2">From browsing to move-in, we make it effortless.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mt-12 relative">
            {[
              { n: "01", t: "Search nearby", d: "Use the map. Set your radius. Filter what you need." },
              { n: "02", t: "Visit & verify", d: "Book a visit. Owner approves. You check the place." },
              { n: "03", t: "Move in", d: "Sign digitally. Pay rent online. Move in with confidence." },
            ].map((s, i) => (
              <div key={i} className="text-center" data-testid={`step-${i + 1}`}>
                <div className="inline-flex w-12 h-12 rounded-full bg-[var(--ink)] text-white items-center justify-center font-semibold">{s.n}</div>
                <div className="font-semibold mt-4 text-lg">{s.t}</div>
                <p className="text-sm text-[var(--muted)] mt-1">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="bg-[var(--bg-2)] border-y border-[var(--border)]">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-16 text-center">
          <div className="flex justify-center gap-1 mb-4">{[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 star-fill" />)}</div>
          <p className="text-xl sm:text-2xl font-medium leading-relaxed">"Found a 2BHK in Indiranagar in just 2 days. Zero broker calls, talked directly to the owner. Smoothest rental experience I've had."</p>
          <div className="mt-6 flex items-center gap-3 justify-center">
            <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-sm font-semibold">A</div>
            <div className="text-left">
              <div className="font-medium text-sm">Aarav & Priya</div>
              <div className="text-xs text-[var(--muted)]">Moved in Jan 2026 · Bengaluru</div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section>
        <div className="max-w-3xl mx-auto px-4 md:px-6 py-16">
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-center">Frequently asked</h2>
          <div className="mt-8 space-y-3">
            {[
              ["Is KHATTA-MEETHA really broker-free?", "Yes. You chat with owners directly. No middlemen, no commission."],
              ["How does location radius search work?", "Find PGs/flats within 500m to 25km of your college, office, or metro station. Live map view included."],
              ["Can I act as both owner and tenant?", "Yes. Every account supports dual-roles — list your property and rent another, all from one login."],
              ["What does KHATTA-MEETHA mean?", "A play on the Hindi word for 'sweet & sour' — symbolising the meeting point of property owners (KHATTA) and tenants (MEETHA)."],
            ].map(([q, a], i) => (
              <details key={i} className="card p-5 group" data-testid={`faq-${i}`}>
                <summary className="font-medium cursor-pointer list-none flex items-center justify-between">{q} <span className="text-[var(--muted)] group-open:rotate-180 transition">▾</span></summary>
                <p className="text-sm text-[var(--muted)] mt-3 leading-relaxed">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-[var(--ink)] text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-16 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-semibold tracking-tight">Ready to skip the broker?</h2>
            <p className="text-slate-300 mt-3">Join 50,000+ owners and tenants meeting directly.</p>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link to={dashTo} className="btn btn-accent" data-testid="cta-register">{user ? "Go to dashboard" : "Get started free"} <ArrowRight className="w-4 h-4" /></Link>
            <Link to="/explore" className="btn btn-outline !bg-transparent !text-white !border-white/30" data-testid="cta-browse">Browse listings</Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-[var(--border)]">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-10 flex flex-wrap items-center justify-between gap-4 text-sm text-[var(--muted)]">
          <div>© 2026 KHATTA·MEETHA · Built in Bharat 🇮🇳</div>
          <div className="flex gap-5">
            <a href="#" data-testid="footer-link-privacy" className="hover:text-[var(--ink)]">Privacy</a>
            <a href="#" data-testid="footer-link-terms" className="hover:text-[var(--ink)]">Terms</a>
            <a href="#" data-testid="footer-link-support" className="hover:text-[var(--ink)]">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function PropertyCardThumb({ p }) {
  const img = p.images?.[0] ? (p.images[0].startsWith("http") ? p.images[0] : `${process.env.REACT_APP_BACKEND_URL}${p.images[0]}`)
    : "https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80";
  return (
    <Link to={`/property/${p.id}`} className="card card-hover overflow-hidden block">
      <div className="aspect-[4/3] overflow-hidden">
        <img src={img} alt={p.title} className="w-full h-full object-cover" />
      </div>
      <div className="p-4">
        <div className="flex items-center gap-2 justify-between">
          <span className="badge badge-info">{p.property_type}</span>
          {p.rating > 0 && <span className="text-xs flex items-center gap-1"><Star className="w-3 h-3 star-fill" />{p.rating}</span>}
        </div>
        <div className="font-medium mt-2 line-clamp-1">{p.title}</div>
        <div className="text-xs text-[var(--muted)]"><MapPin className="w-3 h-3 inline" /> {p.city}</div>
        <div className="mt-2 font-semibold">₹{p.rent.toLocaleString("en-IN")} <span className="text-xs text-[var(--muted)] font-normal">/ mo</span></div>
      </div>
    </Link>
  );
}
