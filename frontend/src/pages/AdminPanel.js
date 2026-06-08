import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Trash2, BadgeCheck, Users, Building2, Calendar, Star } from "lucide-react";
import { toast } from "sonner";

export default function AdminPanel() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [docs, setDocs] = useState([]);

  const load = async () => {
    try {
      const [s, u, d] = await Promise.all([api.get("/admin/stats"), api.get("/admin/users"), api.get("/documents")]);
      setStats(s.data); setUsers(u.data); setDocs(d.data);
    } catch { toast.error("Admin access required"); nav("/"); }
  };
  useEffect(() => { if (!user?.roles?.includes("admin")) nav("/"); else load(); }, [user]); // eslint-disable-line

  const icons = { users: Users, owners: Building2, tenants: Users, properties: Building2, appointments: Calendar, reviews: Star };

  return (
    <div className="min-h-screen bg-[var(--bg-2)]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">Admin</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">Platform analytics and moderation.</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6">
          {Object.entries(stats).map(([k, v]) => {
            const I = icons[k] || Star;
            return (
              <div key={k} className="card p-4" data-testid={`adm-stat-${k}`}>
                <div className="w-8 h-8 rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center"><I className="w-4 h-4" /></div>
                <div className="text-xs text-[var(--muted)] mt-2 capitalize">{k}</div>
                <div className="text-xl font-semibold">{v}</div>
              </div>
            );
          })}
        </div>

        <h2 className="text-lg font-semibold mt-10 mb-3">Users</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-[var(--bg-2)] border-b border-[var(--border)]">
              <tr>
                <th className="p-3 text-left font-medium text-[var(--muted)]">Name</th>
                <th className="p-3 text-left font-medium text-[var(--muted)]">Email</th>
                <th className="p-3 text-left font-medium text-[var(--muted)]">Roles</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[var(--border)] last:border-b-0" data-testid={`adm-user-${u.id}`}>
                  <td className="p-3">{u.name}</td>
                  <td className="p-3 text-[var(--muted)]">{u.email}</td>
                  <td className="p-3"><div className="flex gap-1 flex-wrap">{(u.roles || []).map((r) => <span key={r} className="badge">{r}</span>)}</div></td>
                  <td className="p-3 text-right">
                    {!u.roles?.includes("admin") && (
                      <button onClick={async () => { if (window.confirm("Delete user?")) { await api.delete(`/admin/users/${u.id}`); load(); } }} className="btn btn-ghost !p-1.5 text-red-600 hover:bg-red-50" data-testid={`del-user-${u.id}`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="text-lg font-semibold mt-10 mb-3">Documents to verify</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {docs.map((d) => (
            <div key={d.id} className="card p-4" data-testid={`adm-doc-${d.id}`}>
              <div className="font-medium">{d.doc_type}</div>
              <span className={`badge mt-1 ${d.verified ? "badge-success" : "badge-warn"}`}>{d.verified ? "Verified" : "Pending"}</span>
              <div className="mt-3 flex gap-2">
                <a href={d.url.startsWith("http") ? d.url : `${process.env.REACT_APP_BACKEND_URL}${d.url}`} target="_blank" rel="noreferrer" className="btn btn-outline !text-xs !py-1.5">View</a>
                {!d.verified && (
                  <button onClick={async () => { await api.patch(`/documents/${d.id}/verify`); load(); toast.success("Verified"); }} className="btn btn-primary !text-xs !py-1.5" data-testid={`verify-${d.id}`}>
                    <BadgeCheck className="w-3.5 h-3.5" /> Verify
                  </button>
                )}
              </div>
            </div>
          ))}
          {docs.length === 0 && <div className="card p-8 text-center text-[var(--muted)] text-sm col-span-full">No documents pending verification.</div>}
        </div>
      </div>
    </div>
  );
}
