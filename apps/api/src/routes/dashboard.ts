/**
 * Social Planner - Dashboard Routes
 *
 * API endpoints for dashboard statistics and overview data.
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import * as dashboardService from '../services/dashboard.service';

const router = Router();

// All dashboard routes require authentication
router.use(requireAuth);

// ============================================
// DASHBOARD ROUTES
// ============================================

/**
 * GET /api/dashboard
 * Get dashboard overview data including stats, activity, and upcoming posts
 */
router.get('/', async (_req, res, next) => {
  try {
    const data = await dashboardService.getDashboardData();
    res.json(data);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/stats
 * Get post statistics only
 */
router.get('/stats', async (_req, res, next) => {
  try {
    const stats = await dashboardService.getPostStats();
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/activity
 * Get recent activity
 */
router.get('/activity', async (_req, res, next) => {
  try {
    const activity = await dashboardService.getRecentActivity(10);
    res.json(activity);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/dashboard/upcoming
 * Get upcoming scheduled posts
 */
router.get('/upcoming', async (_req, res, next) => {
  try {
    const posts = await dashboardService.getUpcomingPosts(5);
    res.json(posts);
  } catch (error) {
    next(error);
  }
});

export default router;
