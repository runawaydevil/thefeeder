import { Worker, Queue } from "bullmq";
import express from "express";
import { prisma } from "./lib/prisma.js";
import { processFeedFetch, FeedFetchJobData } from "./jobs/feed-fetch.js";
import { processDailyDigest, DailyDigestJobData } from "./jobs/daily-digest.js";
import { scheduleFeed } from "./lib/scheduler.js";
import scheduleRouter from "./api/schedule.js";
import { monitoringAlertsService } from "./lib/monitoring-alerts.js";

// Configure timezone from environment variable
const timezone = process.env.TZ || "America/Sao_Paulo";
process.env.TZ = timezone;

// Log timezone configuration
console.log(`🌍 Timezone configured: ${timezone}`);
const testDate = new Date();
const tzString = Intl.DateTimeFormat().resolvedOptions().timeZone;
console.log(`   Node.js timezone: ${tzString}`);
console.log(`   Current time: ${testDate.toLocaleString("pt-BR", { timeZone: timezone })}`);

// Environment variables are injected by Docker Compose via env_file and environment
// No need to load .env file manually in Docker environment

// TZ is automatically read by Node.js from process.env
const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
// Internal container port is 3001 (mapped to 7388 externally via docker-compose)
const WORKER_API_PORT = parseInt(process.env.WORKER_API_PORT || "3001", 10);

// Create queues
const feedFetchQueue = new Queue<FeedFetchJobData>("feed-fetch", {
  connection: { url: REDIS_URL },
});

const dailyDigestQueue = new Queue<DailyDigestJobData>("daily-digest", {
  connection: { url: REDIS_URL },
});

// Create workers
const feedFetchWorker = new Worker<FeedFetchJobData>(
  "feed-fetch",
  async (job) => {
    return await processFeedFetch(job);
  },
  {
    connection: { url: REDIS_URL },
    concurrency: 5,
  },
);

const dailyDigestWorker = new Worker<DailyDigestJobData>(
  "daily-digest",
  async (job) => {
    return await processDailyDigest(job);
  },
  {
    connection: { url: REDIS_URL },
    concurrency: 1,
  },
);

// Worker event handlers
feedFetchWorker.on("completed", (job) => {
  console.log(`Feed fetch job ${job.id} completed`);
});

feedFetchWorker.on("failed", (job, err) => {
  console.error(`Feed fetch job ${job?.id} failed:`, err);
});

dailyDigestWorker.on("completed", (job) => {
  console.log(`Daily digest job ${job.id} completed`);
});

dailyDigestWorker.on("failed", (job, err) => {
  console.error(`Daily digest job ${job?.id} failed:`, err);
});

// Function to schedule feed fetches
async function scheduleFeedFetches() {
  const feeds = await prisma.feed.findMany({
    where: { isActive: true },
  });

  for (const feed of feeds) {
    try {
      await scheduleFeed(feed.id);
    } catch (error) {
      console.error(`Error scheduling feed ${feed.id}:`, error);
    }
  }
}

// Function to schedule daily digest
async function scheduleDailyDigest() {
  const digestTime = process.env.DIGEST_TIME || "09:00"; // Default 9 AM
  const [hour, minute] = digestTime.split(":").map(Number);
  const timezone = process.env.TZ || "UTC";

  await dailyDigestQueue.add(
    "daily-digest",
    { scheduledAt: new Date() },
    {
      repeat: {
        pattern: `${minute} ${hour} * * *`, // Daily at specified time
        tz: timezone, // Use configured timezone
      },
    },
  );

  console.log(`Daily digest scheduled for ${digestTime} daily (timezone: ${timezone})`);
}

// Function to run monitoring checks periodically
async function startMonitoring() {
  // Run initial check
  await monitoringAlertsService.logAlerts();
  
  // Run checks every hour
  setInterval(async () => {
    try {
      await monitoringAlertsService.logAlerts();
    } catch (error) {
      console.error('[Monitoring] Error running health checks:', error);
    }
  }, 60 * 60 * 1000); // 1 hour
  
  console.log('📊 Monitoring alerts scheduled (every hour)');
}

// Initialize
async function start() {
  console.log("🚀 Starting TheFeeder Worker...");

  try {
    // Start Express API server for scheduling
    const app = express();
    app.use(express.json());
    app.use("/api/schedule", scheduleRouter);
    
    // Import API handlers
    const { testAlternative } = await import('./api/test-alternative.js');
    const { getBrowserAutomationStats } = await import('./api/browser-automation-stats.js');
    
    app.post("/api/feeds/test-alternative", testAlternative);
    app.get("/api/browser-automation/stats", getBrowserAutomationStats);
    
    app.get("/health", (req, res) => {
      res.json({ status: "ok" });
    });

    app.listen(WORKER_API_PORT, () => {
      console.log(`📡 Worker API listening on port ${WORKER_API_PORT}`);
    });

    await scheduleFeedFetches();
    await scheduleDailyDigest();
    await startMonitoring();
    console.log("✅ Worker started successfully");
  } catch (error) {
    console.error("❌ Error starting worker:", error);
    process.exit(1);
  }
}

// Handle shutdown
process.on("SIGTERM", async () => {
  console.log("SIGTERM received, shutting down...");
  await feedFetchWorker.close();
  await dailyDigestWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  console.log("SIGINT received, shutting down...");
  await feedFetchWorker.close();
  await dailyDigestWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});

start();

