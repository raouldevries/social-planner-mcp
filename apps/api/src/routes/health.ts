/**
 * Social Planner - Health Check Routes
 *
 * Endpoints for health monitoring and readiness checks.
 */

import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';

const router = Router();

// Basic health check
router.get('/', async (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Readiness check - verifies database and Redis connections
router.get('/ready', async (_req, res) => {
  const checks = {
    database: false,
    redis: false,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = true;
  } catch {
    // Database not ready
  }

  try {
    await redis.ping();
    checks.redis = true;
  } catch {
    // Redis not ready
  }

  const allHealthy = Object.values(checks).every(Boolean);

  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'ready' : 'not_ready',
    checks,
    timestamp: new Date().toISOString(),
  });
});

export default router;
