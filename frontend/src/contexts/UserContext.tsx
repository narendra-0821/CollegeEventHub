import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

interface User {
  id: string;
  name: string;
  email: string;
  college: string;
  role: "student" | "college_admin" | "super_admin";
}

interface UserContextType {
  user: User | null;
  setUserRole: (role: "student" | "admin") => void;
  clearUser: () => void;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

interface UserProviderProps {
  children: ReactNode;
}

export function UserProvider({ children }: UserProviderProps) {
  const [user, setUser] = useState<User | null>(null);

  // Load user using backend auth service with Bearer token stored in localStorage or URL.
  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      try {
        // Prefer token from URL on first load, then persist to localStorage
        const url = new URL(window.location.href);
        const urlToken = url.searchParams.get("token");
        const storedToken = localStorage.getItem("auth_token");
        const token = urlToken || storedToken || "";
        if (urlToken) {
          localStorage.setItem("auth_token", urlToken);
        }

        // Basic validation: JWTs are typically three base64url parts separated by dots.
        const isLikelyJwt = (t: string) => t.split(".").length === 3;
        if (!token || !isLikelyJwt(token)) {
          // Clean up bad token to prevent repeated malformed requests
          localStorage.removeItem("auth_token");
          throw new Error("No valid token");
        }

        const BACKEND_URL =
          import.meta.env.VITE_BACKEND_URL || "http://localhost:4000";
        const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) throw new Error("Not authenticated");
        const data = await res.json();
        if (isMounted) {
          // Trust backend user completely (name from DB)
          setUser(data.user);
          // Persist role hint for routes if needed (convert to student/admin hint)
          localStorage.setItem(
            "selectedRole",
            data.user.role === "student" ? "student" : "admin"
          );
        }
      } catch {
        if (!isMounted) return;
        // Do not force any role or redirects on failure; keep user null.
        return;
      }
    };

    loadUser();
    return () => {
      isMounted = false;
    };
  }, []);

  const setUserRole = (role: "student" | "admin") => {
    // Only persist role hint. Do not set mock names to avoid wrong header names.
    setUser(null);
    localStorage.setItem("selectedRole", role);
  };

  const clearUser = () => {
    setUser(null);
    localStorage.removeItem("selectedRole");
  };

  const value = {
    user,
    setUserRole,
    clearUser,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}
