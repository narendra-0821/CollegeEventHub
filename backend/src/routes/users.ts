import express from "express";
import { v4 as uuidv4 } from "uuid";
import { authRoutes } from "./auth.js";

const router = express.Router();

// Mock user data
const mockUser = {
  id: "user-1",
  name: "John Doe",
  email: "john.doe@college.edu",
  college: "Tech University",
  role: "student",
};

// Mock registrations for the user
let mockUserRegistrations = [
  {
    id: uuidv4(),
    event_id: "event-1",
    user_id: "user-1",
    status: "confirmed",
    timestamp: new Date().toISOString(),
    event_title: "Tech Symposium 2024",
    event_location: "Main Auditorium",
    event_start_date: new Date("2024-09-15T09:00:00Z").toISOString(),
    event_end_date: new Date("2024-09-15T17:00:00Z").toISOString(),
  },
];

// Mount auth sub-routes under /api/user/auth
router.use("/auth", authRoutes);

// GET /api/user/profile - Get user profile
router.get("/profile", (req, res) => {
  // Since we removed auth, just return the mock user
  res.json(mockUser);
});

// GET /api/user/:id/registrations - Get user's event registrations
router.get("/:id/registrations", (req, res) => {
  const userId = req.params.id;
  const registrations = mockUserRegistrations.filter(
    (r) => r.user_id === userId
  );

  res.json({ registrations });
});

export { router as userRoutes };
