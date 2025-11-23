import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";

// Ensure we load .env from backend folder even if cwd is repo root
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, "../.env") });
import { eventRoutes } from "./routes/events.js";
import { userRoutes } from "./routes/users.js";
import { authRoutes } from "./routes/auth.js";
import { mockRegistrations, mockEvents } from "./data/mockData.js";
import { v4 as uuidv4 } from "uuid";
import { connectDB, isDBReady } from "./services/db.js";
import RegistrationModel from "./models/Registration.js";
import EventModel from "./models/Event.js";

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});
const PORT = process.env.PORT || 4000;

// Attempt initial DB connection (will warn if MONGODB_URI missing)
connectDB()
  .then(async () => {
    if (isDBReady()) {
      try {
        await Promise.all([
          import("./models/Event.js").then((m) => m.default?.syncIndexes?.()),
          import("./models/Registration.js").then((m) =>
            m.default?.syncIndexes?.()
          ),
        ]);
        console.log("[DB] Indexes synced");
      } catch (e) {
        console.warn("[DB] Failed to sync indexes:", e);
      }
    }
  })
  .catch((err) => console.error("[DB] Initial connect error:", err));

// Middleware
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Root route
app.get("/", (req, res) => {
  res.json({
    message: "Campus Event Hub API Server",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      events: "/api/event",
      users: "/api/user",
      registrations: "/api/registration",
    },
  });
});

// Routes
app.use("/api/event", eventRoutes);
app.use("/api/user", userRoutes);
app.use("/api/auth", authRoutes);

