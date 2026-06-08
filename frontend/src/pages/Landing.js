import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, MapPin, Search, Home, Shield, MessageCircle, Star, Sparkles, Building2, Users, Wallet } from "lucide-react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

export default function Landing() {
  const { user, setRole } = useAuth();
  const nav = useNavigate();
  const listPropertyPath = !user ? "/register" : user.role === "khatta" || user.role === "admin" ? "/khatta/add" : null;
  const handleListProperty = async (e) => {
    if (user && user.role !== "khatta" && user.role !== "admin") {
      e.preventDefault();
      if (window.confirm("You're signed in as MEETHA. Switch to KHATTA (owner) to list a property?")) {
        await setRole("khatta");
        toast.success("Switched to KHATTA");
        nav("/khatta/add");
      }
    }
  };
  return (
    <div className="bg-[#FAFAF9]">
      <Navbar />

      {/* Marquee */}
      <div className="bg-zinc-950 text-[#D9F845] border-b-2 border-zinc-950 overflow-hidden">
        <div className="flex gap-12 py-2 font-mono text-xs uppercase tracking-widest marquee whitespace-nowrap">
          {Array(8).fill(0).map((_, i) => (
            <span key={i}>★ NO BROKERS ★ DIRECT FROM OWNERS ★ VERIFIED LISTINGS ★ KHATTA·MEETHA ★ FIND YOUR SPOT ★</span>
          ))}
        </div>
      </div>

      {/* HERO */}
      <section className="border-b-2 border-zinc-950">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12 md:py-20 grid lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-7">
            <span className="badge-brutal bg-[#D9F845]" data-testid="hero-badge">★ BROKER-FREE RENTALS</span>
            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl mt-6 leading-[0.9]">
              SOUR for owners.<br />
              <span className="bg-[#FF4D00] text-white px-2 inline-block -rotate-1">SWEET</span> for renters.
            </h1>
            <p className="mt-6 text-lg max-w-xl">
              KHATTA-MEETHA cuts the broker out. Property owners list. Tenants discover. Everyone wins. PG, Flats, Apartments — all within walking distance.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/explore" className="btn-brutal btn-meetha" data-testid="hero-cta-explore">
                Find a Home <ArrowRight className="w-4 h-4" strokeWidth={3} />
              </Link>
              <Link to={listPropertyPath || "/register"} onClick={handleListProperty} className="btn-brutal btn-khatta" data-testid="hero-cta-list">
                List a Property <Home className="w-4 h-4" strokeWidth={3} />
              </Link>
            </div>
            <div className="mt-10 flex flex-wrap gap-6 font-mono text-xs uppercase">
              <div><span className="font-display text-2xl block">12K+</span> Active listings</div>
              <div><span className="font-display text-2xl block">95%</span> Verified owners</div>
              <div><span className="font-display text-2xl block">0₹</span> Broker fees</div>
            </div>
          </div>
          <div className="lg:col-span-5">
            <div className="card-brutal p-0 overflow-hidden -rotate-2 shadow-brutal-lg">
              <img src="https://images.pexels.com/photos/7587828/pexels-photo-7587828.jpeg" alt="hero" className="w-full h-80 lg:h-[460px] object-cover" />
            </div>
            <div className="card-brutal bg-[#D9F845] p-4 -mt-12 ml-8 max-w-xs rotate-2 relative" data-testid="hero-floating-card">
              <div className="font-display text-3xl">₹8.5K</div>
              <div className="font-mono text-xs uppercase">Avg saving vs broker</div>
            </div>
          </div>
        </div>
      </section>

      {/* SEARCH BAR Bento */}
      <section className="border-b-2 border-zinc-950 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-12">
          <div className="card-brutal p-6 md:p-8 bg-[#FAFAF9]" data-testid="search-bento">
            <div className="flex flex-col md:flex-row items-stretch gap-4">
              <input className="input-brutal flex-1" placeholder="Search by city, locality or college…" data-testid="search-input"
                onKeyDown={(e) => { if (e.key === "Enter") window.location.href = `/explore?q=${encodeURIComponent(e.target.value)}`; }} />
              <Link to="/explore" className="btn-brutal btn-ink" data-testid="search-button">
                <Search className="w-4 h-4" strokeWidth={3} /> Search
              </Link>
              <Link to="/map" className="btn-brutal btn-meetha" data-testid="search-map-button">
                <MapPin className="w-4 h-4" strokeWidth={3} /> Map Search
              </Link>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 font-mono text-xs uppercase">
              <span className="opacity-60">Popular:</span>
              {["Bangalore", "Mumbai", "Delhi", "Pune", "Hyderabad", "Chennai"].map((c) => (
                <Link key={c} to={`/explore?city=${c}`} className="badge-brutal hover:bg-[#D9F845]" data-testid={`popular-${c}`}>{c}</Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* WHY US — Bento Grid */}
      <section className="border-b-2 border-zinc-950">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
          <h2 className="font-display text-3xl sm:text-4xl uppercase">Built for the way India rents.</h2>
          <div className="grid md:grid-cols-3 lg:grid-cols-6 gap-6 mt-10">
            <div className="card-brutal p-6 md:col-span-2 lg:col-span-3 bg-[#FF4D00] text-white" data-testid="feature-1">
              <Shield className="w-8 h-8 mb-4" strokeWidth={3} />
              <h3 className="font-display text-2xl uppercase">Zero Brokerage</h3>
              <p className="mt-2 text-white/90">No middlemen. No commission. Talk to owners directly and save thousands.</p>
            </div>
            <div className="card-brutal p-6 lg:col-span-3" data-testid="feature-2">
              <MapPin className="w-8 h-8 mb-4" strokeWidth={3} />
              <h3 className="font-display text-2xl uppercase">Hyperlocal Search</h3>
              <p className="mt-2">Find rooms within 500m of your college, office or metro station. Live map. Live radius.</p>
            </div>
            <div className="card-brutal p-6 lg:col-span-2 bg-[#D9F845]" data-testid="feature-3">
              <MessageCircle className="w-8 h-8 mb-4" strokeWidth={3} />
              <h3 className="font-display text-2xl uppercase">Chat in real-time</h3>
              <p className="mt-2">DM owners. Schedule visits. Get rent details, all in one place.</p>
            </div>
            <div className="card-brutal p-6 lg:col-span-2" data-testid="feature-4">
              <Sparkles className="w-8 h-8 mb-4" strokeWidth={3} />
              <h3 className="font-display text-2xl uppercase">Verified Owners</h3>
              <p className="mt-2">Documents, ID and property — checked by admins. No fraud.</p>
            </div>
            <div className="card-brutal p-6 lg:col-span-2 bg-zinc-950 text-white" data-testid="feature-5">
              <Wallet className="w-8 h-8 mb-4 text-[#D9F845]" strokeWidth={3} />
              <h3 className="font-display text-2xl uppercase">Rent. Reminders. Records.</h3>
              <p className="mt-2 text-zinc-300">Owners track rent and tenants get reminders. Nobody chases anyone.</p>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="border-b-2 border-zinc-950 bg-[#D9F845]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16">
          <div className="flex items-end justify-between flex-wrap gap-6">
            <h2 className="font-display text-3xl sm:text-4xl uppercase">3 steps. Done.</h2>
            <span className="badge-brutal bg-white">SIMPLE BY DESIGN</span>
          </div>
          <div className="grid md:grid-cols-3 gap-6 mt-10">
            {[
              { n: "01", t: "Search nearby", d: "Use the map. Set your radius. Filter what you need.", i: Search },
              { n: "02", t: "Visit & verify", d: "Book a visit. Owner approves. You go check the place.", i: Home },
              { n: "03", t: "Move in", d: "Pay rent online. Sign digitally. Move in with confidence.", i: Star },
            ].map((s, i) => (
              <div key={i} className="card-brutal p-6 bg-white" data-testid={`step-${i + 1}`}>
                <div className="font-mono text-xs uppercase">Step {s.n}</div>
                <s.i className="w-10 h-10 my-4" strokeWidth={3} />
                <h3 className="font-display text-2xl uppercase">{s.t}</h3>
                <p className="mt-2">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* TESTIMONIAL */}
      <section className="border-b-2 border-zinc-950">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 grid lg:grid-cols-2 gap-8 items-center">
          <div className="card-brutal p-0 overflow-hidden rotate-1">
            <img src="https://images.pexels.com/photos/4609051/pexels-photo-4609051.jpeg" alt="family" className="w-full h-80 object-cover" />
          </div>
          <div>
            <span className="badge-brutal bg-[#FF4D00] text-white">REAL STORIES</span>
            <h2 className="font-display text-3xl sm:text-4xl uppercase mt-4">
              "Found a 2BHK in Indiranagar in 2 days. Zero broker calls."
            </h2>
            <p className="mt-4 font-mono text-xs uppercase">— Aarav & Priya, moved Jan 2026</p>
            <div className="mt-6 flex gap-3 flex-wrap">
              {[1, 2, 3, 4, 5].map((i) => (<Star key={i} className="w-6 h-6 fill-[#FF4D00]" strokeWidth={3} />))}
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="border-b-2 border-zinc-950 bg-white">
        <div className="max-w-4xl mx-auto px-4 md:px-8 py-16">
          <h2 className="font-display text-3xl sm:text-4xl uppercase">FAQ</h2>
          <div className="mt-8 space-y-4">
            {[
              ["Is KHATTA-MEETHA really broker-free?", "Yes. You chat with owners directly. No middlemen, no commissions."],
              ["How is location radius search useful?", "Find PGs/flats within 500m to 5km of your college, office or metro station. Live map view included."],
              ["Can owners verify my documents?", "Yes — you upload Aadhaar/PAN/College ID and owners (or admins) verify before approving."],
              ["What does KHATTA-MEETHA mean?", "KHATTA = property owners (the sour, strict side). MEETHA = tenants (the sweet, comfort-seeking side). Both meet here."],
            ].map(([q, a], i) => (
              <details key={i} className="card-brutal p-5" data-testid={`faq-${i}`}>
                <summary className="font-display text-xl cursor-pointer uppercase">{q}</summary>
                <p className="mt-3 text-zinc-700">{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-zinc-950 text-white border-b-2 border-zinc-950">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-16 grid md:grid-cols-2 gap-8 items-center">
          <div>
            <h2 className="font-display text-4xl sm:text-5xl uppercase leading-none">Ready to skip the broker?</h2>
            <p className="mt-4 text-zinc-300">Join 50,000+ owners and tenants meeting directly.</p>
          </div>
          <div className="flex flex-wrap gap-4 md:justify-end">
            <Link to={user ? (user.role === "khatta" ? "/khatta" : user.role === "admin" ? "/admin" : "/meetha") : "/register"} className="btn-brutal btn-meetha" data-testid="cta-register">{user ? "Go to Dashboard" : "Sign up free"} <ArrowRight className="w-4 h-4" strokeWidth={3} /></Link>
            <Link to="/explore" className="btn-brutal btn-khatta" data-testid="cta-browse">Browse as guest</Link>
          </div>
        </div>
      </section>

      <footer className="bg-[#FAFAF9]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-10 flex flex-wrap items-center justify-between gap-4 font-mono text-xs uppercase">
          <div>© 2026 KHATTA·MEETHA · Made with vibes in Bharat</div>
          <div className="flex gap-4">
            <a href="#" data-testid="footer-link-privacy">Privacy</a>
            <a href="#" data-testid="footer-link-terms">Terms</a>
            <a href="#" data-testid="footer-link-support">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
