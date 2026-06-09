import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/lib/api";
import { Search, MapPin, Sparkles, Clock } from "lucide-react";

const RECENTS_KEY = "km_recent_searches";

export default function SmartSearch({ size = "md", autoFocus = false }) {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [recents, setRecents] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const ref = useRef(null);
  const debounceRef = useRef(null);

  useEffect(() => {
    try { setRecents(JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]")); } catch { setRecents([]); }
  }, []);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  useEffect(() => {
    if (!q.trim()) { setItems([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try { const { data } = await api.get("/search/suggest", { params: { q } }); setItems(data); }
      catch {}
    }, 220);
  }, [q]);

  const saveRecent = (label) => {
    const next = [label, ...recents.filter((r) => r !== label)].slice(0, 5);
    setRecents(next);
    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
  };

  const pick = (item) => {
    if (!item) return goSearch(q);
    saveRecent(item.label);
    if (item.type === "city" || item.type === "correction") nav(`/explore?city=${encodeURIComponent(item.value)}`);
    else if (item.type === "locality") nav(`/explore?city=${encodeURIComponent(item.city)}&locality=${encodeURIComponent(item.value)}`);
    else goSearch(item.value);
    setOpen(false); setQ("");
  };

  const goSearch = (text) => {
    if (!text?.trim()) return;
    saveRecent(text);
    nav(`/explore?q=${encodeURIComponent(text)}`);
    setOpen(false); setQ("");
  };

  const onKey = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveIdx((i) => Math.min(i + 1, items.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveIdx((i) => Math.max(i - 1, -1)); }
    else if (e.key === "Enter") { e.preventDefault(); pick(items[activeIdx]) || goSearch(q); }
    else if (e.key === "Escape") setOpen(false);
  };

  const big = size === "lg";

  return (
    <div className="relative" ref={ref}>
      <div className={`flex items-center gap-2 ${big ? "p-2" : "px-3"}`}>
        <Search className={`w-${big ? 5 : 4} h-${big ? 5 : 4} text-[var(--muted)] flex-shrink-0`} />
        <input
          autoFocus={autoFocus}
          value={q}
          onChange={(e) => { setQ(e.target.value); setOpen(true); setActiveIdx(-1); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          className={`flex-1 outline-none bg-transparent ${big ? "py-3 text-base" : "py-2 text-sm"}`}
          placeholder="Search city, locality, college, or landmark…"
          data-testid="smart-search-input"
        />
        {q && <button onClick={() => goSearch(q)} className="btn btn-primary !py-2 !text-xs" data-testid="smart-search-go">Search</button>}
      </div>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-2 card !rounded-xl shadow-xl z-50 max-h-96 overflow-y-auto scrollbar-thin fade-in" data-testid="smart-search-dropdown">
          {q && items.length > 0 && (
            <div>
              <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider font-semibold text-[var(--muted)]">Suggestions</div>
              {items.map((it, idx) => (
                <button key={idx} onClick={() => pick(it)}
                  className={`w-full text-left px-3 py-2 flex items-center gap-2 ${activeIdx === idx ? "bg-[var(--bg-2)]" : "hover:bg-[var(--bg-2)]"}`}
                  data-testid={`suggest-${idx}`}>
                  {it.type === "correction" ? <Sparkles className="w-4 h-4 text-amber-500" /> :
                   it.type === "city" ? <MapPin className="w-4 h-4 text-[var(--accent)]" /> :
                   <Search className="w-4 h-4 text-[var(--muted)]" />}
                  <div className="flex-1 text-sm">{it.label}</div>
                  {it.count > 0 && <span className="text-xs text-[var(--muted)]">{it.count}</span>}
                </button>
              ))}
            </div>
          )}
          {!q && recents.length > 0 && (
            <div>
              <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider font-semibold text-[var(--muted)]">Recent</div>
              {recents.map((r, idx) => (
                <button key={idx} onClick={() => goSearch(r)} className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[var(--bg-2)]" data-testid={`recent-${idx}`}>
                  <Clock className="w-4 h-4 text-[var(--muted)]" /> <span className="text-sm">{r}</span>
                </button>
              ))}
              <button onClick={() => { setRecents([]); localStorage.removeItem(RECENTS_KEY); }} className="w-full text-center py-2 text-xs text-[var(--muted)] hover:bg-[var(--bg-2)]">Clear recent</button>
            </div>
          )}
          {!q && recents.length === 0 && (
            <div>
              <div className="px-3 pt-3 pb-1 text-[10px] uppercase tracking-wider font-semibold text-[var(--muted)]">Trending</div>
              {["Bangalore", "Mumbai", "Delhi", "Pune", "Hyderabad", "Gurgaon"].map((t) => (
                <button key={t} onClick={() => { saveRecent(t); nav(`/explore?city=${t}`); setOpen(false); }} className="w-full text-left px-3 py-2 flex items-center gap-2 hover:bg-[var(--bg-2)]" data-testid={`trend-${t}`}>
                  <MapPin className="w-4 h-4 text-[var(--muted)]" /> <span className="text-sm">{t}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
