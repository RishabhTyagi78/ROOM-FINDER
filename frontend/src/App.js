import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import "@/App.css";

import Landing from "@/pages/Landing";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import AuthCallback from "@/pages/AuthCallback";
import Explore from "@/pages/Explore";
import MapSearch from "@/pages/MapSearch";
import PropertyDetail from "@/pages/PropertyDetail";
import KhattaDashboard from "@/pages/KhattaDashboard";
import MeethaDashboard from "@/pages/MeethaDashboard";
import PropertyForm from "@/pages/PropertyForm";
import Chat from "@/pages/Chat";
import AdminPanel from "@/pages/AdminPanel";
import Compare from "@/pages/Compare";

function Router() {
  const location = useLocation();
  // Intercept OAuth callback hash
  if (location.hash?.includes("session_id=")) {
    return <AuthCallback />;
  }
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/auth/callback" element={<AuthCallback />} />
      <Route path="/explore" element={<Explore />} />
      <Route path="/map" element={<MapSearch />} />
      <Route path="/compare" element={<Compare />} />
      <Route path="/property/:id" element={<PropertyDetail />} />
      <Route path="/khatta" element={<KhattaDashboard />} />
      <Route path="/khatta/add" element={<PropertyForm />} />
      <Route path="/khatta/edit/:id" element={<PropertyForm />} />
      <Route path="/meetha" element={<MeethaDashboard />} />
      <Route path="/chat/:otherId" element={<Chat />} />
      <Route path="/admin" element={<AdminPanel />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <Router />
          <Toaster position="top-right" toastOptions={{ style: { border: "2px solid #09090B", borderRadius: 0, boxShadow: "4px 4px 0 #09090B", fontWeight: 600 } }} />
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}
