import express from "express";
import { connectDB, isDBReady } from "../services/db.js";
import HelpTextModel, { IHelpText } from "../models/HelpText.js";
import { mockHelpQueries } from "../data/mockData.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// GET /api/help - List all help queries
router.get("/", async (req, res) => {
  const {
    limit = 20,
    offset = 0,
    user_id,
    event_id,
    status,
    category,
    priority
  } = req.query;

  try {
    await connectDB();

    if (isDBReady()) {
      const query: any = {};
      if (user_id) query.user_id = user_id;
      if (event_id) query.event_id = event_id;
      if (status) query.status = status;
      if (category) query.category = category;
      if (priority) query.priority = priority;

      const total = await HelpTextModel.countDocuments(query);
      const helpTexts = await HelpTextModel.find(query)
        .sort({ timestamp: -1 })
        .skip(parseInt(offset as string))
        .limit(parseInt(limit as string));

      const normalized = helpTexts.map((h) => ({
        id: h._id.toString(),
        event_id: h.event_id,
        user_id: h.user_id,
        user_name: h.user_name,
        user_email: h.user_email,
        query: h.query,
        category: h.category,
        priority: h.priority,
        status: h.status,
        timestamp: h.timestamp.toISOString(),
        is_read: h.is_read,
        admin_response: h.admin_response,
        responded_at: h.responded_at?.toISOString(),
        helpful_count: h.helpful_count,
        tags: h.tags,
      }));

      return res.json({ help_texts: normalized, total });
    }

    // Fallback to mock data
    let filtered = [...mockHelpQueries];
    if (user_id) filtered = filtered.filter(h => h.user_id === user_id);
    if (event_id) filtered = filtered.filter(h => h.event_id === event_id);
    
    const start = parseInt(offset as string);
    const end = start + parseInt(limit as string);
    const paginated = filtered.slice(start, end);

    return res.json({ help_texts: paginated, total: filtered.length });
  } catch (err) {
    console.error("Get help texts error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/help/:id - Get single help query
router.get("/:id", async (req, res) => {
  const helpTextId = req.params.id;

  try {
    await connectDB();

    if (isDBReady()) {
      const helpText = await HelpTextModel.findById(helpTextId);
      if (!helpText) {
        return res.status(404).json({ error: "Help text not found" });
      }

      return res.json({
        help_text: {
          id: helpText._id.toString(),
          ...helpText.toObject(),
        },
      });
    }

    // Fallback to mock data
    const helpText = mockHelpQueries.find(h => h.id === helpTextId);
    if (!helpText) {
      return res.status(404).json({ error: "Help text not found" });
    }

    return res.json({ help_text: helpText });
  } catch (err) {
    console.error("Get help text error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/help - Create new help query
router.post("/", async (req, res) => {
  const {
    event_id,
    user_id,
    user_name,
    user_email,
    query,
    category = 'general',
    priority = 'medium',
    tags
  } = req.body;

  try {
    await connectDB();

    if (isDBReady()) {
      const newHelpText = await HelpTextModel.create({
        event_id,
        user_id,
        user_name: user_name || "Anonymous User",
        user_email: user_email || "anonymous@college.edu",
        query,
        category,
        priority,
        status: 'pending',
        timestamp: new Date(),
        is_read: false,
        helpful_count: 0,
        tags: Array.isArray(tags) ? tags : [],
      });

      // Emit real-time notification to admins
      const io = req.app.get("io");
      if (io) {
        io.to("admin").emit("new_help_query", {
          query_id: newHelpText._id.toString(),
          event_id: newHelpText.event_id,
          user_name: newHelpText.user_name,
          query: newHelpText.query,
          priority: newHelpText.priority,
          timestamp: newHelpText.timestamp.toISOString(),
        });
      }

      return res.status(201).json({
        help_text: {
          id: newHelpText._id.toString(),
          ...newHelpText.toObject(),
        },
      });
    }

    // Fallback to mock data
    const newHelpText = {
      id: uuidv4(),
      event_id,
      user_id,
      user_name: user_name || "Anonymous User",
      user_email: user_email || "anonymous@college.edu",
      query,
      timestamp: new Date().toISOString(),
      is_read: false,
    };

    mockHelpQueries.push(newHelpText);

    const io = req.app.get("io");
    if (io) {
      io.to("admin").emit("new_help_query", {
        query_id: newHelpText.id,
        event_id: newHelpText.event_id,
        user_name: newHelpText.user_name,
        query: newHelpText.query,
        timestamp: newHelpText.timestamp,
      });
    }

    return res.status(201).json({ help_text: newHelpText });
  } catch (err) {
    console.error("Create help text error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/help/:id - Update help query (mark as read, add response, change status)
router.put("/:id", async (req, res) => {
  const helpTextId = req.params.id;
  const { is_read, admin_response, status, priority, category } = req.body;

  try {
    await connectDB();

    if (isDBReady()) {
      const updates: any = {};
      if (typeof is_read !== 'undefined') updates.is_read = is_read;
      if (admin_response) {
        updates.admin_response = admin_response;
        updates.responded_at = new Date();
      }
      if (status) updates.status = status;
      if (priority) updates.priority = priority;
      if (category) updates.category = category;

      const helpText = await HelpTextModel.findByIdAndUpdate(
        helpTextId,
        updates,
        { new: true }
      );

      if (!helpText) {
        return res.status(404).json({ error: "Help text not found" });
      }

      return res.json({
        help_text: {
          id: helpText._id.toString(),
          ...helpText.toObject(),
        },
      });
    }

    // Fallback to mock data
    const helpTextIndex = mockHelpQueries.findIndex(h => h.id === helpTextId);
    if (helpTextIndex === -1) {
      return res.status(404).json({ error: "Help text not found" });
    }

    if (typeof is_read !== 'undefined') {
      mockHelpQueries[helpTextIndex].is_read = is_read;
    }

    return res.json({ help_text: mockHelpQueries[helpTextIndex] });
  } catch (err) {
    console.error("Update help text error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/help/:id - Delete help query
router.delete("/:id", async (req, res) => {
  const helpTextId = req.params.id;

  try {
    await connectDB();

    if (isDBReady()) {
      const helpText = await HelpTextModel.findByIdAndDelete(helpTextId);
      if (!helpText) {
        return res.status(404).json({ error: "Help text not found" });
      }

      return res.json({ message: "Help text deleted successfully" });
    }

    // Fallback to mock data
    const helpTextIndex = mockHelpQueries.findIndex(h => h.id === helpTextId);
    if (helpTextIndex === -1) {
      return res.status(404).json({ error: "Help text not found" });
    }

    mockHelpQueries.splice(helpTextIndex, 1);

    return res.json({ message: "Help text deleted successfully" });
  } catch (err) {
    console.error("Delete help text error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/help/:id/helpful - Mark help text as helpful
router.post("/:id/helpful", async (req, res) => {
  const helpTextId = req.params.id;

  try {
    await connectDB();

    if (isDBReady()) {
      const helpText = await HelpTextModel.findByIdAndUpdate(
        helpTextId,
        { $inc: { helpful_count: 1 } },
        { new: true }
      );

      if (!helpText) {
        return res.status(404).json({ error: "Help text not found" });
      }

      return res.json({
        helpful_count: helpText.helpful_count,
        message: "Thank you for your feedback!"
      });
    }

    // Fallback to mock data
    const helpTextIndex = mockHelpQueries.findIndex(h => h.id === helpTextId);
    if (helpTextIndex === -1) {
      return res.status(404).json({ error: "Help text not found" });
    }

    (mockHelpQueries[helpTextIndex] as any).helpful_count = ((mockHelpQueries[helpTextIndex] as any).helpful_count || 0) + 1;

    return res.json({
      helpful_count: (mockHelpQueries[helpTextIndex] as any).helpful_count,
      message: "Thank you for your feedback!"
    });
  } catch (err) {
    console.error("Mark helpful error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/help/categories - Get all unique categories
router.get("/categories", async (req, res) => {
  try {
    await connectDB();

    if (isDBReady()) {
      const categories = await HelpTextModel.distinct("category");
      return res.json({ categories });
    }

    // Fallback to mock data
    const categories = [...new Set(mockHelpQueries.map(h => (h as any).category || 'general'))];
    return res.json({ categories });
  } catch (err) {
    console.error("Get categories error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/help/tags - Get all unique tags
router.get("/tags", async (req, res) => {
  try {
    await connectDB();

    if (isDBReady()) {
      const tags = await HelpTextModel.distinct("tags");
      return res.json({ tags });
    }

    // Fallback to mock data
    const allTags = mockHelpQueries.flatMap(h => (h as any).tags || []);
    const uniqueTags = [...new Set(allTags)];
    return res.json({ tags: uniqueTags });
  } catch (err) {
    console.error("Get tags error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { router as helpRoutes };