// Registration routes
app.post("/api/registration", async (req, res) => {
  const { event_id, user_id, slot_id } = req.body;
  try {
    await connectDB();

    if (isDBReady()) {
      // When DB is ready, event_id must be a Mongo _id string
      const eventDoc = await EventModel.findById(event_id);
      if (!eventDoc) return res.status(404).json({ error: "Event not found" });

      // Load the authentic user who is registering
      let userProfile: {
        name?: string;
        email?: string;
        college?: string;
      } = {};
      try {
        const { default: UserModel } = await import("./models/User.js");
        const userDoc = await UserModel.findById(user_id);
        if (userDoc) {
          userProfile = {
            name: userDoc.name,
            email: userDoc.email,
            college: userDoc.college,
          };
        }
      } catch {}

      // Prevent duplicate registration
      const existing = await RegistrationModel.findOne({ user_id, event_id });
      if (existing) {
        return res
          .status(400)
          .json({ error: "Already registered for this event" });
      }

      // Enforce seat capacity if total_seats is set (approved only)
      const totalSeats = eventDoc.total_seats ?? null;
      if (typeof totalSeats === "number") {
        const approvedCount = await RegistrationModel.countDocuments({
          event_id,
          status: "approved",
        });
        if (approvedCount >= totalSeats) {
          return res.status(400).json({ error: "Event is full" });
        }
      }

      // Create registration (unique by user_id + event_id)
      const reg = await RegistrationModel.create({
        user_id,
        event_id,
        status: "pending",
        timestamp: new Date(),
        user_name: userProfile.name || "Student User",
        user_email: userProfile.email || "student@college.edu",
        user_college: userProfile.college || "Mock University",
        event_title: eventDoc.title,
        event_location: eventDoc.location,
        event_start_date: eventDoc.start_date,
        event_end_date: eventDoc.end_date,
        slot_id,
      });

      io.to("admin").emit("new_registration", {
        registration_id: reg._id.toString(),
        event_id: reg.event_id,
        event_title: eventDoc.title,
        user_name: reg.user_name,
        user_email: reg.user_email,
        timestamp: reg.timestamp.toISOString(),
      });

      const approvedCountAfter = await RegistrationModel.countDocuments({
        event_id,
        status: "approved",
      });
      io.emit("registration_count_updated", {
        event_id,
        count: approvedCountAfter,
        total_seats: totalSeats,
      });

      return res.status(201).json({
        registration: {
          id: reg._id.toString(),
          ...reg.toObject(),
        },
      });
    }

    // Fallback to in-memory behavior
    const existingRegistration = mockRegistrations.find(
      (r) => r.event_id === event_id && r.user_id === user_id
    );
    if (existingRegistration)
      return res
        .status(400)
        .json({ error: "Already registered for this event" });

    const event = mockEvents.find((e) => e.id === event_id);
    if (!event) return res.status(404).json({ error: "Event not found" });

    const currentCount = mockRegistrations.filter(
      (r) => r.event_id === event_id
    ).length;
    const totalSeats = (event as any)?.total_seats;
    if (typeof totalSeats === "number" && currentCount >= totalSeats) {
      return res.status(400).json({ error: "Event is full" });
    }

    const registration = {
      id: uuidv4(),
      event_id,
      user_id,
      status: "pending",
      timestamp: new Date().toISOString(),
      user_name: "Student User",
      user_email: "student@college.edu",
      user_college: "Mock University",
      event_title: event?.title || "Unknown Event",
      event_location: event?.location || "Unknown Location",
      event_start_date: event?.start_date || new Date().toISOString(),
      event_end_date: event?.end_date || new Date().toISOString(),
      slot_id,
    };

    mockRegistrations.push(registration);

    io.to("admin").emit("new_registration", {
      registration_id: registration.id,
      event_id: registration.event_id,
      event_title: registration.event_title,
      user_name: registration.user_name,
      user_email: registration.user_email,
      timestamp: registration.timestamp,
    });

    const approvedCountAfter = mockRegistrations.filter(
      (r) => r.event_id === event_id && r.status === "approved"
    ).length;
    io.emit("registration_count_updated", {
      event_id,
      count: approvedCountAfter,
      total_seats: totalSeats ?? null,
    });

    return res.status(201).json({ registration });
  } catch (err) {
    console.error("Create registration error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/registrations/user/:userId", async (req, res) => {
  const userId = req.params.userId;
  try {
    await connectDB();

    if (isDBReady()) {
      const regs = await RegistrationModel.find({ user_id: userId }).sort({
        timestamp: -1,
      });
      const normalized = regs.map((r) => ({
        id: r._id.toString(),
        event_id: r.event_id,
        user_id: r.user_id,
        status: r.status,
        timestamp: r.timestamp.toISOString(),
        user_name: r.user_name,
        user_email: r.user_email,
        user_college: r.user_college,
        event_title: r.event_title,
        event_location: r.event_location,
        event_start_date: r.event_start_date?.toISOString(),
        event_end_date: r.event_end_date?.toISOString(),
        slot_id: (r as any).slot_id ?? null,
      }));
      return res.json({ registrations: normalized });
    }

    const userRegistrations = mockRegistrations.filter(
      (r) => r.user_id === userId
    );
    return res.json({ registrations: userRegistrations });
  } catch (err) {
    console.error("Get user registrations error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.put("/api/registration/:id/status", async (req, res) => {
  const registrationId = req.params.id;
  const { status } = req.body as {
    status: "pending" | "approved" | "rejected";
  };
  try {
    await connectDB();

    if (isDBReady()) {
      const reg = await RegistrationModel.findByIdAndUpdate(
        registrationId,
        { status },
        { new: true }
      );
      if (!reg)
        return res.status(404).json({ error: "Registration not found" });

      const totalSeats = null; // We can look up event total seats if needed
      const approvedCountForUpdate = await RegistrationModel.countDocuments({
        event_id: reg.event_id,
        status: "approved",
      });
      io.emit("registration_count_updated", {
        event_id: reg.event_id,
        count: approvedCountForUpdate,
        total_seats: totalSeats,
      });
      // Notify the student about status change
      try {
        io.emit("registration_status_changed", {
          registration_id: reg._id.toString(),
          event_id: reg.event_id,
          status,
        });
      } catch {}
      return res.json({
        registration: { id: reg._id.toString(), ...reg.toObject() },
      });
    }

    const registrationIndex = mockRegistrations.findIndex(
      (r) => r.id === registrationId
    );
    if (registrationIndex === -1) {
      return res.status(404).json({ error: "Registration not found" });
    }

    mockRegistrations[registrationIndex].status = status;

    const updated = mockRegistrations[registrationIndex];
    const eventIdForUpdate = updated.event_id;
    const eventForUpdate = mockEvents.find((e) => e.id === eventIdForUpdate);
    const totalSeatsForUpdate = (eventForUpdate as any)?.total_seats ?? null;
    const approvedCountForUpdate = mockRegistrations.filter(
      (r) => r.event_id === eventIdForUpdate && r.status === "approved"
    ).length;
    io.emit("registration_count_updated", {
      event_id: eventIdForUpdate,
      count: approvedCountForUpdate,
      total_seats: totalSeatsForUpdate,
    });

    return res.json({ registration: updated });
  } catch (err) {
    console.error("Update registration status error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Notifications endpoint
app.get("/api/notifications", (req, res) => {
  const { user_id, only_unread = "false", limit = "20" } = req.query;

  // Mock notifications data
  const mockNotifications = [
    {
      id: "1",
      type: "registration",
      message: "New registration for AI Workshop",
      timestamp: new Date().toISOString(),
      read: false,
      user_id: user_id,
    },
    {
      id: "2",
      type: "feedback",
      message: "New feedback received",
      timestamp: new Date(Date.now() - 60000).toISOString(),
      read: true,
      user_id: user_id,
    },
  ];

  let filteredNotifications = mockNotifications;
  if (only_unread === "true") {
    filteredNotifications = mockNotifications.filter((n) => !n.read);
  }

  const limitNum = parseInt(limit as string) || 20;
  filteredNotifications = filteredNotifications.slice(0, limitNum);

  const unreadCount = mockNotifications.filter((n) => !n.read).length;

  res.json({
    notifications: filteredNotifications,
    unread_count: unreadCount,
    total_count: mockNotifications.length,
  });
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("User connected:", socket.id);

  socket.on("join", (data: { userId: string; role: string }) => {
    const { userId, role } = data;
    socket.join(role);
    console.log(`User ${userId} joined ${role} room`);
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

// Make io available to routes
app.set("io", io);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
