/**
 * Re-export Prisma types to avoid import issues
 * This file ensures TypeScript can find the Prisma Client types
 */

// Import from the generated Prisma Client
import type { Item as PrismaItem, Feed as PrismaFeed } from "@prisma/client";

// Re-export the types
export type Item = PrismaItem;
export type Feed = PrismaFeed;

// Also export the full Prisma Client
export { PrismaClient } from "@prisma/client";
