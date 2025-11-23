import express from "express";
import {
  mockEvents,
  mockRegistrations,
  mockHelpQueries,
  mockFeedbacks,
} from "../data/mockData";
import { v4 as uuidv4 } from "uuid";
import EventModel from "../models/Event.js";
import FeedbackModel from "../models/Feedback.js";
import HelpTextModel from "../models/HelpText.js";
import { connectDB, isDBReady } from "../services/db.js";

const router = express.Router();

// GET /api/event - List events
router.get("/", async (req, res) => {
  const { category, college_id, limit = 20, offset = 0 } = req.query;

  try {
    await connectDB();

    if (isDBReady()) {
      const query: any = {};
      if (category) query.category = category;
      if (college_id) query.college_id = college_id;

      const total = await EventModel.countDocuments(query);
      const docs = await EventModel.find(query)
        .sort({ created_at: -1 })
        .skip(parseInt(offset as string))
        .limit(parseInt(limit as string));

      // Optionally compute approved counts from DB (simple per-doc count)
      const eventsWithCounts = [] as any[];
      for (const e of docs) {
        let approvedCount = 0;
        try {
          const { default: RegistrationModel } = await import(
            "../models/Registration.js"
          );
          approvedCount = await RegistrationModel.countDocuments({
            event_id: e._id.toString(),
            status: "approved",
          });
        } catch {}
        const obj = e.toObject();
        eventsWithCounts.push({
          ...obj,
          id: e._id.toString(),
          registrations_count: approvedCount,
        });
      }

      return res.json({ events: eventsWithCounts, total });
    }

    // Fallback to in-memory
    let filteredEvents = [...mockEvents];
    if (category) {
      filteredEvents = filteredEvents.filter(
        (event) => event.category === category
      );
    }
    if (college_id) {
      filteredEvents = filteredEvents.filter(
        (event) => event.college_id === college_id
      );
    }
    filteredEvents.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const start = parseInt(offset as string);
    const end = start + parseInt(limit as string);
    const paginatedEvents = filteredEvents.slice(start, end);
    const eventsWithCounts = paginatedEvents.map((e) => {
      const approvedCount = mockRegistrations.filter(
        (r) => r.event_id === e.id && r.status === "approved"
      ).length;
      return { ...e, registrations_count: approvedCount } as any;
    });
    return res.json({ events: eventsWithCounts, total: filteredEvents.length });
  } catch (err) {
    console.error("List events error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/event/:id - Get single event
router.get("/:id", async (req, res) => {
  try {
    await connectDB();
    const id = req.params.id;

    if (isDBReady()) {
      // Prefer lookup by Mongo _id; if not found, try by event_id field
      const byMongoId = await EventModel.findById(id);
      const doc = byMongoId || (await EventModel.findOne({ event_id: id }));
      if (!doc) return res.status(404).json({ error: "Event not found" });
      return res.json({ event: doc });
    }

    const event = mockEvents.find((e) => e.id === id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    return res.json({ event });
  } catch (err) {
    console.error("Get event error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/event - Create event
router.post("/", async (req, res) => {
  const {
    title,
    description,
    category,
    location,
    start_date,
    end_date,
    college_id,
    image_url,
    total_seats,
    slots,
  } = req.body;
  try {
    await connectDB();

    const CATEGORY_CODES: Record<string, string> = {
      sports: "sp",
      hackathon: "ha",
      cultural: "cu",
      workshop: "wo",
      seminar: "se",
      conference: "cf",
      competition: "cm",
      social: "so",
    };
    const MONTH_CODES = [
      "a",
      "b",
      "c",
      "d",
      "e",
      "f",
      "g",
      "h",
      "i",
      "j",
      "k",
      "l",
    ];

    const genEventId = async (cat: string, startISO: string) => {
      const code =
        CATEGORY_CODES[cat?.toLowerCase?.()] ||
        cat?.slice(0, 2).toLowerCase() ||
        "xx";
      const d = new Date(startISO);
      const target = isNaN(d.getTime()) ? new Date() : d;
      const day = String(target.getDate()).padStart(2, "0");
      const monthLetter = MONTH_CODES[target.getMonth()];
      const year = String(target.getFullYear()).slice(-2);
      const dateSuffix = `${day}${monthLetter}${year}`;

      // Numbering per category per day (reset daily)
      let nextNum = 1;
      try {
        if (isDBReady()) {
          const regex = new RegExp(`^${code}(\\d+)-${dateSuffix}$`);
          const count = await EventModel.countDocuments({
            event_id: { $regex: regex },
          });
          nextNum = count + 1;
        } else {
          const count = mockEvents.filter((e) => {
            const id = (e as any).event_id as string;
            return (
              typeof id === "string" &&
              id.startsWith(code) &&
              id.endsWith(dateSuffix)
            );
          }).length;
          nextNum = count + 1;
        }
      } catch {}

      return `${code}${nextNum}-${dateSuffix}`;
    };

    const eventId = await genEventId(category, start_date);

    if (isDBReady()) {
      // Process slots if provided
      const processedSlots = Array.isArray(slots) ? slots.map((slot: any) => ({
        id: slot.id || uuidv4(),
        start: new Date(slot.start),
        end: new Date(slot.end),
        seats: typeof slot.seats === "number" ? slot.seats : null,
      })) : [];

      const doc = await EventModel.create({
        event_id: eventId,
        college_id: college_id || "college-1",
        title,
        description,
        category,
        location,
        start_date: new Date(start_date),
        end_date: new Date(end_date),
        created_at: new Date(),
        registrations_open: true,
        image_url: image_url || null,
        total_seats: typeof total_seats === "number" ? total_seats : null,
        slots: processedSlots,
      });
      return res
        .status(201)
        .json({ ...doc.toObject(), id: doc._id.toString() });
    }

    // Process slots for in-memory fallback
    const processedSlots = Array.isArray(slots) ? slots.map((slot: any) => ({
      id: slot.id || uuidv4(),
      start: slot.start,
      end: slot.end,
      seats: typeof slot.seats === "number" ? slot.seats : null,
    })) : [];

    const newEvent = {
      id: uuidv4(),
      event_id: eventId,
      college_id: college_id || "college-1",
      title,
      description,
      category,
      location,
      start_date,
      end_date,
      created_at: new Date().toISOString(),
      registrations_open: true,
      image_url: image_url || null,
      total_seats: typeof total_seats === "number" ? total_seats : null,
      slots: processedSlots,
    };
    mockEvents.push(newEvent as any);
    return res.status(201).json(newEvent);
  } catch (err) {
    console.error("Create event error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/event/:id/register - Register for event
router.post("/:id/register", (req, res) => {
  const eventId = req.params.id;
  const { user_id } = req.body;

  const event = mockEvents.find((e) => e.id === eventId);
  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  // Enforce seat capacity if total_seats is set
  const currentCount = mockRegistrations.filter(
    (r) => r.event_id === eventId
  ).length;
  if (
    typeof (event as any).total_seats === "number" &&
    currentCount >= (event as any).total_seats
  ) {
    return res.status(400).json({ error: "Event is full" });
  }

  const registration = {
    id: uuidv4(),
    event_id: eventId,
    user_id,
    status: "confirmed",
    timestamp: new Date().toISOString(),
    user_name: "Student User",
    user_email: "student@college.edu",
    user_college: "Mock University",
    event_title: event.title,
    event_location: event.location,
    event_start_date: event.start_date,
    event_end_date: event.end_date,
  };

  mockRegistrations.push(registration);

  // Emit realtime event for registration count update
  const io = req.app.get("io");
  if (io) {
    io.emit("registration_count_updated", {
      event_id: eventId,
      count: currentCount + 1,
    });
  }

  res.status(201).json(registration);
});

// PUT /api/event/:id - Update event
router.put("/:id", async (req, res) => {
  const eventId = req.params.id;
  const {
    title,
    description,
    category,
    location,
    start_date,
    end_date,
    image_url,
    total_seats,
    slots,
  } = req.body;

  try {
    await connectDB();

    if (isDBReady()) {
      const updates: any = {};
      if (typeof title !== "undefined") updates.title = title;
      if (typeof description !== "undefined") updates.description = description;
      if (typeof category !== "undefined") updates.category = category;
      if (typeof location !== "undefined") updates.location = location;
      if (typeof start_date !== "undefined")
        updates.start_date = new Date(start_date);
      if (typeof end_date !== "undefined")
        updates.end_date = new Date(end_date);
      if (Object.prototype.hasOwnProperty.call(req.body, "image_url"))
        updates.image_url = image_url ?? null;
      if (Object.prototype.hasOwnProperty.call(req.body, "total_seats"))
        updates.total_seats =
          typeof total_seats === "number" ? total_seats : null;
      // Optional slots update
      if (Array.isArray(slots)) {
        updates.slots = slots.map((s: any) => ({
          id: s.id,
          start: new Date(s.start),
          end: new Date(s.end),
          seats: typeof s.seats === "number" ? s.seats : null,
        }));
      }

      let updated = await EventModel.findByIdAndUpdate(eventId, updates, {
        new: true,
      });
      if (!updated) {
        updated = await EventModel.findOneAndUpdate(
          { event_id: eventId },
          updates,
          { new: true }
        );
      }
      if (!updated) {
        return res.status(404).json({ error: "Event not found" });
      }
      return res.json({ event: updated });
    }

    // In-memory fallback
    const eventIndex = mockEvents.findIndex((e) => e.id === eventId);
    if (eventIndex === -1) {
      return res.status(404).json({ error: "Event not found" });
    }

    const hasTotalSeatsField = Object.prototype.hasOwnProperty.call(
      req.body,
      "total_seats"
    );
    const updatedTotalSeats = hasTotalSeatsField
      ? typeof total_seats === "number"
        ? total_seats
        : null
      : (mockEvents[eventIndex] as any).total_seats;

    const processedSlots = Array.isArray(slots)
      ? slots.map((s: any) => ({
          id: s.id,
          start: s.start,
          end: s.end,
          seats: typeof s.seats === "number" ? s.seats : null,
        }))
      : (mockEvents[eventIndex] as any).slots ?? [];

    mockEvents[eventIndex] = {
      ...mockEvents[eventIndex],
      ...(typeof title !== "undefined" ? { title } : {}),
      ...(typeof description !== "undefined" ? { description } : {}),
      ...(typeof category !== "undefined" ? { category } : {}),
      ...(typeof location !== "undefined" ? { location } : {}),
      ...(typeof start_date !== "undefined" ? { start_date } : {}),
      ...(typeof end_date !== "undefined" ? { end_date } : {}),
      image_url: Object.prototype.hasOwnProperty.call(req.body, "image_url")
        ? image_url ?? (mockEvents[eventIndex] as any).image_url
        : (mockEvents[eventIndex] as any).image_url,
      total_seats: updatedTotalSeats,
      slots: processedSlots,
    } as any;

    return res.json({ event: mockEvents[eventIndex] });
  } catch (err) {
    console.error("Update event error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/event/:id/registrations - Get event registrations
router.get("/:id/registrations", async (req, res) => {
  const id = req.params.id;
  const slotFilter = (req.query.slot as string | undefined) || undefined;
  try {
    await connectDB();

    if (isDBReady()) {
      // Support both Mongo _id and human event_id
      const byMongoId = await EventModel.findById(id);
      const eventDoc = byMongoId || (await EventModel.findOne({ event_id: id }));
      if (!eventDoc) return res.status(404).json({ error: "Event not found" });

      const { default: RegistrationModel } = await import("../models/Registration.js");
      const query: any = { event_id: eventDoc._id.toString() };
      if (slotFilter) query.slot_id = slotFilter;
      let regs = await RegistrationModel.find(query).sort({ timestamp: -1 });

      // Backfill missing user info from Users collection, if any
      try {
        const { default: UserModel } = await import("../models/User.js");
        const userIds = Array.from(new Set(regs.map((r: any) => r.user_id))).filter(Boolean);
        const users = await UserModel.find({ _id: { $in: userIds } }).select("name email college");
        const idToUser: Record<string, any> = {};
        users.forEach((u: any) => (idToUser[u._id.toString()] = u));
        regs = regs.map((r: any) => {
          if (!r.user_name || !r.user_email || !r.user_college) {
            const u = idToUser[r.user_id];
            if (u) {
              r.user_name = r.user_name || u.name;
              r.user_email = r.user_email || u.email;
              r.user_college = r.user_college || u.college;
            }
          }
          return r;
        });
      } catch {}

      const normalized = regs.map((r: any) => ({
        id: r._id.toString(),
        event_id: r.event_id,
        user_id: r.user_id,
        status: r.status,
        timestamp: r.timestamp?.toISOString?.() ?? new Date().toISOString(),
        user_name: r.user_name,
        user_email: r.user_email,
        user_college: r.user_college,
        event_title: r.event_title,
        event_location: r.event_location,
        event_start_date: r.event_start_date?.toISOString?.(),
        event_end_date: r.event_end_date?.toISOString?.(),
        slot_id: r.slot_id ?? null,
      }));

      return res.json({
        registrations: normalized,
        total_seats: eventDoc.total_seats ?? null,
        count: normalized.length,
      });
    }

    // In-memory fallback
    const event = mockEvents.find((e) => e.id === id);
    const registrations = mockRegistrations.filter((r) => {
      if (r.event_id !== id) return false;
      if (slotFilter) return (r as any).slot_id === slotFilter;
      return true;
    });
    const total_seats = (event as any)?.total_seats ?? null;
    return res.json({ registrations, total_seats, count: registrations.length });
  } catch (err) {
    console.error("Get event registrations error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/event/:id/slots - Return computed hourly slots between start and end
router.get("/:id/slots", async (req, res) => {
  const id = req.params.id;
  try {
    await connectDB();

    if (isDBReady()) {
      // Try by Mongo _id then by human-friendly event_id
      const byMongoId = await EventModel.findById(id);
      const doc = byMongoId || (await EventModel.findOne({ event_id: id }));
      if (!doc) return res.status(404).json({ error: "Event not found" });

      // Prefer explicit admin-defined slots if present
      const definedSlots = Array.isArray((doc as any).slots)
        ? (doc as any).slots
        : [];
      // STRICT: Only admin-defined slots. If none, return empty.
      if (definedSlots.length === 0) {
        return res.json({ slots: [] });
      }
      // Enrich with approved counts per slot
      try {
        const { default: RegistrationModel } = await import("../models/Registration.js");
        const enriched = await Promise.all(
          definedSlots.map(async (s: any) => {
            const approved = await RegistrationModel.countDocuments({
              event_id: doc._id.toString(),
              status: "approved",
              slot_id: s.id,
            });
            const capacity = typeof s.seats === "number" ? s.seats : null;
            const isClosed = typeof capacity === "number" && approved >= capacity;
            return { ...s, approved_count: approved, capacity, available: !isClosed };
          })
        );
        return res.json({ slots: enriched });
      } catch {
        return res.json({ slots: definedSlots });
      }
    }

    // In-memory fallback
    const event = mockEvents.find((e) => e.id === id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    const definedSlots = Array.isArray((event as any).slots)
      ? (event as any).slots
      : [];
    if (definedSlots.length > 0) {
      // Enrich from mock registrations if seats present
      const enriched = definedSlots.map((s: any) => {
        const approved = mockRegistrations.filter((r) => r.event_id === id && r.status === "approved" && (r as any).slot_id === s.id).length;
        const capacity = typeof s.seats === "number" ? s.seats : null;
        const isClosed = typeof capacity === "number" && approved >= capacity;
        return { ...s, approved_count: approved, capacity, available: !isClosed };
      });
      return res.json({ slots: enriched });
    }
    // STRICT: No admin-defined slots in mock -> empty
    return res.json({ slots: [] });
  } catch (err) {
    console.error("Get event slots error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/event/:id/registration-status - Toggle registration status
router.put("/:id/registration-status", async (req, res) => {
  const eventId = req.params.id;
  const { registrations_open } = req.body;

  try {
    await connectDB();

    if (isDBReady()) {
      let doc = await EventModel.findById(eventId);
      if (!doc) {
        doc = await EventModel.findOne({ event_id: eventId });
      }
      if (!doc) {
        return res.status(404).json({ error: "Event not found" });
      }

      if (registrations_open && typeof doc.total_seats === "number") {
        try {
          const { default: RegistrationModel } = await import(
            "../models/Registration.js"
          );
          const approvedCount = await RegistrationModel.countDocuments({
            event_id: doc._id.toString(),
            status: "approved",
          });
          if (approvedCount >= doc.total_seats) {
            return res.status(400).json({
              error:
                "Cannot open registrations. Event is at full capacity. Please increase total seats first.",
            });
          }
        } catch (err) {
          console.error("Capacity check failed:", err);
        }
      }

      doc.registrations_open = registrations_open;
      await doc.save();
      return res.json({ event: doc });
    }

    const eventIndex = mockEvents.findIndex(
      (e) => e.id === eventId || (e as any).event_id === eventId
    );
    if (eventIndex === -1) {
      return res.status(404).json({ error: "Event not found" });
    }

    const event = mockEvents[eventIndex];
    const totalSeats = (event as any).total_seats;

    if (registrations_open && typeof totalSeats === "number") {
      const approvedRegistrations = mockRegistrations.filter(
        (r) =>
          (r.event_id === event.id || r.event_id === (event as any).event_id) &&
          r.status === "approved"
      ).length;

      if (approvedRegistrations >= totalSeats) {
        return res.status(400).json({
          error:
            "Cannot open registrations. Event is at full capacity. Please increase total seats first.",
        });
      }
    }

    mockEvents[eventIndex].registrations_open = registrations_open;
    return res.json({ event: mockEvents[eventIndex] });
  } catch (err) {
    console.error("Update registration status error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/event/:id - Delete event
router.delete("/:id", async (req, res) => {
  const eventId = req.params.id;

  try {
    await connectDB();

    if (isDBReady()) {
      // Find by Mongo _id first, then by event_id field
      let doc = await EventModel.findById(eventId);
      if (!doc) {
        doc = await EventModel.findOne({ event_id: eventId });
      }
      if (!doc) {
        return res.status(404).json({ error: "Event not found" });
      }

      // Delete the event
      await EventModel.deleteOne({ _id: doc._id });

      // Delete related registrations
      try {
        const { default: RegistrationModel } = await import(
          "../models/Registration.js"
        );
        await RegistrationModel.deleteMany({ event_id: doc._id.toString() });
      } catch (err) {
        // If registration model not available, ignore
      }

      return res.json({ message: "Event deleted successfully" });
    }

    // In-memory fallback
    const eventIndex = mockEvents.findIndex((e) => e.id === eventId);
    if (eventIndex === -1) {
      return res.status(404).json({ error: "Event not found" });
    }

    mockEvents.splice(eventIndex, 1);
    for (let i = mockRegistrations.length - 1; i >= 0; i--) {
      if (mockRegistrations[i].event_id === eventId) {
        mockRegistrations.splice(i, 1);
      }
    }
    return res.json({ message: "Event deleted successfully" });
  } catch (error) {
    console.error("Error deleting event:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/event/:eventId/feedback - Submit feedback or help query
router.post("/:eventId/feedback", async (req, res) => {
  const eventId = req.params.eventId;
  const { user_id, rating, comment } = req.body as {
    user_id: string;
    rating?: number | string;
    comment?: string;
  };

  try {
    await connectDB();

    // Normalize: accept either Mongo _id or human event_id when DB is available
    let eventTitle = "Unknown Event";
    let normalizedEventId = eventId;

    if (isDBReady()) {
      try {
        const byMongoId = await EventModel.findById(eventId);
        const doc = byMongoId || (await EventModel.findOne({ event_id: eventId }));
        if (!doc) return res.status(404).json({ error: "Event not found" });
        normalizedEventId = doc._id.toString();
        eventTitle = (doc as any).title || eventTitle;
      } catch (e) {
        return res.status(500).json({ error: "Failed to validate event" });
      }
    } else {
      const ev = mockEvents.find((e) => e.id === eventId);
      if (!ev) return res.status(404).json({ error: "Event not found" });
      eventTitle = (ev as any).title || eventTitle;
    }

    // Fetch user details from database
    let userProfile: {
      name?: string;
      email?: string;
      college?: string;
    } = {
      name: "Anonymous User",
      email: "anonymous@college.edu",
      college: "Unknown College"
    };

    if (isDBReady() && user_id) {
      try {
        const { default: UserModel } = await import("../models/User.js");
        const userDoc = await UserModel.findById(user_id);
        if (userDoc) {
          userProfile = {
            name: userDoc.name,
            email: userDoc.email,
            college: userDoc.college,
          };
        }
      } catch (err) {
        console.warn("Failed to fetch user details:", err);
      }
    }

    // If rating is provided, store as after-event feedback
    if (rating && parseInt(String(rating)) > 0) {
      if (isDBReady()) {
        // Store in MongoDB
        const newFeedback = await FeedbackModel.create({
          event_id: normalizedEventId,
          user_id,
          user_name: userProfile.name || "Anonymous User",
          user_email: userProfile.email || "anonymous@college.edu",
          rating: parseInt(String(rating)),
          feedback: comment || "",
          type: 'event',
          status: 'pending',
          timestamp: new Date(),
          is_read: false,
        });

        // Emit real-time notification to admins
        const io = req.app.get("io");
        if (io) {
          io.to("admin").emit("new_feedback", {
            feedback_id: newFeedback._id.toString(),
            event_id: newFeedback.event_id,
            event_title: eventTitle,
            user_name: newFeedback.user_name,
            user_email: newFeedback.user_email,
            rating: newFeedback.rating,
            comment: newFeedback.feedback,
            timestamp: newFeedback.timestamp.toISOString(),
          });
        }
      } else {
        // Fallback to mock data
        const feedback = {
          id: uuidv4(),
          event_id: normalizedEventId,
          user_id,
          user_name: userProfile.name || "Anonymous User",
          user_email: userProfile.email || "anonymous@college.edu",
          rating: parseInt(String(rating)),
          feedback: comment || "",
          timestamp: new Date().toISOString(),
          is_read: false,
        };

        mockFeedbacks.push(feedback);

        const io = req.app.get("io");
        if (io) {
          io.to("admin").emit("new_feedback", {
            feedback_id: feedback.id,
            event_id: feedback.event_id,
            event_title: eventTitle,
            user_name: feedback.user_name,
            user_email: feedback.user_email,
            rating: feedback.rating,
            comment: feedback.feedback,
            timestamp: feedback.timestamp,
          });
        }
      }
    } else {
      // If no rating, store as help query
      if (isDBReady()) {
        // Store in MongoDB
        const newHelpQuery = await HelpTextModel.create({
          event_id: normalizedEventId,
          user_id,
          user_name: userProfile.name || "Anonymous User",
          user_email: userProfile.email || "anonymous@college.edu",
          query: comment || "",
          category: 'general',
          priority: 'medium',
          status: 'pending',
          timestamp: new Date(),
          is_read: false,
          helpful_count: 0,
        });

        // Emit real-time notification to admins
        const io = req.app.get("io");
        if (io) {
          io.to("admin").emit("new_help_query", {
            query_id: newHelpQuery._id.toString(),
            event_id: newHelpQuery.event_id,
            event_title: eventTitle,
            user_name: newHelpQuery.user_name,
            user_email: newHelpQuery.user_email,
            query: newHelpQuery.query,
            timestamp: newHelpQuery.timestamp.toISOString(),
          });
        }
      } else {
        // Fallback to mock data
        const helpQuery = {
          id: uuidv4(),
          event_id: normalizedEventId,
          user_id,
          user_name: userProfile.name || "Anonymous User",
          user_email: userProfile.email || "anonymous@college.edu",
          query: comment || "",
          timestamp: new Date().toISOString(),
          is_read: false,
        };

        mockHelpQueries.push(helpQuery);

        const io = req.app.get("io");
        if (io) {
          io.to("admin").emit("new_help_query", {
            query_id: helpQuery.id,
            event_id: helpQuery.event_id,
            event_title: eventTitle,
            user_name: helpQuery.user_name,
            user_email: helpQuery.user_email,
            query: helpQuery.query,
            timestamp: helpQuery.timestamp,
          });
        }
      }
    }

    return res.status(201).json({ success: true });
  } catch (err) {
    console.error("Submit feedback error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/event/:id/feedbacks - Get help queries for event (for book icon)
router.get("/:id/feedbacks", async (req, res) => {
  const eventId = req.params.id;

  try {
    await connectDB();

    if (isDBReady()) {
      // Get from MongoDB
      const helpQueries = await HelpTextModel.find({ event_id: eventId })
        .sort({ timestamp: -1 });

      const normalized = helpQueries.map(q => ({
        id: q._id.toString(),
        event_id: q.event_id,
        user_id: q.user_id,
        user_name: q.user_name,
        user_email: q.user_email,
        query: q.query,
        timestamp: q.timestamp.toISOString(),
        is_read: q.is_read,
      }));

      return res.json({ feedbacks: normalized });
    }

    // Fallback to mock data
    const eventHelpQueries = mockHelpQueries
      .filter((query) => query.event_id === eventId)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

    res.json({ feedbacks: eventHelpQueries });
  } catch (err) {
    console.error("Get help queries error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/event/:id/feedbacks/unread-count - Get unread help queries count
router.get("/:id/feedbacks/unread-count", async (req, res) => {
  const eventId = req.params.id;

  try {
    await connectDB();

    if (isDBReady()) {
      const unreadCount = await HelpTextModel.countDocuments({
        event_id: eventId,
        is_read: false
      });
      return res.json({ count: unreadCount });
    }

    // Fallback to mock data
    const unreadCount = mockHelpQueries.filter(
      (query) => query.event_id === eventId && !query.is_read
    ).length;

    res.json({ count: unreadCount });
  } catch (err) {
    console.error("Get unread count error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/event/:id/feedbacks/mark-read - Mark all help queries as read for an event
router.put("/:id/feedbacks/mark-read", async (req, res) => {
  const eventId = req.params.id;

  try {
    await connectDB();

    if (isDBReady()) {
      await HelpTextModel.updateMany(
        { event_id: eventId, is_read: false },
        { $set: { is_read: true } }
      );
      return res.json({ message: "Help queries marked as read" });
    }

    // Fallback to mock data
    mockHelpQueries.forEach((query) => {
      if (query.event_id === eventId && !query.is_read) {
        query.is_read = true;
      }
    });

    res.json({ message: "Help queries marked as read" });
  } catch (err) {
    console.error("Mark read error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/event/:id/event-feedbacks - Get after-event feedbacks for event (for feedback button)
router.get("/:id/event-feedbacks", async (req, res) => {
  const eventId = req.params.id;

  try {
    await connectDB();

    if (isDBReady()) {
      // Get from MongoDB
      const feedbacks = await FeedbackModel.find({ event_id: eventId })
        .sort({ timestamp: -1 });

      const normalized = feedbacks.map(f => ({
        id: f._id.toString(),
        event_id: f.event_id,
        user_id: f.user_id,
        user_name: f.user_name,
        user_email: f.user_email,
        rating: f.rating,
        feedback: f.feedback,
        timestamp: f.timestamp.toISOString(),
        is_read: f.is_read,
      }));

      return res.json({ feedbacks: normalized });
    }

    // Fallback to mock data
    const eventFeedbacks = mockFeedbacks
      .filter((feedback) => feedback.event_id === eventId)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

    res.json({ feedbacks: eventFeedbacks });
  } catch (err) {
    console.error("Get feedbacks error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/event/:id/event-feedbacks/unread-count - Get unread after-event feedback count
router.get("/:id/event-feedbacks/unread-count", async (req, res) => {
  const eventId = req.params.id;

  try {
    await connectDB();

    if (isDBReady()) {
      const unreadCount = await FeedbackModel.countDocuments({
        event_id: eventId,
        is_read: false
      });
      return res.json({ count: unreadCount });
    }

    // Fallback to mock data
    const unreadCount = mockFeedbacks.filter(
      (feedback) => feedback.event_id === eventId && !feedback.is_read
    ).length;

    res.json({ count: unreadCount });
  } catch (err) {
    console.error("Get unread feedback count error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/event/:id/event-feedbacks/mark-read - Mark all after-event feedbacks as read for an event
router.put("/:id/event-feedbacks/mark-read", async (req, res) => {
  const eventId = req.params.id;

  try {
    await connectDB();

    if (isDBReady()) {
      await FeedbackModel.updateMany(
        { event_id: eventId, is_read: false },
        { $set: { is_read: true } }
      );
      return res.json({ message: "After-event feedbacks marked as read" });
    }

    // Fallback to mock data
    mockFeedbacks.forEach((feedback) => {
      if (feedback.event_id === eventId && !feedback.is_read) {
        feedback.is_read = true;
      }
    });

    res.json({ message: "After-event feedbacks marked as read" });
  } catch (err) {
    console.error("Mark feedbacks read error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { router as eventRoutes };
