/**
 * Social Planner - Prisma Client
 *
 * Re-exports the singleton Prisma client from @social-planner/database.
 */

import { prisma, Prisma } from '@social-planner/database';
import { logger } from './logger';

// Log queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$use(
    async (
      params: Prisma.MiddlewareParams,
      next: (params: Prisma.MiddlewareParams) => Promise<unknown>
    ) => {
      const before = Date.now();
      const result = await next(params);
      const after = Date.now();

      logger.debug(
        {
          model: params.model,
          action: params.action,
          duration: after - before,
        },
        'Database query'
      );

      return result;
    }
  );
}

export { prisma };
