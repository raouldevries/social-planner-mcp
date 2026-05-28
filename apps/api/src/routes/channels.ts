/**
 * Social Planner - Channel Routes
 *
 * API endpoints for multi-channel publishing operations.
 * Manages channels on posts (add, update, remove, schedule).
 */

import { Router } from 'express';
import { validate } from '../middleware/validate';
import { requireAuth, requireEditor } from '../middleware/auth';
import { writeRateLimiter } from '../middleware/rateLimiter';
import { z } from 'zod';
import * as channelService from '../services/channel.service';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const updateChannelSchema = z.object({
  customContent: z.string().max(5000).optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

const scheduleChannelSchema = z.object({
  scheduledAt: z.string().datetime('Invalid schedule date'),
});

// ============================================
// INDIVIDUAL CHANNEL OPERATIONS
// Note: Post-nested routes (GET/POST /api/posts/:id/channels) are in posts.ts
// ============================================

/**
 * GET /api/channels/:channelId
 * Get channel details
 */
router.get(
  '/channels/:channelId',
  async (req, res, next) => {
    try {
      const { channelId } = req.params;
      const channel = await channelService.getChannelById(channelId);
      res.json(channel);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/channels/:channelId
 * Update a channel (custom content, schedule)
 */
router.patch(
  '/channels/:channelId',
  requireEditor,
  writeRateLimiter,
  validate(updateChannelSchema),
  async (req, res, next) => {
    try {
      const { channelId } = req.params;
      const userId = req.user!.id;
      const channel = await channelService.updateChannel(channelId, req.body, userId);
      res.json(channel);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/channels/:channelId
 * Remove a channel from a post
 */
router.delete(
  '/channels/:channelId',
  requireEditor,
  writeRateLimiter,
  async (req, res, next) => {
    try {
      const { channelId } = req.params;
      const userId = req.user!.id;
      await channelService.removeChannelFromPost(channelId, userId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// CHANNEL SCHEDULING
// ============================================

/**
 * POST /api/channels/:channelId/schedule
 * Schedule an individual channel
 */
router.post(
  '/channels/:channelId/schedule',
  requireEditor,
  writeRateLimiter,
  validate(scheduleChannelSchema),
  async (req, res, next) => {
    try {
      const { channelId } = req.params;
      const userId = req.user!.id;
      const { scheduledAt } = req.body as { scheduledAt: string };
      const channel = await channelService.scheduleChannel(channelId, scheduledAt, userId);
      res.json(channel);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/channels/:channelId/unschedule
 * Remove schedule from a channel
 */
router.post(
  '/channels/:channelId/unschedule',
  requireEditor,
  writeRateLimiter,
  async (req, res, next) => {
    try {
      const { channelId } = req.params;
      const userId = req.user!.id;
      const channel = await channelService.unscheduleChannel(channelId, userId);
      res.json(channel);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/channels/:channelId/retry
 * Retry a failed channel
 */
router.post(
  '/channels/:channelId/retry',
  requireEditor,
  writeRateLimiter,
  async (req, res, next) => {
    try {
      const { channelId } = req.params;
      const userId = req.user!.id;
      const channel = await channelService.retryFailedChannel(channelId, userId);
      res.json(channel);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
