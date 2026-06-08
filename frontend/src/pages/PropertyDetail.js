import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import api, { formatError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import { Calendar, MessageCircle, Star, MapPin, Wifi, Wind, Car, Utensils, Home, ChevronLeft } from "lucide-react";

export default function PropertyDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const nav = useNavigate();
  const [p, setP] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [date, setDate] = useState("");
  const [msg, setMsg] = useState("");
  const [chatText, setChatText] = useState("");
  const [activeImg, setActiveImg] = useState(0);
  const [reviewForm, setReviewForm] = useState({ rating: 5, comment: "" });

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
    if (user.role !== "meetha") return toast.error("Only tenants can book visits");
    if (!date) return toast.error("Pick a date");
    try {
      await api.post("/appointments", { property_id: id, visit_date: date, message: msg });
      toast.success("Visit requested!");
      setDate(""); setMsg("");
    } catch (e) { toast.error(formatError(e)); }
  };

  const sendChat = async () => {
    if (!user) return nav("/login");
    if (!chatText.trim()) return;
    try {
      await api.post("/messages", { to_user_id: p.owner_id, property_id: p.id, text: chatText });
      toast.success("Message sent!");
      setChatText("");
      nav(`/chat/${p.owner_id}?property=${p.id}`);
    } catch (e) { toast.error(formatError(e)); }
  };

  const submitReview = async () => {
    if (!user) return nav("/login");
    try {
      await api.post("/reviews", { property_id: id, ...reviewForm });
      toast.success("Review posted!");
      setReviewForm({ rating: 5, comment: "" });
      load();
    } catch (e) { toast.error(formatError(e)); }
  };

  if (!p) return <div><Navbar /><div className="p-10 font-display text-2xl">Loading…</div></div>;

  const imageUrls = (p.images || []).map((i) => i.startsWith("http") ? i : `${process.env.REACT_APP_BACKEND_URL}${i}`);
  if (imageUrls.length === 0) imageUrls.push("https://images.pexels.com/photos/8146330/pexels-photo-8146330.jpeg");

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        <Link to="/explore" className="font-mono text-xs uppercase inline-flex items-center gap-1 mb-4" data-testid="back-link"><ChevronLeft className="w-3 h-3" /> Back to explore</Link>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Media + content */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <div className="card-brutal p-0 overflow-hidden">
                <img src={imageUrls[activeImg]} alt={p.title} className="w-full h-96 object-cover" data-testid="detail-main-image" />
              </div>
              {imageUrls.length > 1 && (
                <div className="grid grid-cols-5 gap-2 mt-2">
                  {imageUrls.map((u, i) => (
                    <button key={i} onClick={() => setActiveImg(i)} className={`card-brutal p-0 overflow-hidden ${i === activeImg ? "ring-2 ring-[#FF4D00]" : ""}`} data-testid={`thumb-${i}`}>
                      <img src={u} alt="" className="w-full h-16 object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="card-brutal p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h1 className="font-display text-3xl uppercase">{p.title}</h1>
                  <div className="flex items-center gap-2 text-sm text-zinc-600 mt-1">
                    <MapPin className="w-4 h-4" strokeWidth={3} /> {p.address}, {p.city}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-xs uppercase">Rent</div>
                  <div className="font-display text-3xl text-[#FF4D00]">₹{p.rent.toLocaleString("en-IN")}</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-2 mt-4">
                <span className="badge-brutal bg-[#D9F845]">{p.property_type}</span>
                <span className="badge-brutal">{p.furnished}</span>
                <span className="badge-brutal">{p.status === "available" ? "AVAILABLE" : "OCCUPIED"}</span>
                {p.ac && <span className="badge-brutal">AC</span>}
                {p.wifi && <span className="badge-brutal">WiFi</span>}
                {p.parking && <span className="badge-brutal">Parking</span>}
                {p.food_included && <span className="badge-brutal">Food</span>}
                {p.attached_bath && <span className="badge-brutal">Attached Bath</span>}
                {p.balcony && <span className="badge-brutal">Balcony</span>}
              </div>
              <p className="mt-5 text-zinc-700 whitespace-pre-line">{p.description}</p>

              <div className="grid sm:grid-cols-2 gap-3 mt-6">
                <div>
                  <div className="font-mono text-xs uppercase mb-2">Amenities</div>
                  <div className="flex flex-wrap gap-1">
                    {(p.amenities || []).map((a) => <span key={a} className="badge-brutal">{a}</span>)}
                    {!p.amenities?.length && <span className="text-sm text-zinc-500">Not specified</span>}
                  </div>
                </div>
                <div>
                  <div className="font-mono text-xs uppercase mb-2">House Rules</div>
                  <ul className="text-sm list-disc pl-4 space-y-1">
                    {(p.rules || []).map((r, i) => <li key={i}>{r}</li>)}
                    {!p.rules?.length && <li className="text-zinc-500 list-none">No rules</li>}
                  </ul>
                </div>
              </div>

              <div className="mt-6">
                <div className="font-mono text-xs uppercase mb-2">Location</div>
                <div className="h-64">
                  <MapContainer center={[p.latitude, p.longitude]} zoom={14} style={{ height: "100%", width: "100%" }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    <Marker position={[p.latitude, p.longitude]} />
                  </MapContainer>
                </div>
              </div>
            </div>

            {/* Reviews */}
            <div className="card-brutal p-6">
              <h2 className="font-display text-2xl uppercase">Reviews ({reviews.length})</h2>
              {reviews.length === 0 && <p className="text-sm text-zinc-600 mt-2">No reviews yet.</p>}
              <div className="mt-4 space-y-4">
                {reviews.map((r) => (
                  <div key={r.id} className="border-l-4 border-zinc-950 pl-3" data-testid={`review-${r.id}`}>
                    <div className="flex items-center gap-2"><b>{r.user_name}</b>
                      <div className="flex">{Array.from({ length: r.rating }).map((_, i) => <Star key={i} className="w-3 h-3 fill-[#FF4D00]" />)}</div>
                    </div>
                    <p className="text-sm mt-1">{r.comment}</p>
                    {r.owner_reply && <div className="mt-2 ml-4 card-brutal p-2 bg-[#D9F845]"><b className="font-mono text-xs">OWNER:</b> {r.owner_reply}</div>}
                  </div>
                ))}
              </div>
              {user?.role === "meetha" && (
                <div className="mt-6 border-t-2 border-dashed border-zinc-300 pt-4">
                  <div className="font-mono text-xs uppercase mb-2">Leave a Review</div>
                  <div className="flex gap-1 mb-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <button key={i} onClick={() => setReviewForm({ ...reviewForm, rating: i })} data-testid={`review-star-${i}`}>
                        <Star className={`w-6 h-6 ${i <= reviewForm.rating ? "fill-[#FF4D00]" : ""}`} strokeWidth={3} />
                      </button>
                    ))}
                  </div>
                  <textarea className="input-brutal" rows={3} placeholder="How was your experience?" value={reviewForm.comment} onChange={(e) => setReviewForm({ ...reviewForm, comment: e.target.value })} data-testid="review-comment" />
                  <button onClick={submitReview} className="btn-brutal btn-ink mt-2" data-testid="review-submit">Post Review</button>
                </div>
              )}
            </div>
          </div>

          {/* Right rail */}
          <div className="space-y-4">
            <div className="card-brutal p-6 sticky top-20">
              {p.owner && (
                <div className="flex items-center gap-3 pb-4 border-b-2 border-dashed border-zinc-300">
                  <div className="w-12 h-12 bg-[#D9F845] border-2 border-zinc-950 flex items-center justify-center font-display text-xl">{p.owner.name?.[0]}</div>
                  <div>
                    <div className="font-bold">{p.owner.name}</div>
                    <div className="font-mono text-xs uppercase">Property Owner</div>
                  </div>
                </div>
              )}
              <div className="mt-4 space-y-3">
                <div>
                  <div className="font-mono text-xs uppercase">Security Deposit</div>
                  <div className="font-display text-xl">₹{p.deposit.toLocaleString("en-IN")}</div>
                </div>
                <div className="border-t-2 border-dashed border-zinc-300 pt-3">
                  <div className="font-mono text-xs uppercase">Book a Visit</div>
                  <input type="datetime-local" className="input-brutal mt-1" value={date} onChange={(e) => setDate(e.target.value)} data-testid="visit-date" />
                  <textarea className="input-brutal mt-2" rows={2} placeholder="Optional message" value={msg} onChange={(e) => setMsg(e.target.value)} data-testid="visit-message" />
                  <button onClick={book} className="btn-brutal btn-meetha w-full mt-2" data-testid="visit-submit">
                    <Calendar className="w-4 h-4" strokeWidth={3} /> Request Visit
                  </button>
                </div>
                <div className="border-t-2 border-dashed border-zinc-300 pt-3">
                  <div className="font-mono text-xs uppercase">Send a quick message</div>
                  <textarea className="input-brutal mt-1" rows={2} placeholder="Hi, is this still available?" value={chatText} onChange={(e) => setChatText(e.target.value)} data-testid="chat-text" />
                  <button onClick={sendChat} className="btn-brutal btn-ink w-full mt-2" data-testid="chat-send">
                    <MessageCircle className="w-4 h-4" strokeWidth={3} /> Send
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
