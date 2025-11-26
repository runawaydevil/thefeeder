import { Request, Response } from "express";
import { prisma } from "../lib/prisma.js";
import { getHealthStatus as getRedisHealth } from "../lib/cache.js";

export interface HealthCheckResponse {
  status: "healthy" | "degraded" | "unhealthy";
  timestamp: string;
  version: string;
  services: {
    database: {
      status: "healthy" | "unhealthy";
      responseTime?: number;
      error?: string;
    };
    redis: {
      status: "healthy" | "unhealthy";
      connected: boolean;
      error?: string;
    };
  };
  metrics: {
    feeds: {
      total: number;
      active: number;
      paused: number;
      degraded: number;
    };
    items: {
      total: number;
    };
    subscribers: {
      total: number;
      approved: number;
    };
    jobs: {
      feedFetch: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
      };
      dailyDigest: {
        waiting: number;
        active: number;
        completed: number;
        failed: number;
      };
    };
  };
}

export async function getHealthCheck(req: Request, res: Response) {
  const health: HealthCheckResponse = {
    status: "healthy",
    timestamp: new Date().toISOString(),
    version: "2.0.0",
    services: {
      database: {
        status: "unhealthy",
      },
      redis: {
        status: "unhealthy",
        connected: false,
      },
    },
    metrics: {
      feeds: {
        total: 0,
        active: 0,
        paused: 0,
        degraded: 0,
      },
      items: {
        total: 0,
      },
      subscribers: {
        total: 0,
        approved: 0,
      },
      jobs: {
        feedFetch: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
        },
        dailyDigest: {
          waiting: 0,
          active: 0,
          completed: 0,
          failed: 0,
        },
      },
    },
  };

  // Check database
  try {
    const dbStartTime = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    health.services.database = {
      status: "healthy",
      responseTime: Date.now() - dbStartTime,
    };
  } catch (error: any) {
    health.services.database = {
      status: "unhealthy",
      error: error.message || "Database connection failed",
    };
    health.status = "unhealthy";
  }

  // Check Redis
  try {
    const redisHealth = await getRedisHealth();
    health.services.redis = {
      status: redisHealth.connected ? "healthy" : "unhealthy",
      connected: redisHealth.connected,
      error: redisHealth.error,
    };
    if (!redisHealth.connected) {
      health.status = health.status === "unhealthy" ? "unhealthy" : "degraded";
    }
  } catch (error: any) {
    health.services.redis = {
      status: "unhealthy",
      connected: false,
      error: error.message || "Redis check failed",
    };
    health.status = health.status === "unhealthy" ? "unhealthy" : "degraded";
  }

  // Get metrics (only if database is healthy)
  if (health.services.database.status === "healthy") {
    try {
      const [feeds, items, subscribers] = await Promise.all([
        prisma.feed.findMany({
          select: {
            isActive: true,
            status: true,
          },
        }),
        prisma.item.count(),
        prisma.subscriber.findMany({
          select: {
            status: true,
          },
        }),
      ]);

      health.metrics.feeds.total = feeds.length;
      health.metrics.feeds.active = feeds.filter(
        (f) => f.isActive && f.status === "active",
      ).length;
      health.metrics.feeds.paused = feeds.filter(
        (f) => f.status === "paused",
      ).length;
      health.metrics.feeds.degraded = feeds.filter(
        (f) => f.status === "degraded",
      ).length;

      health.metrics.items.total = items;

      health.metrics.subscribers.total = subscribers.length;
      health.metrics.subscribers.approved = subscribers.filter(
        (s) => s.status === "approved",
      ).length;
    } catch (error: any) {
      // Metrics failure doesn't affect health status
      console.error("[Health Check] Error fetching metrics:", error);
    }
  }

  // Get job queue metrics (if Redis is available)
  if (health.services.redis.connected) {
    try {
      const { Queue } = await import("bullmq");
      const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
      
      const feedFetchQueue = new Queue("feed-fetch", {
        connection: { url: REDIS_URL },
      });
      const dailyDigestQueue = new Queue("daily-digest", {
        connection: { url: REDIS_URL },
      });

      const [feedFetchJobs, dailyDigestJobs] = await Promise.all([
        Promise.all([
          feedFetchQueue.getWaitingCount(),
          feedFetchQueue.getActiveCount(),
          feedFetchQueue.getCompletedCount(),
          feedFetchQueue.getFailedCount(),
        ]),
        Promise.all([
          dailyDigestQueue.getWaitingCount(),
          dailyDigestQueue.getActiveCount(),
          dailyDigestQueue.getCompletedCount(),
          dailyDigestQueue.getFailedCount(),
        ]),
      ]);

      health.metrics.jobs.feedFetch = {
        waiting: feedFetchJobs[0],
        active: feedFetchJobs[1],
        completed: feedFetchJobs[2],
        failed: feedFetchJobs[3],
      };

      health.metrics.jobs.dailyDigest = {
        waiting: dailyDigestJobs[0],
        active: dailyDigestJobs[1],
        completed: dailyDigestJobs[2],
        failed: dailyDigestJobs[3],
      };
    } catch (error: any) {
      console.error("[Health Check] Error fetching job metrics:", error);
    }
  }

  const statusCode = health.status === "healthy" ? 200 : health.status === "degraded" ? 200 : 503;

  res.status(statusCode).json(health);
}

