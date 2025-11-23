import express from "express";
import { connectDB, isDBReady } from "../services/db.js";
import FeedbackModel, { IFeedback } from "../models/Feedback.js";
import { mockFeedbacks } from "../data/mockData.js";
import { v4 as uuidv4 } from "uuid";

const router = express.Router();

// GET /api/feedback - List all feedback (admin only)
router.get("/", async (req, res) => {
  const {
    limit = 20,
    offset = 0,
    user_id,
    event_id,
    status,
    type
  } = req.query;

  try {
    await connectDB();

    if (isDBReady()) {
      const query: any = {};
      if (user_id) query.user_id = user_id;
      if (event_id) query.event_id = event_id;
      if (status) query.status = status;
      if (type) query.type = type;

      const total = await FeedbackModel.countDocuments(query);
      const feedbacks = await FeedbackModel.find(query)
        .sort({ timestamp: -1 })
        .skip(parseInt(offset as string))
        .limit(parseInt(limit as string));

      const normalized = feedbacks.map((f) => ({
        id: f._id.toString(),
        event_id: f.event_id,
        user_id: f.user_id,
        user_name: f.user_name,
        user_email: f.user_email,
        rating: f.rating,
        feedback: f.feedback,
        type: f.type,
        status: f.status,
        timestamp: f.timestamp.toISOString(),
        is_read: f.is_read,
        admin_response: f.admin_response,
        responded_at: f.responded_at?.toISOString(),
      }));

      return res.json({ feedbacks: normalized, total });
    }

    // Fallback to mock data
    let filtered = [...mockFeedbacks];
    if (user_id) filtered = filtered.filter(f => f.user_id === user_id);
    if (event_id) filtered = filtered.filter(f => f.event_id === event_id);
    
    const start = parseInt(offset as string);
    const end = start + parseInt(limit as string);
    const paginated = filtered.slice(start, end);

    return res.json({ feedbacks: paginated, total: filtered.length });
  } catch (err) {
    console.error("Get feedbacks error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/feedback/:id - Get single feedback
router.get("/:id", async (req, res) => {
  const feedbackId = req.params.id;

  try {
    await connectDB();

    if (isDBReady()) {
      const feedback = await FeedbackModel.findById(feedbackId);
      if (!feedback) {
        return res.status(404).json({ error: "Feedback not found" });
      }

      return res.json({
        feedback: {
          id: feedback._id.toString(),
          ...feedback.toObject(),
        },
      });
    }

    // Fallback to mock data
    const feedback = mockFeedbacks.find(f => f.id === feedbackId);
    if (!feedback) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    return res.json({ feedback });
  } catch (err) {
    console.error("Get feedback error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/feedback - Create new feedback
router.post("/", async (req, res) => {
  const {
    event_id,
    user_id,
    user_name,
    user_email,
    rating,
    feedback,
    type = 'general'
  } = req.body;

  try {
    await connectDB();

    if (isDBReady()) {
      const newFeedback = await FeedbackModel.create({
        event_id,
        user_id,
        user_name: user_name || "Anonymous User",
        user_email: user_email || "anonymous@college.edu",
        rating: rating ? parseInt(String(rating)) : undefined,
        feedback,
        type,
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
          user_name: newFeedback.user_name,
          rating: newFeedback.rating,
          feedback: newFeedback.feedback,
          timestamp: newFeedback.timestamp.toISOString(),
        });
      }

      return res.status(201).json({
        feedback: {
          id: newFeedback._id.toString(),
          ...newFeedback.toObject(),
        },
      });
    }

    // Fallback to mock data
    const newFeedback = {
      id: uuidv4(),
      event_id,
      user_id,
      user_name: user_name || "Anonymous User",
      user_email: user_email || "anonymous@college.edu",
      rating: rating ? parseInt(String(rating)) : undefined,
      feedback,
      timestamp: new Date().toISOString(),
      is_read: false,
    };

    mockFeedbacks.push(newFeedback as any);

    const io = req.app.get("io");
    if (io) {
      io.to("admin").emit("new_feedback", {
        feedback_id: newFeedback.id,
        event_id: newFeedback.event_id,
        user_name: newFeedback.user_name,
        rating: newFeedback.rating,
        feedback: newFeedback.feedback,
        timestamp: newFeedback.timestamp,
      });
    }

    return res.status(201).json({ feedback: newFeedback });
  } catch (err) {
    console.error("Create feedback error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/feedback/:id - Update feedback (mark as read, add response, change status)
router.put("/:id", async (req, res) => {
  const feedbackId = req.params.id;
  const { is_read, admin_response, status } = req.body;

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

      const feedback = await FeedbackModel.findByIdAndUpdate(
        feedbackId,
        updates,
        { new: true }
      );

      if (!feedback) {
        return res.status(404).json({ error: "Feedback not found" });
      }

      return res.json({
        feedback: {
          id: feedback._id.toString(),
          ...feedback.toObject(),
        },
      });
    }

    // Fallback to mock data
    const feedbackIndex = mockFeedbacks.findIndex(f => f.id === feedbackId);
    if (feedbackIndex === -1) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    if (typeof is_read !== 'undefined') {
      mockFeedbacks[feedbackIndex].is_read = is_read;
    }

    return res.json({ feedback: mockFeedbacks[feedbackIndex] });
  } catch (err) {
    console.error("Update feedback error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/feedback/:id - Delete feedback
router.delete("/:id", async (req, res) => {
  const feedbackId = req.params.id;

  try {
    await connectDB();

    if (isDBReady()) {
      const feedback = await FeedbackModel.findByIdAndDelete(feedbackId);
      if (!feedback) {
        return res.status(404).json({ error: "Feedback not found" });
      }

      return res.json({ message: "Feedback deleted successfully" });
    }

    // Fallback to mock data
    const feedbackIndex = mockFeedbacks.findIndex(f => f.id === feedbackId);
    if (feedbackIndex === -1) {
      return res.status(404).json({ error: "Feedback not found" });
    }

    mockFeedbacks.splice(feedbackIndex, 1);

    return res.json({ message: "Feedback deleted successfully" });
  } catch (err) {
    console.error("Delete feedback error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/feedback/stats/summary - Get feedback statistics
router.get("/stats/summary", async (req, res) => {
  try {
    await connectDB();

    if (isDBReady()) {
      const total = await FeedbackModel.countDocuments();
      const pending = await FeedbackModel.countDocuments({ status: 'pending' });
      const reviewed = await FeedbackModel.countDocuments({ status: 'reviewed' });
      const resolved = await FeedbackModel.countDocuments({ status: 'resolved' });
      
      const avgRatingResult = await FeedbackModel.aggregate([
        { $match: { rating: { $exists: true, $ne: null } } },
        { $group: { _id: null, avg_rating: { $avg: "$rating" } } }
      ]);
      const avg_rating = avgRatingResult.length > 0 ? avgRatingResult[0].avg_rating : 0;

      const typeStats = await FeedbackModel.aggregate([
        { $group: { _id: "$type", count: { $sum: 1 } } }
      ]);

      return res.json({
        summary: { total, pending, reviewed, resolved, avg_rating },
        by_type: typeStats,
      });
    }

    // Fallback to mock data
    const total = mockFeedbacks.length;
    const pending = mockFeedbacks.filter(f => (f as any).status === 'pending').length;
    const reviewed = mockFeedbacks.filter(f => (f as any).status === 'reviewed').length;
    const resolved = mockFeedbacks.filter(f => (f as any).status === 'resolved').length;
    const avg_rating = mockFeedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / total || 0;

    const typeStats = mockFeedbacks.reduce((acc, f) => {
      const type = (f as any).type || 'general';
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return res.json({
      summary: { total, pending, reviewed, resolved, avg_rating },
      by_type: Object.entries(typeStats).map(([type, count]) => ({ _id: type, count })),
    });
  } catch (err) {
    console.error("Get feedback stats error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

export { router as feedbackRoutes };
