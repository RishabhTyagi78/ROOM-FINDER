import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams, useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import api, { formatError } from "@/lib/api";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { Send } from "lucide-react";

export default function Chat() {
  const { otherId } = useParams();
  const [sp] = useSearchParams();
  const propertyId = sp.get("property");
  const { user } = useAuth();
  const nav = useNavigate();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [convs, setConvs] = useState([]);
  const scrollRef = useRef(null);

  const loadConvs = async () => {
    try { const { data } = await api.get("/conversations"); setConvs(data); } catch {}
  };

  const loadMessages = async () => {
    if (!otherId) return;
    try {
      const { data } = await api.get("/messages", { params: { with_user: otherId, property_id: propertyId } });
      setMessages(data);
      setTimeout(() => scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight), 50);
    } catch {}
  };

  useEffect(() => { loadConvs(); }, []); // eslint-disable-line
  useEffect(() => { if (!user) return nav("/login"); loadMessages(); const t = setInterval(loadMessages, 4000); return () => clearInterval(t); }, [otherId, propertyId]); // eslint-disable-line

  const send = async () => {
    if (!text.trim()) return;
    try {
      await api.post("/messages", { to_user_id: otherId, property_id: propertyId, text });
      setText(""); loadMessages();
    } catch (e) { toast.error(formatError(e)); }
  };

  return (
    <div className="min-h-screen bg-[#FAFAF9]">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
        <div className="grid lg:grid-cols-4 gap-4 h-[75vh]">
          <aside className="card-brutal p-3 lg:col-span-1 overflow-y-auto scrollbar-thin">
            <div className="font-display text-lg uppercase mb-2">Chats</div>
            {convs.length === 0 && <div className="text-sm text-zinc-500">No chats yet.</div>}
            {convs.map((c) => (
              <button key={c.conv_id} onClick={() => nav(`/chat/${c.other_user?.id}${c.property_id ? `?property=${c.property_id}` : ""}`)}
                className={`w-full text-left p-3 border-b border-dashed border-zinc-300 hover:bg-[#FAFAF9] ${c.other_user?.id === otherId ? "bg-[#D9F845]" : ""}`} data-testid={`conv-${c.conv_id}`}>
                <div className="font-bold">{c.other_user?.name || "User"}</div>
                <div className="text-xs text-zinc-600 truncate">{c.text}</div>
              </button>
            ))}
          </aside>
          <main className="card-brutal flex flex-col lg:col-span-3 overflow-hidden">
            <div className="border-b-2 border-zinc-950 px-4 py-3 font-display text-lg uppercase">Conversation</div>
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.from_user_id === user?.id ? "justify-end" : "justify-start"}`} data-testid={`msg-${m.id}`}>
                  <div className={`max-w-[70%] px-3 py-2 border-2 border-zinc-950 shadow-brutal ${m.from_user_id === user?.id ? "bg-[#FF4D00] text-white" : "bg-white"}`}>
                    <div className="font-mono text-[10px] uppercase opacity-70">{m.from_name}</div>
                    <div>{m.text}</div>
                  </div>
                </div>
              ))}
              {messages.length === 0 && <div className="text-zinc-500 text-sm">Say hi 👋</div>}
            </div>
            <div className="border-t-2 border-zinc-950 p-3 flex gap-2">
              <input className="input-brutal flex-1" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Type a message…" data-testid="chat-input" />
              <button onClick={send} className="btn-brutal btn-meetha" data-testid="chat-send-btn"><Send className="w-4 h-4" strokeWidth={3} /></button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
