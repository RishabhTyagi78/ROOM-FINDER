import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import api, { formatError } from "@/lib/api";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Building2, Home, Calendar as CalIcon, Users, Wallet, MessageCircle, BadgeCheck } from "lucide-react";
import { toast } from "sonner";

export default function KhattaDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [stats, setStats] = useState({});
  const [props, setProps] = useState([]);
  const [appts, setAppts] = useState([]);
  const [tab, setTab] = useState("overview");
  const [rentRecs, setRentRecs] = useState([]);

  const load = async () => {
    try {
      const [s, p, a, r] = await Promise.all([
        api.get("/dashboard/khatta"),
        api.get("/properties", { params: { owner_id: user.id } }),
        api.get("/appointments"),
        api.get("/rent-records"),
      ]);
      setStats(s.data); setProps(p.data); setAppts(a.data); setRentRecs(r.data);
    } catch (e) { toast.error(formatError(e)); }
  };

  useEffect(() => { if (user?.role === "khatta") load(); }, [user]); // eslint-disable-line

  if (!user) { nav("/login"); return null; }
  if (user.role !== "khatta") return <div><Navbar /><div className="p-10">Khatta only.</div></div>;

  const updateAppt = async (id, status) => {
    try { await api.patch(`/appointments/${id}`, { status }); toast.success("Updated"); load(); }
    catch (e) { toast.error(formatError(e)); }
  };
  const togglePropStatus = async (p) => {
    try { await api.patch(`/properties/${p.id}/status`, { status: p.status === "available" ? "occupied" : "available" }); load(); }
    catch (e) { toast.error(formatError(e)); }
  };
  const delProp = async (id) => {
    if (!window.confirm("Delete this property?")) return;
    try { await api.delete(`/properties/${id}`); toast.success("Deleted"); load(); }
    catch (e) { toast.error(formatError(e)); }
  };

  const cards = [
    { l: "Properties", v: stats.total_properties, c: "!bg-white", I: Building2 },
    { l: "Available", v: stats.available, c: "!bg-[#D9F845]", I: Home },
    { l: "Occupied", v: stats.occupied, c: "!bg-[#FF4D00] text-white", I: Users },
    { l: "Pending Visits", v: stats.pending_appointments, c: "!bg-white", I: CalIcon },
    { l: "Rent Collected", v: `₹${(stats.rent_collected || 0).toLocaleString("en-IN")}`, c: "!bg-zinc-950 text-white", I: Wallet },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-4xl uppercase">KHATTA DASH</h1>
            <p className="font-mono text-xs uppercase opacity-60">Welcome back, {user.name}</p>
          </div>
          <Link to="/khatta/add" className="btn-brutal btn-meetha" data-testid="add-prop-btn">
            <Plus className="w-4 h-4" strokeWidth={3} /> Add Property
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mt-6">
          {cards.map((c, i) => (
            <div key={i} className={`card-brutal p-4 ${c.c}`} data-testid={`stat-${i}`}>
              <c.I className="w-5 h-5 md:w-6 md:h-6 mb-2" strokeWidth={3} />
              <div className="font-mono text-[10px] md:text-xs uppercase opacity-80">{c.l}</div>
              <div className="font-display text-2xl md:text-3xl mt-1">{c.v ?? 0}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex gap-2 flex-wrap">
          {["overview", "appointments", "rent"].map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`btn-brutal ${tab === t ? "btn-ink" : ""}`} data-testid={`tab-${t}`}>{t.toUpperCase()}</button>
          ))}
        </div>

        {tab === "overview" && (
          <div className="mt-6">
            <h2 className="font-display text-2xl uppercase mb-4">My Properties</h2>
            {props.length === 0 ? (
              <div className="card-brutal p-6">No properties yet. <Link to="/khatta/add" className="underline">Add one</Link>.</div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                {props.map((p) => (
                  <div key={p.id} className="card-brutal p-4" data-testid={`own-prop-${p.id}`}>
                    <Link to={`/property/${p.id}`} className="font-display text-xl hover:underline">{p.title}</Link>
                    <div className="text-sm">{p.city} · {p.property_type}</div>
                    <div className="mt-2 flex items-center justify-between">
                      <div className="font-display text-2xl">₹{p.rent.toLocaleString("en-IN")}</div>
                      <button onClick={() => togglePropStatus(p)} className={`badge-brutal ${p.status === "available" ? "bg-[#D9F845]" : ""}`} data-testid={`toggle-${p.id}`}>{p.status}</button>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Link to={`/khatta/edit/${p.id}`} className="btn-brutal flex-1" data-testid={`edit-${p.id}`}><Edit className="w-4 h-4" strokeWidth={3} /> Edit</Link>
                      <button onClick={() => delProp(p.id)} className="btn-brutal" data-testid={`del-${p.id}`}><Trash2 className="w-4 h-4" strokeWidth={3} /></button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "appointments" && (
          <div className="mt-6">
            <h2 className="font-display text-2xl uppercase mb-4">Visit Requests</h2>
            {appts.length === 0 ? <div className="card-brutal p-6">No appointments.</div> : (
              <div className="space-y-3">
                {appts.map((a) => (
                  <div key={a.id} className="card-brutal p-4 flex flex-wrap items-center gap-3" data-testid={`appt-${a.id}`}>
                    <div className="flex-1 min-w-[200px]">
                      <div className="font-display text-lg">{a.tenant_name} → {a.property_title}</div>
                      <div className="font-mono text-xs uppercase">{new Date(a.visit_date).toLocaleString()}</div>
                      {a.message && <p className="text-sm mt-1">"{a.message}"</p>}
                    </div>
                    <span className={`badge-brutal ${a.status === "approved" ? "bg-[#D9F845]" : a.status === "rejected" ? "bg-zinc-200" : "bg-[#FF4D00] text-white"}`}>{a.status}</span>
                    {a.status === "pending" && (
                      <div className="flex gap-2">
                        <button onClick={() => updateAppt(a.id, "approved")} className="btn-brutal btn-khatta" data-testid={`appt-approve-${a.id}`}>Approve</button>
                        <button onClick={() => updateAppt(a.id, "rejected")} className="btn-brutal" data-testid={`appt-reject-${a.id}`}>Reject</button>
                      </div>
                    )}
                    <Link to={`/chat/${a.tenant_id}?property=${a.property_id}`} className="btn-brutal" data-testid={`chat-tenant-${a.id}`}><MessageCircle className="w-4 h-4" strokeWidth={3} /></Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {tab === "rent" && (
          <div className="mt-6">
            <h2 className="font-display text-2xl uppercase mb-4">Rent Records</h2>
            {rentRecs.length === 0 ? <div className="card-brutal p-6">No records.</div> : (
              <div className="space-y-2">
                {rentRecs.map((r) => (
                  <div key={r.id} className="card-brutal p-3 flex items-center gap-3" data-testid={`rent-${r.id}`}>
                    <div className="flex-1">
                      <div className="font-bold">₹{r.amount} · {r.month}</div>
                      <div className="font-mono text-xs">{r.status}</div>
                    </div>
                    <button onClick={async () => { await api.patch(`/rent-records/${r.id}`, { status: "paid" }); load(); }} className="btn-brutal" data-testid={`paid-${r.id}`}>Mark Paid</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
