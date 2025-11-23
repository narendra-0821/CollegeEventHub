import React, { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Calendar,
  Users,
  Settings,
  Plus,
  Home,
  Shield,
  LogOut,
  School,
  ChevronDown,
  User,
} from "lucide-react";
import { useUser } from "../contexts/UserContext";
import { NotificationsBell } from "./NotificationsBell";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, clearUser } = useUser();
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const handleLogout = async () => {
    try {
      // Call backend logout (if implemented); ignore errors
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    try {
      localStorage.removeItem("auth_token");
    } catch {}
    clearUser();
    // Always redirect to the Vite app's own login route (port 5173 in dev)
    window.location.href = "/login";
  };

  const isAdmin =
    user?.role === "college_admin" || user?.role === "super_admin";

  // Different navigation for different roles
  const navItems = isAdmin
    ? [
        // Admin Navigation
        { path: "/admin", icon: Shield, label: "Admin Dashboard" },
        { path: "/events", icon: Calendar, label: "All Events" },
      ]
    : [
        // Student Navigation
        { path: "/dashboard", icon: Home, label: "Dashboard" },
        { path: "/events", icon: Calendar, label: "Browse Events" },
      ];

  return (
    <div className="min-h-screen bg-[#e4e4e4]">
      <nav className="bg-white shadow-sm border-b fixed top-0 left-0 right-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link
                to={isAdmin ? "/admin" : "/dashboard"}
                className="flex items-center space-x-2"
              >
                <School className="h-8 w-8 text-blue-600" />
                <span className="text-xl font-bold text-gray-900">
                  CampusEventHub
                </span>
              </Link>
            </div>

            <div className="flex items-center space-x-4">
              <div className="hidden md:flex items-center space-x-4">
                {navItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center space-x-1 px-3 py-2 rounded-md text-sm font-medium transition-colors border ${
                      location.pathname === item.path
                        ? "bg-blue-100 text-blue-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    }`}
                    style={{
                      borderColor:
                        location.pathname === item.path ? "#3b82f6" : "#bebebe",
                    }}
                  >
                    <item.icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>

              <div
                className="border rounded-md p-1 transition-colors"
                style={{ borderColor: "#bebebe" }}
              >
                <NotificationsBell />
              </div>

              <div className="relative">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className="flex items-center space-x-3 p-2 rounded-md border hover:bg-gray-50 transition-colors"
                  style={{ borderColor: "#bebebe" }}
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                    {user?.name?.charAt(0)?.toUpperCase() || "U"}
                  </div>
                  <div className="text-sm text-left hidden md:block">
                    <div className="font-medium text-gray-900">
                      {user?.name}
                    </div>
                    <div className="text-gray-500">{user?.college}</div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </button>

                {showUserDropdown && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserDropdown(false)}
                    />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-gray-200 z-50">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setShowUserDropdown(false);
                            setLogoutOpen(true);
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          Logout
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 mt-16">
        {children}
      </main>

      {/* Logout Confirmation Dialog */}
      <Dialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Do you want to logout?</DialogTitle>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="border-black"
              onClick={() => setLogoutOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleLogout}>
              Logout
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
