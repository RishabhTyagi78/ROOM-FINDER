import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api, { formatError } from "@/lib/api";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import { Building2, Home, Calendar, Wallet, MessageCircle, Heart, FileText, Bell, Plus, BarChart3, User, Eye, Edit, Trash2, ArrowRightLeft, CheckCircle2, XCircle, Clock, ChevronRight } from "lucide-react";
import PropertyCard from "@/components/PropertyCard";

export default function Dashboard() {
  const { user, loading, setActiveRole } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [tab, setTab] = useState((user?.role === "khatta") ? "owner" : "tenant");
  // sync tab when user.role changes
  useEffect(() => { if (user?.role === "khatta") setTab("owner"); else if (user?.role === "meetha") setTab("tenant"); }, [user?.role]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-[var(--muted)]">Loading…</div>;
  if (!user) { nav("/login"); return null; }
  if (user.roles?.includes("admin")) { nav("/admin"); return null; }

  const switchView = async (mode) => {
    setTab(mode);
    try { await setActiveRole(mode === "owner" ? "khatta" : "meetha"); } catch {}
  };

  return (
    <div className="min-h-screen bg-[var(--bg-2)]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-end justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">Dashboard</h1>
            <p className="text-sm text-[var(--muted)] mt-1">Welcome back, {user.name}.</p>
          </div>
          {/* Role Switcher */}
          <div className="flex items-center gap-2 p-1 bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-sm" data-testid="role-switcher">
            <button onClick={() => switchView("tenant")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-2 ${tab === "tenant" ? "bg-[var(--ink)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
              data-testid="switch-tenant">
              <User className="w-3.5 h-3.5" /> Tenant view
            </button>
            <button onClick={() => switchView("owner")}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition flex items-center gap-2 ${tab === "owner" ? "bg-[var(--ink)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
              data-testid="switch-owner">
              <Building2 className="w-3.5 h-3.5" /> Owner view
            </button>
          </div>
        </div>

        <div className="mt-6">
          {tab === "owner" ? <OwnerDashboard /> : <TenantDashboard />}
        </div>
      </div>
    </div>
  );
}

function OwnerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [props, setProps] = useState([]);
  const [appts, setAppts] = useState([]);
  const [section, setSection] = useState("overview");

  const load = async () => {
    try {
      const [s, p, a] = await Promise.all([
        api.get("/dashboard/khatta"),
        api.get("/properties", { params: { owner_id: user.id } }),
        api.get("/appointments"),
      ]);
      setStats(s.data); setProps(p.data);
      setAppts(a.data.filter((x) => x.owner_id === user.id));
    } catch (e) { toast.error(formatError(e)); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const updateAppt = async (id, status) => {
    try { await api.patch(`/appointments/${id}`, { status }); toast.success("Updated"); load(); }
    catch (e) { toast.error(formatError(e)); }
  };
  const togglePropStatus = async (p) => {
    try { await api.patch(`/properties/${p.id}/status`, { status: p.status === "available" ? "occupied" : "available" }); load(); } catch {}
  };
  const delProp = async (id) => {
    if (!window.confirm("Delete this property?")) return;
    try { await api.delete(`/properties/${id}`); toast.success("Deleted"); load(); } catch (e) { toast.error(formatError(e)); }
  };

  const cards = [
    { l: "Properties", v: stats.total_properties || 0, c: "bg-[var(--accent-soft)] text-[var(--accent)]", I: Building2 },
    { l: "Available", v: stats.available || 0, c: "bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300", I: Home },
    { l: "Occupied", v: stats.occupied || 0, c: "bg-orange-50 text-orange-700 dark:bg-orange-900/20 dark:text-orange-300", I: User },
    { l: "Pending visits", v: stats.pending_appointments || 0, c: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300", I: Calendar },
    { l: "Active chats", v: stats.active_chats || 0, c: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", I: MessageCircle },
    { l: "Rent collected", v: `₹${(stats.rent_collected || 0).toLocaleString("en-IN")}`, c: "bg-slate-900 text-white", I: Wallet },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3" data-testid="owner-stats">
        {cards.map((c, i) => (
          <div key={i} className="card p-4" data-testid={`stat-${i}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.c}`}><c.I className="w-4 h-4" /></div>
            <div className="text-xs text-[var(--muted)] mt-3">{c.l}</div>
            <div className="text-xl font-semibold mt-0.5">{c.v}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 p-1 bg-[var(--card)] border border-[var(--border)] rounded-lg" data-testid="owner-sections">
          {[["overview", "Properties", Building2], ["appointments", "Visits", Calendar], ["rent", "Rent", Wallet]].map(([k, l, I]) => (
            <button key={k} onClick={() => setSection(k)}
              className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-1.5 transition ${section === k ? "bg-[var(--ink)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
              data-testid={`tab-${k}`}>
              <I className="w-3.5 h-3.5" /> {l}
            </button>
          ))}
        </div>
        <Link to="/dashboard/list-property" className="btn btn-accent" data-testid="add-prop-btn"><Plus className="w-4 h-4" /> Add property</Link>
      </div>

      <div className="mt-5">
        {section === "overview" && (
          props.length === 0 ? (
            <div className="card p-12 text-center">
              <Building2 className="w-10 h-10 mx-auto text-[var(--muted)]" />
              <div className="font-medium mt-3">No properties yet</div>
              <div className="text-sm text-[var(--muted)] mt-1">Add your first property to start receiving visit requests.</div>
              <Link to="/dashboard/list-property" className="btn btn-primary mt-4">Add property</Link>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {props.map((p) => (
                <div key={p.id} className="card p-4" data-testid={`own-prop-${p.id}`}>
                  <Link to={`/property/${p.id}`} className="font-medium hover:text-[var(--accent)] line-clamp-1">{p.title}</Link>
                  <div className="text-xs text-[var(--muted)] mt-0.5">{p.city} · {p.property_type}</div>
                  <div className="flex items-center justify-between mt-3">
                    <div className="font-semibold">₹{p.rent.toLocaleString("en-IN")}</div>
                    <button onClick={() => togglePropStatus(p)}
                      className={`badge ${p.status === "available" ? "badge-success" : "badge-mute"}`} data-testid={`toggle-${p.id}`}>
                      {p.status}
                    </button>
                  </div>
                  <div className="mt-3 flex gap-2 pt-3 border-t border-[var(--border)]">
                    <Link to={`/dashboard/list-property?id=${p.id}`} className="btn btn-outline flex-1 !py-1.5 !text-xs" data-testid={`edit-${p.id}`}><Edit className="w-3 h-3" /> Edit</Link>
                    <Link to={`/property/${p.id}`} className="btn btn-outline !py-1.5 !text-xs"><Eye className="w-3 h-3" /></Link>
                    <button onClick={() => delProp(p.id)} className="btn btn-outline !py-1.5 !text-xs text-red-600 hover:bg-red-50" data-testid={`del-${p.id}`}><Trash2 className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {section === "appointments" && (
          appts.length === 0 ? (
            <div className="card p-12 text-center text-[var(--muted)]"><Calendar className="w-10 h-10 mx-auto mb-3" />No visit requests yet</div>
          ) : (
            <div className="card divide-y divide-[var(--border)]">
              {appts.map((a) => (
                <div key={a.id} className="p-4 flex flex-wrap items-center gap-3" data-testid={`appt-${a.id}`}>
                  <div className="w-10 h-10 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center font-semibold">{a.tenant_name?.[0]}</div>
                  <div className="flex-1 min-w-[160px]">
                    <div className="font-medium text-sm">{a.tenant_name} → {a.property_title}</div>
                    <div className="text-xs text-[var(--muted)] flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(a.visit_date).toLocaleString()}</div>
                    {a.message && <div className="text-xs mt-1 text-[var(--muted-2)]">"{a.message}"</div>}
                  </div>
                  <span className={`badge ${a.status === "approved" ? "badge-success" : a.status === "rejected" ? "badge-mute" : "badge-warn"}`}>{a.status}</span>
                  {a.status === "pending" && (
                    <div className="flex gap-1">
                      <button onClick={() => updateAppt(a.id, "approved")} className="btn btn-primary !py-1.5 !text-xs" data-testid={`appt-approve-${a.id}`}><CheckCircle2 className="w-3 h-3" /> Approve</button>
                      <button onClick={() => updateAppt(a.id, "rejected")} className="btn btn-outline !py-1.5 !text-xs text-red-600" data-testid={`appt-reject-${a.id}`}><XCircle className="w-3 h-3" /></button>
                    </div>
                  )}
                  <Link to={`/chat/${a.tenant_id}?property=${a.property_id}`} className="btn btn-outline !py-1.5 !text-xs" data-testid={`chat-tenant-${a.id}`}><MessageCircle className="w-3 h-3" /></Link>
                </div>
              ))}
            </div>
          )
        )}

        {section === "rent" && (
          <div className="card p-12 text-center text-[var(--muted)]">
            <Wallet className="w-10 h-10 mx-auto mb-3" />
            <div>Rent management — track payments, send reminders.</div>
            <p className="text-xs mt-1">Coming soon — payment integration in progress.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function TenantDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [saved, setSaved] = useState([]);
  const [appts, setAppts] = useState([]);
  const [docs, setDocs] = useState([]);
  const [viewed, setViewed] = useState([]);
  const [section, setSection] = useState("overview");
  const [docType, setDocType] = useState("Aadhaar");

  const load = async () => {
    try {
      const [s, f, a, d, v] = await Promise.all([
        api.get("/dashboard/meetha"),
        api.get("/favorites"),
        api.get("/appointments"),
        api.get("/documents"),
        api.get("/properties-viewed"),
      ]);
      setStats(s.data); setSaved(f.data);
      setAppts(a.data.filter((x) => x.tenant_id === user.id));
      setDocs(d.data); setViewed(v.data);
    } catch (e) { toast.error(formatError(e)); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const uploadDoc = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const fd = new FormData(); fd.append("file", file);
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      await api.post("/documents", { doc_type: docType, url: data.url });
      toast.success("Document uploaded"); load();
    } catch (e) { toast.error(formatError(e)); }
  };

  const cards = [
    { l: "Saved", v: stats.saved_properties || 0, c: "bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-300", I: Heart },
    { l: "Upcoming visits", v: stats.upcoming_visits || 0, c: "bg-[var(--accent-soft)] text-[var(--accent)]", I: Calendar },
    { l: "Unread messages", v: stats.unread_messages || 0, c: "bg-purple-50 text-purple-700 dark:bg-purple-900/20 dark:text-purple-300", I: MessageCircle },
    { l: "Viewed", v: stats.viewed_properties || 0, c: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", I: Eye },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" data-testid="tenant-stats">
        {cards.map((c, i) => (
          <div key={i} className="card p-4" data-testid={`m-stat-${i}`}>
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${c.c}`}><c.I className="w-4 h-4" /></div>
            <div className="text-xs text-[var(--muted)] mt-3">{c.l}</div>
            <div className="text-xl font-semibold mt-0.5">{c.v}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 flex gap-1 p-1 bg-[var(--card)] border border-[var(--border)] rounded-lg w-fit" data-testid="tenant-sections">
        {[["overview", "Saved", Heart], ["visits", "Visits", Calendar], ["viewed", "Recently viewed", Eye], ["documents", "Documents", FileText]].map(([k, l, I]) => (
          <button key={k} onClick={() => setSection(k)}
            className={`px-3 py-1.5 text-sm rounded-md flex items-center gap-1.5 transition ${section === k ? "bg-[var(--ink)] text-white" : "text-[var(--muted)] hover:text-[var(--ink)]"}`}
            data-testid={`m-tab-${k}`}>
            <I className="w-3.5 h-3.5" /> {l}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {section === "overview" && (
          saved.length === 0 ? (
            <div className="card p-12 text-center"><Heart className="w-10 h-10 mx-auto text-[var(--muted)] mb-3" /><div>No saved properties yet.</div><Link to="/explore" className="btn btn-primary mt-3">Browse</Link></div>
          ) : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{saved.map((p) => <PropertyCard key={p.id} p={p} />)}</div>
        )}

        {section === "visits" && (
          appts.length === 0 ? (
            <div className="card p-12 text-center text-[var(--muted)]"><Calendar className="w-10 h-10 mx-auto mb-3" />No visits booked yet.</div>
          ) : (
            <div className="card divide-y divide-[var(--border)]">
              {appts.map((a) => (
                <div key={a.id} className="p-4 flex flex-wrap items-center gap-3" data-testid={`m-appt-${a.id}`}>
                  <div className="flex-1 min-w-[160px]">
                    <Link to={`/property/${a.property_id}`} className="font-medium hover:text-[var(--accent)]">{a.property_title}</Link>
                    <div className="text-xs text-[var(--muted)] flex items-center gap-1"><Clock className="w-3 h-3" /> {new Date(a.visit_date).toLocaleString()}</div>
                  </div>
                  <span className={`badge ${a.status === "approved" ? "badge-success" : a.status === "rejected" ? "badge-mute" : "badge-warn"}`}>{a.status}</span>
                  <Link to={`/chat/${a.owner_id}?property=${a.property_id}`} className="btn btn-outline !py-1.5 !text-xs"><MessageCircle className="w-3 h-3" /></Link>
                </div>
              ))}
            </div>
          )
        )}

        {section === "viewed" && (
          viewed.length === 0 ? (
            <div className="card p-12 text-center text-[var(--muted)]"><Eye className="w-10 h-10 mx-auto mb-3" />Nothing viewed yet.</div>
          ) : <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">{viewed.map((p) => <PropertyCard key={p.id} p={p} />)}</div>
        )}

        {section === "documents" && (
          <div>
            <div className="card p-4 flex flex-wrap items-center gap-3 mb-4">
              <select className="field w-auto" value={docType} onChange={(e) => setDocType(e.target.value)} data-testid="doc-type">
                <option>Aadhaar</option><option>PAN</option><option>College ID</option><option>Government ID</option>
              </select>
              <label className="btn btn-accent cursor-pointer" data-testid="doc-upload-label">
                <Plus className="w-4 h-4" /> Upload document
                <input type="file" hidden onChange={uploadDoc} data-testid="doc-upload-input" />
              </label>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {docs.map((d) => (
                <div key={d.id} className="card p-4 flex items-center gap-3" data-testid={`doc-${d.id}`}>
                  <div className="w-9 h-9 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center"><FileText className="w-4 h-4" /></div>
                  <div className="flex-1">
                    <div className="font-medium text-sm">{d.doc_type}</div>
                    <span className={`badge mt-1 ${d.verified ? "badge-success" : "badge-warn"}`}>{d.verified ? "Verified" : "Pending"}</span>
                  </div>
                  <a href={d.url.startsWith("http") ? d.url : `${process.env.REACT_APP_BACKEND_URL}${d.url}`} target="_blank" rel="noreferrer" className="btn btn-outline !py-1.5 !text-xs" data-testid={`doc-view-${d.id}`}>View</a>
                </div>
              ))}
              {docs.length === 0 && <div className="card p-8 text-center text-[var(--muted)] text-sm col-span-full">Upload your KYC docs for faster approval.</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
