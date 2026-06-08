import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { Menu, X, MapPin, LogOut, User, LayoutDashboard, Heart, MessageCircle, Shield } from "lucide-react";
import { useState } from "react";

export default function Navbar() {
  const { user, logout, setRole } = useAuth();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);

  const dashLink = user?.role === "khatta" ? "/khatta" : user?.role === "meetha" ? "/meetha" : user?.role === "admin" ? "/admin" : "/";

  return (
    <header className="bg-[#FAFAF9] border-b-2 border-zinc-950 sticky top-0 z-40" data-testid="navbar">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
        <Link to="/" data-testid="nav-logo" className="flex items-center gap-2">
          <div className="w-9 h-9 bg-[#FF4D00] border-2 border-zinc-950 flex items-center justify-center shadow-brutal">
            <MapPin className="w-5 h-5 text-white" strokeWidth={3} />
          </div>
          <div className="font-display text-xl leading-none">
            KHATTA<span className="text-[#FF4D00]">·</span>MEETHA
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link to="/explore" className="px-4 py-2 font-bold uppercase text-sm tracking-wider hover:bg-[#D9F845]" data-testid="nav-explore">Explore</Link>
          <Link to="/map" className="px-4 py-2 font-bold uppercase text-sm tracking-wider hover:bg-[#D9F845]" data-testid="nav-map">Map</Link>
          <Link to="/compare" className="px-4 py-2 font-bold uppercase text-sm tracking-wider hover:bg-[#D9F845]" data-testid="nav-compare">Compare</Link>
          {user && (
            <Link to={dashLink} className="px-4 py-2 font-bold uppercase text-sm tracking-wider hover:bg-[#D9F845]" data-testid="nav-dashboard">
              Dashboard
            </Link>
          )}
        </nav>

        <div className="hidden md:flex items-center gap-3">
          {!user ? (
            <>
              <Link to="/login" className="btn-brutal" data-testid="nav-login">Login</Link>
              <Link to="/register" className="btn-brutal btn-meetha" data-testid="nav-register">List a Property</Link>
            </>
          ) : (
            <div className="flex items-center gap-2">
              {user.role === "khatta" && (
                <Link to="/khatta/add" className="btn-brutal btn-meetha" data-testid="nav-add-property">+ List Property</Link>
              )}
              {user.role === "meetha" && (
                <Link to="/khatta/add" onClick={async (e) => {
                  e.preventDefault();
                  if (window.confirm("Switch to KHATTA (owner) account to list a property?")) {
                    await setRole("khatta"); nav("/khatta/add");
                  }
                }} className="btn-brutal btn-meetha" data-testid="nav-add-property">+ List Property</Link>
              )}
              <span className="badge-brutal" data-testid="nav-user-role">{user.role}</span>
              <span className="font-bold text-sm hidden lg:inline" data-testid="nav-user-name">{user.name}</span>
              <button onClick={() => { logout(); nav("/"); }} className="btn-brutal" data-testid="nav-logout" title="Logout">
                <LogOut className="w-4 h-4" strokeWidth={3} />
              </button>
            </div>
          )}
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)} data-testid="nav-mobile-toggle">
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="md:hidden border-t-2 border-zinc-950 bg-white p-4 flex flex-col gap-2">
          <Link onClick={() => setOpen(false)} to="/explore" className="btn-brutal" data-testid="m-nav-explore">Explore</Link>
          <Link onClick={() => setOpen(false)} to="/map" className="btn-brutal" data-testid="m-nav-map">Map</Link>
          {user ? (
            <>
              <Link onClick={() => setOpen(false)} to={dashLink} className="btn-brutal btn-khatta" data-testid="m-nav-dashboard">Dashboard</Link>
              <button onClick={() => { setOpen(false); logout(); nav("/"); }} className="btn-brutal" data-testid="m-nav-logout">Logout</button>
            </>
          ) : (
            <>
              <Link onClick={() => setOpen(false)} to="/login" className="btn-brutal" data-testid="m-nav-login">Login</Link>
              <Link onClick={() => setOpen(false)} to="/register" className="btn-brutal btn-meetha" data-testid="m-nav-register">Sign up</Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
