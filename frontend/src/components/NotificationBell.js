import { useEffect, useState, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Bell, Check } from "lucide-react";
import { useAuth } from "@/context/AuthContext";

export default function NotificationBell() {
  const { user } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [notifs, setNotifs] = useState([]);
  const ref = useRef(null);

  const loadCount = async () => {
    if (!user) return;
    try {
      const { data } = await api.get("/notifications/unread-count");
      // play sound if increased
      if (data.count > count && count > 0 && localStorage.getItem("km_notif_muted") !== "1") {
        try { new Audio("data:audio/wav;base64,UklGRl4DAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YToAAAB/f39/f4CAgIB/f39/f4CAgIB/f39/").play().catch(()=>{}); } catch {}
      }
      setCount(data.count);
    } catch {}
  };
  const loadList = async () => {
    try { const { data } = await api.get("/notifications", { params: { limit: 10 } }); setNotifs(data); } catch {}
  };

  useEffect(() => {
    if (!user) return;
    loadCount();
    const i = setInterval(loadCount, 8000);
    return () => clearInterval(i);
  }, [user]);

  useEffect(() => {
    if (!open) return;
    loadList();
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const markRead = async (id) => {
    await api.patch(`/notifications/${id}/read`);
    setNotifs((n) => n.map((x) => (x.id === id ? { ...x, read: true } : x)));
    loadCount();
  };
  const readAll = async () => {
    await api.post("/notifications/read-all");
    setNotifs((n) => n.map((x) => ({ ...x, read: true })));
    setCount(0);
  };
  const openTarget = (n) => {
    markRead(n.id);
    if (n.type === "message" && n.data?.from_user_id) nav(`/chat/${n.data.from_user_id}${n.data.conv_id?.includes("__") ? "" : ""}`);
    else if (n.data?.property_id) nav(`/property/${n.data.property_id}`);
    else nav("/notifications");
    setOpen(false);
  };

  if (!user) return null;

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(!open)} className="btn btn-ghost relative !p-2" data-testid="notif-bell">
        <Bell className="w-4 h-4" />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center" data-testid="notif-count">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto scrollbar-thin card !rounded-xl shadow-xl z-50 fade-in" data-testid="notif-dropdown">
          <div className="flex items-center justify-between p-3 border-b border-[var(--border)]">
            <div className="font-semibold text-sm">Notifications</div>
            <button onClick={readAll} className="text-xs text-[var(--accent)] hover:underline" data-testid="notif-read-all">Mark all read</button>
          </div>
          {notifs.length === 0 ? (
            <div className="p-6 text-center text-sm text-[var(--muted)]">No notifications yet</div>
          ) : (
            notifs.map((n) => (
              <button key={n.id} onClick={() => openTarget(n)}
                className={`w-full text-left p-3 hover:bg-[var(--bg-2)] border-b border-[var(--border)] last:border-b-0 ${!n.read ? "bg-[var(--accent-soft)]" : ""}`}
                data-testid={`notif-item-${n.id}`}>
                <div className="flex items-start gap-2">
                  {!n.read && <span className="mt-1.5 w-2 h-2 bg-[var(--accent)] rounded-full flex-shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{n.title}</div>
                    {n.body && <div className="text-xs text-[var(--muted)] truncate">{n.body}</div>}
                    <div className="text-[10px] text-[var(--muted-2)] mt-0.5">{new Date(n.created_at).toLocaleString()}</div>
                  </div>
                </div>
              </button>
            ))
          )}
          <div className="p-2 border-t border-[var(--border)] text-center">
            <Link to="/notifications" onClick={() => setOpen(false)} className="text-xs text-[var(--accent)] hover:underline" data-testid="notif-see-all">See all notifications →</Link>
          </div>
        </div>
      )}
    </div>
  );
}
