import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import api from "@/lib/api";
import { Bell, BellOff, Check, Trash2, X } from "lucide-react";
import { toast } from "sonner";

const MUTE_KEY = "km_notif_muted";

export default function Notifications() {
  const nav = useNavigate();
  const [items, setItems] = useState([]);
  const [muted, setMuted] = useState(() => localStorage.getItem(MUTE_KEY) === "1");

  const load = async () => {
    try { const { data } = await api.get("/notifications", { params: { limit: 100 } }); setItems(data); }
    catch { nav("/login"); }
  };
  useEffect(() => { load(); }, []); // eslint-disable-line

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setItems((s) => s.map((x) => x.id === id ? { ...x, read: true } : x));
  };
  const readAll = async () => {
    await api.post("/notifications/read-all");
    setItems((s) => s.map((x) => ({ ...x, read: true })));
  };
  const del = async (id) => {
    await api.delete(`/notifications/${id}`);
    setItems((s) => s.filter((x) => x.id !== id));
  };
  const clearAll = async () => {
    if (!window.confirm("Clear all notifications?")) return;
    await api.delete("/notifications");
    setItems([]);
    toast.success("Cleared");
  };
  const toggleMute = () => {
    const next = !muted;
    setMuted(next);
    localStorage.setItem(MUTE_KEY, next ? "1" : "0");
    toast.success(next ? "Notification sound muted" : "Notification sound on");
  };

  const goto = (n) => {
    if (!n.read) markRead(n.id);
    if (n.data?.property_id) nav(`/property/${n.data.property_id}`);
    else if (n.data?.from_user_id) nav(`/chat/${n.data.from_user_id}`);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-2)]">
      <Navbar />
      <div className="max-w-3xl mx-auto px-4 md:px-6 py-8">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Notifications</h1>
            <p className="text-sm text-[var(--muted)] mt-1">All your platform alerts in one place.</p>
          </div>
          <div className="flex gap-2">
            <button onClick={toggleMute} className="btn btn-outline !text-xs" data-testid="notif-mute-toggle" title={muted ? "Unmute" : "Mute"}>
              {muted ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
              {muted ? "Muted" : "Sound on"}
            </button>
            <button onClick={readAll} className="btn btn-outline !text-xs" data-testid="notif-read-all-page"><Check className="w-3.5 h-3.5" /> Mark all read</button>
            <button onClick={clearAll} className="btn btn-outline !text-xs text-red-600" data-testid="notif-clear-all"><Trash2 className="w-3.5 h-3.5" /> Clear all</button>
          </div>
        </div>

        <div className="card mt-6 divide-y divide-[var(--border)]">
          {items.length === 0 ? (
            <div className="p-12 text-center text-[var(--muted)]"><Bell className="w-10 h-10 mx-auto mb-3" />No notifications yet.</div>
          ) : items.map((n) => (
            <div key={n.id} className={`p-4 flex items-start gap-3 hover:bg-[var(--bg-2)] group ${!n.read ? "bg-[var(--accent-soft)]/30" : ""}`} data-testid={`notif-row-${n.id}`}>
              {!n.read && <span className="mt-1.5 w-2 h-2 bg-[var(--accent)] rounded-full flex-shrink-0" />}
              <button onClick={() => goto(n)} className="flex-1 min-w-0 text-left">
                <div className="font-medium text-sm">{n.title}</div>
                {n.body && <div className="text-sm text-[var(--muted)] mt-0.5">{n.body}</div>}
                <div className="text-xs text-[var(--muted-2)] mt-1">{new Date(n.created_at).toLocaleString()}</div>
              </button>
              <span className="badge badge-mute">{n.type}</span>
              <button onClick={() => del(n.id)} className="opacity-0 group-hover:opacity-100 text-red-500 hover:bg-red-50 rounded p-1" title="Delete" data-testid={`notif-del-${n.id}`}>
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
