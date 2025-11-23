import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

// Use alias paths after flattening
import { Toaster } from "@/components/ui/toaster";
import { UserProvider, useUser } from "@/contexts/UserContext";
import { NotificationProvider } from "@/components/NotificationProvider";
import { DashboardPage } from "@/pages/DashboardPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import ForgotPasswordPage from "@/pages/ForgotPasswordPage";
import { EventsPage } from "@/pages/EventsPage";
import { CreateEventPage } from "@/pages/CreateEventPage";
import { EventDetailsPage } from "@/pages/EventDetailsPage";
import { AdminDashboardPage } from "@/pages/AdminDashboardPage";
import VerifyEmailPage from "@/pages/VerifyEmailPage";

// Component to handle root path redirection based on auth status
function RootRedirect() {
  const { user } = useUser();

  // If user is authenticated, go to dashboard; otherwise, go to login
  return user ? (
    <Navigate to="/dashboard" replace />
  ) : (
    <Navigate to="/login" replace />
  );
}

export default function App() {
  return (
    <UserProvider>
      <NotificationProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/" element={<RootRedirect />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/verify-email" element={<VerifyEmailPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/events" element={<EventsPage />} />
              <Route path="/events/create" element={<CreateEventPage />} />
              {/* Removed separate EditEventSlotsPage route; slots are edited inside EditEventModal now */}
              <Route path="/events/:id" element={<EventDetailsPage />} />
              <Route path="/admin" element={<AdminDashboardPage />} />
            </Routes>
            <Toaster />
          </div>
        </Router>
      </NotificationProvider>
    </UserProvider>
  );
}
