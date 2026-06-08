import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import api, { formatError } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Send, Check, CheckCheck, ArrowLeft, Search, Building2 } from "lucide-react";

export default function Chat() {
  const { otherId } = useParams();
  const [sp] = useSearchParams();
  const propertyId = sp.get("property");
  const { user } = useAuth();
  const nav = useNavigate();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [convs, setConvs] = useState([]);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherUser, setOtherUser] = useState(null);
  const [search, setSearch] = useState("");
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const typingTimer = useRef(null);

  const convId = otherId && user ? [user.id, otherId].sort().join("__") + (propertyId ? `__${propertyId}` : "") : null;

  const loadConvs = async () => {
    try { const { data } = await api.get("/conversations"); setConvs(data); } catch {}
  };

  const loadMessages = async () => {
    if (!otherId) return;
    try {
      const { data } = await api.get("/messages", { params: { with_user: otherId, property_id: propertyId } });
      setMessages(data);
      setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 50);
    } catch {}
  };

  const pollTyping = async () => {
    if (!convId) return;
    try {
      const { data } = await api.get("/typing", { params: { conv_id: convId } });
      setOtherTyping(data.length > 0);
    } catch {}
  };

  useEffect(() => { loadConvs(); }, []); // eslint-disable-line
  useEffect(() => {
    if (!user) { nav("/login"); return; }
    if (!otherId) return;
    loadMessages();
    const conv = convs.find((c) => c.other_user?.id === otherId);
    if (conv) setOtherUser(conv.other_user);
    const t1 = setInterval(loadMessages, 4000);
    const t2 = setInterval(pollTyping, 3000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [otherId, propertyId, convs]); // eslint-disable-line

  const send = async () => {
    if (!text.trim()) return;
    try {
      await api.post("/messages", { to_user_id: otherId, property_id: propertyId, text });
      setText(""); if (textareaRef.current) textareaRef.current.style.height = "auto";
      loadMessages(); loadConvs();
    } catch (e) { toast.error(formatError(e)); }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const onChange = (e) => {
    setText(e.target.value);
    // auto-grow
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
    // notify typing
    if (convId) {
      api.post("/typing", { conv_id: convId }).catch(() => {});
      if (typingTimer.current) clearTimeout(typingTimer.current);
    }
  };

  const filtered = convs.filter((c) =>
    !search || c.other_user?.name?.toLowerCase().includes(search.toLowerCase()) || c.text?.toLowerCase().includes(search.toLowerCase())
  );

  const isOnline = (u) => {
    if (!u?.last_seen) return false;
    return (Date.now() - new Date(u.last_seen).getTime()) < 60_000;
  };

  return (
    <div className="min-h-screen bg-[var(--bg-2)]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="card overflow-hidden grid lg:grid-cols-[320px_1fr] h-[80vh]">
          {/* Sidebar */}
          <aside className="border-r border-[var(--border)] flex flex-col">
            <div className="p-3 border-b border-[var(--border)]">
              <div className="font-semibold mb-2">Conversations</div>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
                <input className="field !pl-9 !py-2" placeholder="Search chats…" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="chat-search" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              {filtered.length === 0 ? (
                <div className="p-6 text-sm text-[var(--muted)] text-center">No conversations yet.</div>
              ) : filtered.map((c) => (
                <button key={c.conv_id} onClick={() => nav(`/chat/${c.other_user?.id}${c.property_id ? `?property=${c.property_id}` : ""}`)}
                  className={`w-full text-left px-3 py-3 border-b border-[var(--border)] hover:bg-[var(--bg-2)] flex items-center gap-3 ${c.other_user?.id === otherId ? "bg-[var(--accent-soft)]" : ""}`}
                  data-testid={`conv-${c.conv_id}`}>
                  <div className="relative flex-shrink-0">
                    <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-semibold text-sm">{c.other_user?.name?.[0]?.toUpperCase()}</div>
                    {isOnline(c.other_user) && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div className="font-medium text-sm truncate">{c.other_user?.name || "User"}</div>
                      <div className="text-[10px] text-[var(--muted)] flex-shrink-0">{new Date(c.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs text-[var(--muted)] truncate">{c.text}</div>
                      {c.unread_count > 0 && <span className="text-[10px] bg-[var(--accent)] text-white font-bold rounded-full min-w-[18px] h-[18px] px-1.5 flex items-center justify-center">{c.unread_count}</span>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </aside>

          {/* Main */}
          {!otherId ? (
            <div className="flex items-center justify-center text-[var(--muted)]">
              <div className="text-center">
                <Building2 className="w-10 h-10 mx-auto mb-2" />
                <div>Select a conversation to start chatting</div>
              </div>
            </div>
          ) : (
            <main className="flex flex-col">
              <header className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-3">
                <Link to="/chat" className="lg:hidden btn btn-ghost !p-1.5"><ArrowLeft className="w-4 h-4" /></Link>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-semibold text-sm">{otherUser?.name?.[0]?.toUpperCase()}</div>
                  {isOnline(otherUser) && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />}
                </div>
                <div className="flex-1">
                  <div className="font-medium text-sm" data-testid="chat-header-name">{otherUser?.name || "User"}</div>
                  <div className="text-xs text-[var(--muted)]">{otherTyping ? <span className="text-[var(--accent)]">typing<span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></span> : isOnline(otherUser) ? "Online" : otherUser?.last_seen ? `Last seen ${new Date(otherUser.last_seen).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Offline"}</div>
                </div>
              </header>

              <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-[var(--bg-2)]">
                {messages.map((m, idx) => {
                  const mine = m.from_user_id === user?.id;
                  const showDate = idx === 0 || new Date(m.created_at).toDateString() !== new Date(messages[idx-1].created_at).toDateString();
                  return (
                    <div key={m.id}>
                      {showDate && (
                        <div className="text-center my-3"><span className="badge badge-mute">{new Date(m.created_at).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric" })}</span></div>
                      )}
                      <div className={`flex ${mine ? "justify-end" : "justify-start"}`} data-testid={`msg-${m.id}`}>
                        <div className={`max-w-[70%] px-3 py-2 rounded-2xl whitespace-pre-wrap break-words text-sm ${mine ? "bg-[var(--accent)] text-white rounded-br-md" : "bg-[var(--card)] border border-[var(--border)] rounded-bl-md"}`}>
                          {m.text}
                          <div className={`flex items-center gap-1 mt-1 text-[10px] ${mine ? "text-white/70 justify-end" : "text-[var(--muted)]"}`}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {mine && (m.read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && <div className="text-center text-[var(--muted)] text-sm py-8">Start the conversation 👋</div>}
                {otherTyping && (
                  <div className="flex justify-start"><div className="px-3 py-2 rounded-2xl bg-[var(--card)] border border-[var(--border)]"><span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></div></div>
                )}
              </div>

              <div className="border-t border-[var(--border)] p-3 flex gap-2 items-end">
                <textarea ref={textareaRef} className="field resize-none !py-2" rows={1} value={text}
                  onChange={onChange} onKeyDown={onKeyDown} placeholder="Type a message…   (Shift+Enter for new line)"
                  data-testid="chat-input" style={{ minHeight: 40, maxHeight: 160 }} />
                <button onClick={send} className="btn btn-accent !p-2.5" disabled={!text.trim()} data-testid="chat-send-btn"><Send className="w-4 h-4" /></button>
              </div>
            </main>
          )}
        </div>
      </div>
    </div>
  );
}
