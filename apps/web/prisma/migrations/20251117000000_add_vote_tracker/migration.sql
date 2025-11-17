-- CreateEnum
CREATE TYPE "VoteType" AS ENUM ('like', 'dislike');

-- CreateTable
CREATE TABLE "VoteTracker" (
    "id" TEXT NOT NULL,
    "voterId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "voteType" "VoteType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VoteTracker_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VoteTracker_voterId_idx" ON "VoteTracker"("voterId");

-- CreateIndex
CREATE INDEX "VoteTracker_itemId_idx" ON "VoteTracker"("itemId");

-- CreateIndex
CREATE UNIQUE INDEX "VoteTracker_voterId_itemId_key" ON "VoteTracker"("voterId", "itemId");

-- AddForeignKey
ALTER TABLE "VoteTracker" ADD CONSTRAINT "VoteTracker_itemId_fkey" FOREIGN KEY ("itemId") REFERENCES "Item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
