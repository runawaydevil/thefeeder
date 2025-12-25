import { Worker, Queue, Job } from "bullmq";
import express from "express";
import { prisma } from "./lib/prisma.js";
import { processFeedFetch, FeedFetchJobData } from "./jobs/feed-fetch.js";
import { processDailyDigest, DailyDigestJobData } from "./jobs/daily-digest.js";
import { scheduleFeed } from "./lib/scheduler.js";
import scheduleRouter from "./api/schedule.js";
import { monitoringAlertsService } from "./lib/monitoring-alerts.js";
import { logger } from "./lib/logger.js";

// Configure timezone from environment variable
const timezone = process.env.TZ || "America/Sao_Paulo";
process.env.TZ = timezone;

// Log timezone configuration only on startup
logger.info(`Timezone configured: ${timezone}`, {
  nodeTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  currentTime: new Date().toLocaleString("pt-BR", { timeZone: timezone })
});

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
  async (job: Job<FeedFetchJobData>) => {
    return await processFeedFetch(job);
  },
  {
    connection: { url: REDIS_URL },
    concurrency: 5,
  },
);

const dailyDigestWorker = new Worker<DailyDigestJobData>(
  "daily-digest",
  async (job: Job<DailyDigestJobData>) => {
    return await processDailyDigest(job);
  },
  {
    connection: { url: REDIS_URL },
    concurrency: 1,
  },
);

// Worker event handlers - only log failures
feedFetchWorker.on("failed", (job: Job<FeedFetchJobData> | undefined, err: Error) => {
  logger.error(`Feed fetch job ${job?.id} failed`, err);
});

dailyDigestWorker.on("failed", (job: Job<DailyDigestJobData> | undefined, err: Error) => {
  logger.error(`Daily digest job ${job?.id} failed`, err);
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
      logger.error(`Error scheduling feed ${feed.id}`, error as Error);
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

  logger.info(`Daily digest scheduled for ${digestTime} daily`, { timezone });
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
      logger.error('Error running health checks', error as Error);
    }
  }, 60 * 60 * 1000); // 1 hour
  
  logger.info('Monitoring alerts scheduled (every hour)');
}

// Initialize
async function start() {
  logger.info("Starting TheFeeder Worker...");

  try {
    // Initialize Redis connection
    try {
      const { initializeRedis } = await import('./lib/cache.js');
      const redisConnected = await initializeRedis();
      if (redisConnected) {
        logger.info('Redis initialized successfully');
      } else {
        logger.warn('Redis initialization failed - cache will be disabled');
      }
    } catch (error) {
      logger.error('Failed to initialize Redis', error as Error);
    }

    // Start Express API server for scheduling
    const app = express();
    app.use(express.json());
    app.use("/api/schedule", scheduleRouter);
    
    // Import API handlers
    const { testAlternative } = await import('./api/test-alternative.js');
    const { getBrowserAutomationStats } = await import('./api/browser-automation-stats.js');
    const { getHealthCheck } = await import('./api/health-check.js');
    
    app.post("/api/feeds/test-alternative", testAlternative);
    app.get("/api/browser-automation/stats", getBrowserAutomationStats);
    
    app.get("/health", getHealthCheck);

    app.listen(WORKER_API_PORT, () => {
      logger.info(`Worker API listening on port ${WORKER_API_PORT}`);
    });

    await scheduleFeedFetches();
    await scheduleDailyDigest();
    await startMonitoring();
    logger.info("Worker started successfully");
  } catch (error) {
    logger.error("Error starting worker", error as Error);
    process.exit(1);
  }
}

// Handle shutdown
process.on("SIGTERM", async () => {
  logger.info("SIGTERM received, shutting down...");
  await feedFetchWorker.close();
  await dailyDigestWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});

process.on("SIGINT", async () => {
  logger.info("SIGINT received, shutting down...");
  await feedFetchWorker.close();
  await dailyDigestWorker.close();
  await prisma.$disconnect();
  process.exit(0);
});

start();

