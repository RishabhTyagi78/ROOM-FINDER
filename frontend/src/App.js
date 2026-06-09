import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { Toaster } from "sonner";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
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
import PropertyForm from "@/pages/PropertyForm";
import Dashboard from "@/pages/Dashboard";
import Chat from "@/pages/Chat";
import AdminPanel from "@/pages/AdminPanel";
import Compare from "@/pages/Compare";
import Notifications from "@/pages/Notifications";
import CostCalculator from "@/pages/CostCalculator";
import CommuteCalculator from "@/pages/CommuteCalculator";
import Saved from "@/pages/Saved";
import Preferences from "@/pages/Preferences";

function Router() {
  const location = useLocation();
  if (location.hash?.includes("session_id=")) return <AuthCallback />;
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
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/dashboard/list-property" element={<PropertyForm />} />
      <Route path="/chat" element={<Chat />} />
      <Route path="/chat/:otherId" element={<Chat />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/tools/cost" element={<CostCalculator />} />
      <Route path="/tools/commute" element={<CommuteCalculator />} />
      <Route path="/saved" element={<Saved />} />
      <Route path="/preferences" element={<Preferences />} />
      <Route path="/admin" element={<AdminPanel />} />
    </Routes>
  );
}

export default function App() {
  return (
    <div className="App">
      <ThemeProvider>
        <BrowserRouter>
          <AuthProvider>
            <Router />
            <Toaster position="top-right" toastOptions={{ style: { fontSize: 13 } }} />
          </AuthProvider>
        </BrowserRouter>
      </ThemeProvider>
    </div>
  );
}
