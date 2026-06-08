import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { Menu, X, LogOut, Sun, Moon, Building2, Search, MapPin, GitCompare, LayoutDashboard, MessageCircle, ChevronDown, UserCircle } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import NotificationBell from "./NotificationBell";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setMenu(false); };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const active = (p) => loc.pathname === p ? "text-[var(--ink)] font-semibold" : "text-[var(--muted)] hover:text-[var(--ink)]";

  return (
    <header className="sticky top-0 z-40 bg-[var(--bg)]/85 backdrop-blur-lg border-b border-[var(--border)]" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-3">
        <Link to="/" className="flex items-center gap-2" data-testid="nav-logo">
          <div className="w-8 h-8 rounded-lg bg-[var(--ink)] flex items-center justify-center">
            <Building2 className="w-4 h-4 text-white" />
          </div>
          <div className="font-semibold text-base tracking-tight">khatta<span className="text-[var(--accent)]">·</span>meetha</div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link to="/explore" className={`px-3 py-2 rounded-lg text-sm transition ${active("/explore")}`} data-testid="nav-explore">Explore</Link>
          <Link to="/map" className={`px-3 py-2 rounded-lg text-sm transition ${active("/map")}`} data-testid="nav-map">Map</Link>
          <Link to="/compare" className={`px-3 py-2 rounded-lg text-sm transition ${active("/compare")}`} data-testid="nav-compare">Compare</Link>
          {user && <Link to="/dashboard" className={`px-3 py-2 rounded-lg text-sm transition ${active("/dashboard")}`} data-testid="nav-dashboard">Dashboard</Link>}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <button onClick={toggle} className="btn btn-ghost !p-2" title="Toggle theme" data-testid="theme-toggle">
            {theme === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {!user ? (
            <>
              <Link to="/login" className="btn btn-ghost" data-testid="nav-login">Sign in</Link>
              <Link to="/register" className="btn btn-primary" data-testid="nav-register">Get started</Link>
            </>
          ) : (
            <>
              <NotificationBell />
              <Link to="/dashboard/list-property" className="btn btn-accent" data-testid="nav-add-property">List property</Link>
              <div className="relative" ref={ref}>
                <button onClick={() => setMenu(!menu)} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-[var(--bg-2)]" data-testid="nav-user-menu">
                  {user.picture ? (
                    <img src={user.picture} alt="" className="w-7 h-7 rounded-full" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-[var(--accent)] text-white flex items-center justify-center text-xs font-semibold">
                      {user.name?.[0]?.toUpperCase()}
                    </div>
                  )}
                  <ChevronDown className="w-3 h-3 text-[var(--muted)]" />
                </button>
                {menu && (
                  <div className="absolute right-0 mt-2 w-56 card !rounded-xl shadow-lg fade-in" data-testid="user-menu">
                    <div className="p-3 border-b border-[var(--border)]">
                      <div className="font-medium text-sm truncate" data-testid="nav-user-name">{user.name}</div>
                      <div className="text-xs text-[var(--muted)] truncate">{user.email}</div>
                    </div>
                    <div className="p-1.5">
                      <Link to="/dashboard" onClick={() => setMenu(false)} className="flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-[var(--bg-2)] text-sm"><LayoutDashboard className="w-4 h-4" /> Dashboard</Link>
                      <Link to="/notifications" onClick={() => setMenu(false)} className="flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-[var(--bg-2)] text-sm"><UserCircle className="w-4 h-4" /> Notifications</Link>
                      <button onClick={() => { setMenu(false); logout(); nav("/"); }} className="w-full flex items-center gap-2 px-2.5 py-2 rounded-md hover:bg-[var(--bg-2)] text-sm text-red-600" data-testid="nav-logout">
                        <LogOut className="w-4 h-4" /> Sign out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <button className="md:hidden btn btn-ghost !p-2" onClick={() => setOpen(!open)} data-testid="nav-mobile-toggle">
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t border-[var(--border)] bg-[var(--bg)] p-3 flex flex-col gap-2">
          <Link onClick={() => setOpen(false)} to="/explore" className="btn btn-ghost justify-start">Explore</Link>
          <Link onClick={() => setOpen(false)} to="/map" className="btn btn-ghost justify-start">Map</Link>
          {user ? (
            <>
              <Link onClick={() => setOpen(false)} to="/dashboard" className="btn btn-outline justify-start">Dashboard</Link>
              <Link onClick={() => setOpen(false)} to="/dashboard/list-property" className="btn btn-accent justify-center">List property</Link>
              <button onClick={() => { setOpen(false); logout(); nav("/"); }} className="btn btn-ghost justify-start text-red-600">Sign out</button>
            </>
          ) : (
            <>
              <Link onClick={() => setOpen(false)} to="/login" className="btn btn-outline">Sign in</Link>
              <Link onClick={() => setOpen(false)} to="/register" className="btn btn-primary">Get started</Link>
            </>
          )}
          <button onClick={toggle} className="btn btn-ghost justify-start">{theme === "dark" ? "☀ Light mode" : "🌙 Dark mode"}</button>
        </div>
      )}
    </header>
  );
}
