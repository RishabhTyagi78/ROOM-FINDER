import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import api, { formatError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { Calendar, MessageCircle, Star, MapPin, ChevronLeft, Heart, Share2, Edit, BadgeCheck, Building2 } from "lucide-react";

export default function PropertyDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [p, setP] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("10:00");
  const [msg, setMsg] = useState("");
  const [chatText, setChatText] = useState("");
  const [activeImg, setActiveImg] = useState(0);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });

  const isOwner = user && p && p.owner_id === user.id;

  const load = async () => {
    try {
      const { data } = await api.get(`/properties/${id}`);
      setP(data);
      const r = await api.get(`/reviews/${id}`);
      setReviews(r.data);
    } catch (e) { toast.error(formatError(e)); }
  };
  useEffect(() => { load(); }, [id]); // eslint-disable-line

  const book = async () => {
    if (!user) return nav("/login");
    if (isOwner) return toast.error("You can't book your own property");
    if (!date) return toast.error("Pick a date and time");
    try {
      const visit_date = `${date}T${time}`;
      await api.post("/appointments", { property_id: id, visit_date, message: msg });
      toast.success("Visit requested — owner will be notified");
      setDate(""); setMsg("");
    } catch (e) { toast.error(formatError(e)); }
  };

  const sendChat = async () => {
    if (!user) return nav("/login");
    if (isOwner) return toast.error("You can't message yourself");
    if (!chatText.trim()) return;
    try {
      await api.post("/messages", { to_user_id: p.owner_id, property_id: p.id, text: chatText });
      toast.success("Message sent");
      setChatText("");
      nav(`/chat/${p.owner_id}?property=${p.id}`);
    } catch (e) { toast.error(formatError(e)); }
  };

  const submitReview = async () => {
    if (!user) return nav("/login");
    try {
      await api.post("/reviews", { property_id: id, ...reviewForm });
      toast.success("Review posted");
      setReviewForm({ rating: 5, comment: "" });
      load();
    } catch (e) { toast.error(formatError(e)); }
  };

  if (!p) return <div className="min-h-screen bg-[var(--bg-2)]"><Navbar /><div className="p-16 text-center text-[var(--muted)]">Loading…</div></div>;

  const imageUrls = (p.images || []).map((i) => i.startsWith("http") ? i : `${process.env.REACT_APP_BACKEND_URL}${i}`);
  if (imageUrls.length === 0) imageUrls.push("https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=900&q=80");

  return (
    <div className="min-h-screen bg-[var(--bg-2)]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="flex items-center justify-between mb-4">
          <Link to="/explore" className="text-sm text-[var(--muted)] hover:text-[var(--ink)] inline-flex items-center gap-1" data-testid="back-link"><ChevronLeft className="w-3.5 h-3.5" /> Back to results</Link>
          {isOwner && <span className="badge badge-info" data-testid="own-property-badge"><Building2 className="w-3 h-3" /> This is your property</span>}
        </div>

        {/* Image gallery */}
        <div className="grid lg:grid-cols-4 gap-2 lg:gap-3">
          <div className="lg:col-span-3 aspect-[16/10] rounded-2xl overflow-hidden card !p-0">
            <img src={imageUrls[activeImg]} alt={p.title} className="w-full h-full object-cover" data-testid="detail-main-image" />
          </div>
          <div className="grid grid-cols-3 lg:grid-cols-1 gap-2 lg:gap-3">
            {imageUrls.slice(0, 3).map((u, i) => (
              <button key={i} onClick={() => setActiveImg(i)} className={`aspect-[4/3] rounded-xl overflow-hidden card !p-0 ${i === activeImg ? "ring-2 ring-[var(--accent)]" : ""}`} data-testid={`thumb-${i}`}>
                <img src={u} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8 mt-8">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight">{p.title}</h1>
                  <div className="flex items-center gap-2 text-sm text-[var(--muted)] mt-1">
                    <MapPin className="w-3.5 h-3.5" /> {p.address}, {p.city}
                  </div>
                </div>
                {p.rating > 0 && (
                  <div className="flex items-center gap-1 text-sm">
                    <Star className="w-4 h-4 star-fill" /> <span className="font-semibold">{p.rating}</span>
                    <span className="text-[var(--muted)]">({p.review_count})</span>
                  </div>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5 mt-3">
                <span className="badge badge-info">{p.property_type}</span>
                {p.bhk && <span className="badge">{p.bhk}</span>}
                <span className="badge">{p.furnished}</span>
                <span className={`badge ${p.status === "available" ? "badge-success" : "badge-mute"}`}>{p.status}</span>
                {p.ac && <span className="badge">AC</span>}
                {p.wifi && <span className="badge">Wi-Fi</span>}
                {p.parking && <span className="badge">Parking</span>}
                {p.food_included && <span className="badge">Food</span>}
                {p.attached_bath && <span className="badge">Attached bath</span>}
                {p.balcony && <span className="badge">Balcony</span>}
                {p.pet_friendly && <span className="badge">Pet friendly</span>}
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold">About this place</h3>
              <p className="text-sm text-[var(--muted)] mt-2 whitespace-pre-line leading-relaxed">{p.description}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <div className="card p-5">
                <h3 className="font-semibold">Amenities</h3>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {(p.amenities || []).map((a) => <span key={a} className="badge">{a}</span>)}
                  {!p.amenities?.length && <span className="text-sm text-[var(--muted)]">Not specified</span>}
                </div>
              </div>
              <div className="card p-5">
                <h3 className="font-semibold">House rules</h3>
                <ul className="text-sm text-[var(--muted)] mt-3 space-y-1">
                  {(p.rules || []).map((r, i) => <li key={i}>• {r}</li>)}
                  {!p.rules?.length && <li>No specific rules</li>}
                </ul>
              </div>
            </div>

            <div className="card p-5">
              <h3 className="font-semibold flex items-center gap-2"><MapPin className="w-4 h-4" /> Location</h3>
              <div className="h-64 mt-3">
                <MapContainer center={[p.latitude, p.longitude]} zoom={14} style={{ height: "100%", width: "100%" }}>
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[p.latitude, p.longitude]} />
                </MapContainer>
              </div>
            </div>

            <div className="card p-5">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Reviews ({reviews.length})</h3>
                {p.rating > 0 && <div className="flex items-center gap-1 text-sm"><Star className="w-4 h-4 star-fill" /> {p.rating}</div>}
              </div>
              <div className="mt-4 space-y-3">
                {reviews.length === 0 && <p className="text-sm text-[var(--muted)]">No reviews yet.</p>}
                {reviews.map((r) => (
                  <div key={r.id} className="border-l-2 border-[var(--accent)] pl-3 py-1" data-testid={`review-${r.id}`}>
                    <div className="flex items-center gap-2 text-sm">
                      <b>{r.user_name}</b>
                      <div className="flex">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="w-3 h-3 star-fill" />)}</div>
                      <span className="text-xs text-[var(--muted)] ml-auto">{new Date(r.created_at).toLocaleDateString()}</span>
                    </div>
                    <p className="text-sm text-[var(--muted)] mt-1">{r.comment}</p>
                    {r.owner_reply && <div className="mt-2 ml-3 p-2 bg-[var(--bg-2)] rounded-md text-xs"><b>Owner:</b> {r.owner_reply}</div>}
                  </div>
                ))}
              </div>
              {user && !isOwner && (
                <div className="mt-5 pt-4 border-t border-[var(--border)]">
                  <div className="text-sm font-medium mb-2">Leave a review</div>
                  <div className="flex gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button key={i} onClick={() => setReviewForm({ ...reviewForm, rating: i })} data-testid={`review-star-${i}`}>
                        <Star className={`w-5 h-5 ${i <= reviewForm.rating ? "star-fill" : "text-[var(--muted)]"}`} />
                      </button>
                    ))}
                  </div>
                  <textarea className="field" rows={3} placeholder="Share your experience…" value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} data-testid="review-comment" />
                  <button onClick={submitReview} className="btn btn-primary mt-2" data-testid="review-submit">Post review</button>
                </div>
              )}
            </div>
          </div>

          {/* Right rail */}
          <div>
            <div className="card p-5 sticky top-20">
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-semibold">₹{p.rent.toLocaleString("en-IN")}</span>
                <span className="text-sm text-[var(--muted)]">/ month</span>
              </div>
              <div className="text-xs text-[var(--muted)] mt-1">+ ₹{p.deposit.toLocaleString("en-IN")} security deposit</div>

              {p.owner && (
                <div className="flex items-center gap-3 mt-4 pt-4 border-t border-[var(--border)]">
                  {p.owner.picture ? <img src={p.owner.picture} className="w-9 h-9 rounded-full" alt="" /> : (
                    <div className="w-9 h-9 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-xs font-semibold">{p.owner.name?.[0]?.toUpperCase()}</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm flex items-center gap-1">{p.owner.name} {p.owner.verified && <BadgeCheck className="w-3.5 h-3.5 text-[var(--accent)]" />}</div>
                    <div className="text-xs text-[var(--muted)]">Property owner</div>
                  </div>
                </div>
              )}

              {isOwner ? (
                <div className="mt-5 space-y-2">
                  <div className="badge badge-info w-full justify-center !py-2"><Building2 className="w-3.5 h-3.5" /> This is your property</div>
                  <Link to={`/dashboard/list-property?id=${p.id}`} className="btn btn-primary w-full" data-testid="own-edit"><Edit className="w-4 h-4" /> Edit property</Link>
                  <Link to="/dashboard" className="btn btn-outline w-full" data-testid="own-manage">Manage listings</Link>
                </div>
              ) : (
                <div className="mt-5 pt-5 border-t border-[var(--border)] space-y-4">
                  <div>
                    <div className="text-sm font-medium mb-2">Book a visit</div>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" className="field !py-2" value={date} onChange={(e) => setDate(e.target.value)} data-testid="visit-date" />
                      <input type="time" className="field !py-2" value={time} onChange={(e) => setTime(e.target.value)} data-testid="visit-time" />
                    </div>
                    <textarea className="field mt-2" rows={2} placeholder="Optional message…" value={msg} onChange={(e) => setMsg(e.target.value)} data-testid="visit-message" />
                    <button onClick={book} className="btn btn-accent w-full mt-2" data-testid="visit-submit"><Calendar className="w-4 h-4" /> Request visit</button>
                  </div>
                  <div className="pt-4 border-t border-[var(--border)]">
                    <div className="text-sm font-medium mb-2">Send a message</div>
                    <textarea className="field" rows={2} placeholder="Hi, is this still available?" value={chatText} onChange={(e) => setChatText(e.target.value)} data-testid="chat-text" />
                    <button onClick={sendChat} className="btn btn-outline w-full mt-2" data-testid="chat-send"><MessageCircle className="w-4 h-4" /> Message owner</button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
