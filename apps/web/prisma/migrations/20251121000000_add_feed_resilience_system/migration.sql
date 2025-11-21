-- CreateEnum
CREATE TYPE "FeedStatus" AS ENUM ('active', 'degraded', 'blocked', 'unreachable', 'paused');

-- CreateEnum
CREATE TYPE "RetryStrategy" AS ENUM ('standard', 'aggressive', 'conservative');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('warning', 'error', 'success', 'info');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('low', 'normal', 'high');

-- AlterTable
ALTER TABLE "Feed" ADD COLUMN     "avgResponseTime" INTEGER,
ADD COLUMN     "consecutiveFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "customTimeout" INTEGER,
ADD COLUMN     "failureCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "lastAttemptAt" TIMESTAMP(3),
ADD COLUMN     "lastError" TEXT,
ADD COLUMN     "lastSuccessAt" TIMESTAMP(3),
ADD COLUMN     "metadata" JSONB,
ADD COLUMN     "requiresBrowser" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "retryStrategy" "RetryStrategy" NOT NULL DEFAULT 'standard',
ADD COLUMN     "status" "FeedStatus" NOT NULL DEFAULT 'active',
ADD COLUMN     "totalAttempts" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalFailures" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "totalSuccesses" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "FeedHealthLog" (
    "id" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "success" BOOLEAN NOT NULL,
    "statusCode" INTEGER,
    "errorMessage" TEXT,
    "responseTime" INTEGER,
    "strategy" TEXT,

    CONSTRAINT "FeedHealthLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FeedNotification" (
    "id" TEXT NOT NULL,
    "feedId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'normal',
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FeedNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FeedHealthLog_feedId_attemptedAt_idx" ON "FeedHealthLog"("feedId", "attemptedAt");

-- CreateIndex
CREATE INDEX "FeedHealthLog_feedId_success_idx" ON "FeedHealthLog"("feedId", "success");

-- CreateIndex
CREATE INDEX "FeedNotification_isRead_createdAt_idx" ON "FeedNotification"("isRead", "createdAt");

-- AddForeignKey
ALTER TABLE "FeedHealthLog" ADD CONSTRAINT "FeedHealthLog_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "Feed"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FeedNotification" ADD CONSTRAINT "FeedNotification_feedId_fkey" FOREIGN KEY ("feedId") REFERENCES "Feed"("id") ON DELETE CASCADE ON UPDATE CASCADE;
