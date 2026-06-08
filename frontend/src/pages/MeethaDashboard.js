import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import { useAuth } from "@/context/AuthContext";
import api, { formatError } from "@/lib/api";
import { Link, useNavigate } from "react-router-dom";
import { Heart, Calendar, MessageCircle, FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import PropertyCard from "@/components/PropertyCard";

export default function MeethaDashboard() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [stats, setStats] = useState({});
  const [saved, setSaved] = useState([]);
  const [appts, setAppts] = useState([]);
  const [docs, setDocs] = useState([]);
  const [tab, setTab] = useState("saved");
  const [docType, setDocType] = useState("Aadhaar");
  const [uploadBusy, setUploadBusy] = useState(false);

  const load = async () => {
    try {
      const [s, f, a, d] = await Promise.all([
        api.get("/dashboard/meetha"),
        api.get("/favorites"),
        api.get("/appointments"),
        api.get("/documents"),
      ]);
      setStats(s.data); setSaved(f.data); setAppts(a.data); setDocs(d.data);
    } catch (e) { toast.error(formatError(e)); }
  };

  useEffect(() => { if (user?.role === "meetha") load(); }, [user]); // eslint-disable-line

  if (!user) { nav("/login"); return null; }
  if (user.role !== "meetha") return <div><Navbar /><div className="p-10">Meetha only.</div></div>;

  const uploadDoc = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    setUploadBusy(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const { data } = await api.post("/upload", fd, { headers: { "Content-Type": "multipart/form-data" } });
      await api.post("/documents", { doc_type: docType, url: data.url });
      toast.success("Document uploaded");
      load();
    } catch (e2) { toast.error(formatError(e2)); }
    finally { setUploadBusy(false); }
  };

  const cards = [
    { l: "Saved Properties", v: stats.saved_properties, c: "bg-[#D9F845]" },
    { l: "Upcoming Visits", v: stats.upcoming_visits, c: "bg-white" },
    { l: "Unread Messages", v: stats.unread_messages, c: "bg-[#FF4D00] text-white" },
  ];

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <h1 className="font-display text-4xl uppercase">MEETHA DASH</h1>
        <p className="font-mono text-xs uppercase opacity-60">Hi {user.name}, find your spot.</p>

        <div className="grid sm:grid-cols-3 gap-4 mt-6">
          {cards.map((c, i) => (
            <div key={i} className={`card-brutal p-4 ${c.c}`} data-testid={`m-stat-${i}`}>
              <div className="font-mono text-xs uppercase opacity-80">{c.l}</div>
              <div className="font-display text-3xl mt-1">{c.v ?? 0}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 flex gap-2 flex-wrap">
          {["saved", "visits", "documents"].map((t) => (
            <button key={t} onClick={() => setTab(t)} className={`btn-brutal ${tab === t ? "btn-ink" : ""}`} data-testid={`m-tab-${t}`}>{t.toUpperCase()}</button>
          ))}
        </div>

        {tab === "saved" && (
          <div className="mt-6">
            {saved.length === 0 ? <div className="card-brutal p-6">No saved properties. <Link to="/explore" className="underline">Browse →</Link></div> : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {saved.map((p) => <PropertyCard key={p.id} p={p} />)}
              </div>
            )}
          </div>
        )}

        {tab === "visits" && (
          <div className="mt-6 space-y-2">
            {appts.length === 0 ? <div className="card-brutal p-6">No visits.</div> : appts.map((a) => (
              <div key={a.id} className="card-brutal p-4 flex flex-wrap items-center gap-3" data-testid={`m-appt-${a.id}`}>
                <div className="flex-1">
                  <Link to={`/property/${a.property_id}`} className="font-display text-lg hover:underline">{a.property_title}</Link>
                  <div className="font-mono text-xs uppercase">{new Date(a.visit_date).toLocaleString()}</div>
                </div>
                <span className={`badge-brutal ${a.status === "approved" ? "bg-[#D9F845]" : a.status === "rejected" ? "bg-zinc-200" : ""}`}>{a.status}</span>
                <Link to={`/chat/${a.owner_id}?property=${a.property_id}`} className="btn-brutal"><MessageCircle className="w-4 h-4" strokeWidth={3} /></Link>
              </div>
            ))}
          </div>
        )}

        {tab === "documents" && (
          <div className="mt-6">
            <div className="card-brutal p-4 flex flex-wrap items-center gap-3 mb-4">
              <select className="input-brutal py-1" value={docType} onChange={(e) => setDocType(e.target.value)} data-testid="doc-type">
                <option>Aadhaar</option><option>PAN</option><option>College ID</option><option>Government ID</option>
              </select>
              <label className="btn-brutal btn-meetha cursor-pointer" data-testid="doc-upload-label">
                <Upload className="w-4 h-4" strokeWidth={3} /> {uploadBusy ? "Uploading…" : "Upload"}
                <input type="file" hidden onChange={uploadDoc} disabled={uploadBusy} data-testid="doc-upload-input" />
              </label>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {docs.map((d) => (
                <div key={d.id} className="card-brutal p-4 flex items-center gap-3" data-testid={`doc-${d.id}`}>
                  <FileText className="w-6 h-6" strokeWidth={3} />
                  <div className="flex-1">
                    <div className="font-bold">{d.doc_type}</div>
                    <div className="font-mono text-xs">{d.verified ? "VERIFIED ✓" : "PENDING"}</div>
                  </div>
                  <a href={d.url.startsWith("http") ? d.url : `${process.env.REACT_APP_BACKEND_URL}${d.url}`} target="_blank" rel="noreferrer" className="btn-brutal" data-testid={`doc-view-${d.id}`}>View</a>
                </div>
              ))}
              {docs.length === 0 && <div className="card-brutal p-6 col-span-full">No documents uploaded yet.</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
