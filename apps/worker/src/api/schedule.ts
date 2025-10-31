import express from "express";
import { scheduleFeed, unscheduleFeed } from "../lib/scheduler.js";

const router = express.Router();

// Middleware for basic auth
const requireAuth = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const authHeader = req.headers.authorization;
  const expectedToken = process.env.WORKER_API_TOKEN || "change-me-in-production";
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  const token = authHeader.substring(7);
  if (token !== expectedToken) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  
  next();
};

// POST /schedule/:feedId - Schedule or reschedule a feed
router.post("/:feedId", requireAuth, async (req, res) => {
  try {
    const { feedId } = req.params;
    await scheduleFeed(feedId);
    res.json({ success: true, message: `Feed ${feedId} scheduled` });
  } catch (error: any) {
    console.error("Error scheduling feed:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// DELETE /schedule/:feedId - Unschedule a feed
router.delete("/:feedId", requireAuth, async (req, res) => {
  try {
    const { feedId } = req.params;
    await unscheduleFeed(feedId);
    res.json({ success: true, message: `Feed ${feedId} unscheduled` });
  } catch (error: any) {
    console.error("Error unscheduling feed:", error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

export default router;

