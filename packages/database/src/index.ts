/**
 * Social Planner - Database Package
 *
 * Exports a singleton Prisma client instance and all generated types.
 */

import { PrismaClient } from '@prisma/client';

// Re-export all Prisma types for use in other packages
export * from '@prisma/client';

// Singleton pattern to prevent multiple Prisma Client instances in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === 'development'
        ? ['query', 'error', 'warn']
        : ['error'],
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Default export for convenience
export default prisma;
