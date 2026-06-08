import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useNavigate, Link } from "react-router-dom";
import Navbar from "@/components/Navbar";
import api, { formatError } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Send, Check, CheckCheck, ArrowLeft, Search, MessageCircle } from "lucide-react";

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

  // Find/fetch otherUser when conversations or property loads
  useEffect(() => {
    if (!otherId) { setOtherUser(null); return; }
    const conv = convs.find((c) => c.other_user?.id === otherId);
    if (conv?.other_user) { setOtherUser(conv.other_user); return; }
    // Fallback: get from property owner if propertyId
    if (propertyId) {
      api.get(`/properties/${propertyId}`).then((r) => {
        if (r.data?.owner && r.data.owner.id === otherId) setOtherUser(r.data.owner);
      }).catch(() => {});
    }
  }, [otherId, propertyId, convs]);

  useEffect(() => {
    if (!user) { nav("/login"); return; }
    if (!otherId) return;
    loadMessages();
    const t1 = setInterval(loadMessages, 4000);
    const t2 = setInterval(pollTyping, 3000);
    return () => { clearInterval(t1); clearInterval(t2); };
  }, [otherId, propertyId]); // eslint-disable-line

  const send = async () => {
    if (!text.trim()) return;
    const optimistic = {
      id: `tmp-${Date.now()}`, from_user_id: user.id, from_name: user.name,
      to_user_id: otherId, text, created_at: new Date().toISOString(), read: false, _pending: true,
    };
    setMessages((m) => [...m, optimistic]);
    setText(""); if (textareaRef.current) textareaRef.current.style.height = "auto";
    setTimeout(() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" }), 30);
    try {
      await api.post("/messages", { to_user_id: otherId, property_id: propertyId, text: optimistic.text });
      loadMessages(); loadConvs();
    } catch (e) {
      toast.error(formatError(e));
      setMessages((m) => m.filter((x) => x.id !== optimistic.id));
    }
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
  };

  const onChange = (e) => {
    setText(e.target.value);
    e.target.style.height = "auto";
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + "px";
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

  const statusText = () => {
    if (otherTyping) return <span className="text-[var(--accent)] inline-flex items-center">typing<span className="ml-1"><span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></span></span>;
    if (isOnline(otherUser)) return <span className="text-green-600 dark:text-green-400">● Active now</span>;
    return <span>Messages are delivered anytime · they'll reply soon</span>;
  };

  return (
    <div className="min-h-screen bg-[var(--bg-2)]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-6 py-6">
        <div className="card overflow-hidden grid lg:grid-cols-[320px_1fr] h-[80vh]">
          {/* Sidebar — hidden on mobile when a chat is open */}
          <aside className={`border-r border-[var(--border)] flex flex-col ${otherId ? "hidden lg:flex" : "flex"}`}>
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
            <div className="flex items-center justify-center text-[var(--muted)] hidden lg:flex">
              <div className="text-center">
                <MessageCircle className="w-10 h-10 mx-auto mb-2" />
                <div>Select a conversation to start chatting</div>
              </div>
            </div>
          ) : (
            <main className="flex flex-col">
              <header className="px-4 py-3 border-b border-[var(--border)] flex items-center gap-3">
                <button onClick={() => nav("/chat")} className="lg:hidden btn btn-ghost !p-1.5"><ArrowLeft className="w-4 h-4" /></button>
                <div className="relative">
                  <div className="w-10 h-10 rounded-full bg-[var(--accent)] text-white flex items-center justify-center font-semibold text-sm">{otherUser?.name?.[0]?.toUpperCase() || "?"}</div>
                  {isOnline(otherUser) && <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-[var(--card)] rounded-full" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate" data-testid="chat-header-name">{otherUser?.name || "Chat"}</div>
                  <div className="text-xs text-[var(--muted)] truncate">{statusText()}</div>
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
                        <div className={`max-w-[80%] sm:max-w-[70%] px-3 py-2 rounded-2xl whitespace-pre-wrap break-words text-sm ${mine ? "bg-[var(--accent)] text-white rounded-br-md" : "bg-[var(--card)] border border-[var(--border)] rounded-bl-md"} ${m._pending ? "opacity-70" : ""}`}>
                          {m.text}
                          <div className={`flex items-center gap-1 mt-1 text-[10px] ${mine ? "text-white/70 justify-end" : "text-[var(--muted)]"}`}>
                            {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            {mine && !m._pending && (m.read ? <CheckCheck className="w-3 h-3" /> : <Check className="w-3 h-3" />)}
                            {m._pending && <Clock4 />}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {messages.length === 0 && (
                  <div className="text-center py-12 px-4">
                    <MessageCircle className="w-12 h-12 mx-auto text-[var(--muted)] mb-3" />
                    <div className="font-medium">Start the conversation</div>
                    <p className="text-sm text-[var(--muted)] mt-1">Say hi and ask any questions about the property. {otherUser?.name || "The owner"} will be notified instantly.</p>
                  </div>
                )}
                {otherTyping && (
                  <div className="flex justify-start"><div className="px-3 py-2 rounded-2xl bg-[var(--card)] border border-[var(--border)]"><span className="typing-dot"/><span className="typing-dot"/><span className="typing-dot"/></div></div>
                )}
              </div>

              <div className="border-t border-[var(--border)] p-3 flex gap-2 items-end bg-[var(--card)]">
                <textarea ref={textareaRef} className="field resize-none !py-2 flex-1" rows={1} value={text}
                  onChange={onChange} onKeyDown={onKeyDown}
                  placeholder="Type a message…   (Shift+Enter for new line)"
                  data-testid="chat-input" style={{ minHeight: 40, maxHeight: 160 }} />
                <button onClick={send} className="btn btn-accent !p-2.5 flex-shrink-0" disabled={!text.trim()} data-testid="chat-send-btn" aria-label="Send message">
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </main>
          )}
        </div>
      </div>
    </div>
  );
}

function Clock4() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>;
}
