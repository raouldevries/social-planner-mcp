/**
 * Social Planner - Server Entry Point
 *
 * Starts the Express server with graceful shutdown handling.
 */

import app, { setupMCPRoutes, registerRemainingRoutes, setupErrorHandlers } from './app';
import { config } from './config';
import { logger } from './lib/logger';
import { prisma } from './lib/prisma';
import { redis } from './lib/redis';
import * as schedulerService from './services/scheduler.service';

async function main() {
  // Verify database connection
  try {
    await prisma.$connect();
    logger.info('Database connected');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to database');
    process.exit(1);
  }

  // Verify Redis connection
  try {
    await redis.ping();
    logger.info('Redis connected');
  } catch (error) {
    logger.error({ error }, 'Failed to connect to Redis');
    process.exit(1);
  }

  // Start scheduler workers
  try {
    await schedulerService.startScheduler();
    logger.info('Scheduler workers started');
  } catch (error) {
    logger.error({ error }, 'Failed to start scheduler workers');
    // Continue without scheduler - not critical for API operation
  }

  // Setup MCP routes first (dynamic import for SDK compatibility)
  // MCP routes must be registered BEFORE routes with router.use(requireAuth)
  // because those routers catch all /api/* requests and require JWT auth
  await setupMCPRoutes();

  // Register remaining routes (posts, channels, etc.) after MCP
  // These routes use router.use(requireAuth) which would block MCP OAuth endpoints
  registerRemainingRoutes();

  // Setup error handlers AFTER all routes (including MCP) are registered
  setupErrorHandlers();

  // Start server
  const server = app.listen(config.PORT, () => {
    logger.info({ port: config.PORT, env: config.NODE_ENV }, 'Server started');
  });

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    logger.info({ signal }, 'Shutdown signal received');

    server.close(async () => {
      logger.info('HTTP server closed');

      await schedulerService.stopScheduler();
      logger.info('Scheduler workers stopped');

      await prisma.$disconnect();
      logger.info('Database disconnected');

      redis.disconnect();
      logger.info('Redis disconnected');

      process.exit(0);
    });

    // Force shutdown after 30 seconds
    setTimeout(() => {
      logger.error('Forced shutdown after timeout');
      process.exit(1);
    }, 30000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  logger.error({ error }, 'Failed to start server');
  process.exit(1);
});
