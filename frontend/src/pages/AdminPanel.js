import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import api from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Trash2, BadgeCheck } from "lucide-react";
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
    } catch (e) { toast.error("Admin only"); }
  };
  useEffect(() => { if (user?.role !== "admin") nav("/"); else load(); }, [user]); // eslint-disable-line

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
        <h1 className="font-display text-4xl uppercase">Admin</h1>
        <div className="grid sm:grid-cols-3 md:grid-cols-6 gap-3 mt-6">
          {Object.entries(stats).map(([k, v]) => (
            <div key={k} className="card-brutal p-3" data-testid={`adm-stat-${k}`}>
              <div className="font-mono text-xs uppercase opacity-70">{k}</div>
              <div className="font-display text-2xl">{v}</div>
            </div>
          ))}
        </div>

        <h2 className="font-display text-2xl uppercase mt-8 mb-3">Users</h2>
        <div className="card-brutal overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950 text-white">
              <tr><th className="p-2 text-left">Name</th><th className="p-2 text-left">Email</th><th className="p-2">Role</th><th className="p-2"></th></tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-dashed border-zinc-300" data-testid={`adm-user-${u.id}`}>
                  <td className="p-2">{u.name}</td><td className="p-2">{u.email}</td>
                  <td className="p-2 text-center"><span className="badge-brutal">{u.role}</span></td>
                  <td className="p-2 text-right">
                    {u.role !== "admin" && (
                      <button onClick={async () => { if (window.confirm("Delete?")) { await api.delete(`/admin/users/${u.id}`); load(); } }} className="btn-brutal" data-testid={`del-user-${u.id}`}>
                        <Trash2 className="w-3 h-3" strokeWidth={3} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <h2 className="font-display text-2xl uppercase mt-8 mb-3">Documents to Verify</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {docs.map((d) => (
            <div key={d.id} className="card-brutal p-4" data-testid={`adm-doc-${d.id}`}>
              <div className="font-bold">{d.doc_type}</div>
              <div className="font-mono text-xs">{d.verified ? "VERIFIED" : "PENDING"}</div>
              <a href={d.url.startsWith("http") ? d.url : `${process.env.REACT_APP_BACKEND_URL}${d.url}`} target="_blank" rel="noreferrer" className="btn-brutal mt-2 mr-2">View</a>
              {!d.verified && (
                <button onClick={async () => { await api.patch(`/documents/${d.id}/verify`); load(); toast.success("Verified"); }} className="btn-brutal btn-khatta" data-testid={`verify-${d.id}`}>
                  <BadgeCheck className="w-4 h-4" strokeWidth={3} /> Verify
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
