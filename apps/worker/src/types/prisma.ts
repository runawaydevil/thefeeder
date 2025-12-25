/**
 * Re-export Prisma types to avoid import issues
 * This file ensures TypeScript can find the Prisma Client types
 */

// Export the full Prisma Client
export { PrismaClient } from "@prisma/client";

// For now, we'll use 'any' types for the models to avoid import issues
// These can be properly typed later when the Prisma client is working correctly
export type Item = any;
export type Feed = any;
