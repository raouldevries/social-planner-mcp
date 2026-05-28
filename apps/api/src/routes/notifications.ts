/**
 * Social Planner - Notification Routes
 *
 * API endpoints for user notifications.
 */

import { Router } from 'express';
import { validateQuery } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { writeRateLimiter } from '../middleware/rateLimiter';
import { z } from 'zod';
import * as notificationService from '../services/notification.service';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const listQuerySchema = z.object({
  unreadOnly: z.coerce.boolean().optional(),
  type: z
    .enum([
      'POST_SUBMITTED',
      'POST_APPROVED',
      'POST_REJECTED',
      'POST_PUBLISHED',
      'POST_FAILED',
      'COMMENT_ADDED',
      'MENTION',
      'COLLABORATOR_ASSIGNED',
      'EDIT_REQUESTED',
      'REVIEW_REQUESTED',
      'AMBASSADOR_CONTENT',
      'FEEDBACK_SUBMITTED',
    ])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================
// NOTIFICATION ROUTES
// ============================================

/**
 * GET /api/notifications
 * Get current user's notifications
 */
router.get('/', validateQuery(listQuerySchema), async (req, res, next) => {
  try {
    const { page, perPage, unreadOnly, type } = req.query as any;
    const userId = req.user!.id;

    const filters: notificationService.NotificationFilters = {};
    if (unreadOnly !== undefined) filters.unreadOnly = unreadOnly;
    if (type) filters.type = type;

    const result = await notificationService.getUserNotifications(
      userId,
      filters,
      page ?? 1,
      perPage ?? 20
    );
    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/notifications/unread-count
 * Get unread notification count
 */
router.get('/unread-count', async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const count = await notificationService.getUnreadCount(userId);
    res.json({ count });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/notifications/:id/read
 * Mark a notification as read
 */
router.post('/:id/read', writeRateLimiter, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const notification = await notificationService.markAsRead(id, userId);
    res.json(notification);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/notifications/read-all
 * Mark all notifications as read
 */
router.post('/read-all', writeRateLimiter, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const count = await notificationService.markAllAsRead(userId);
    res.json({ markedAsRead: count });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/notifications/:id
 * Delete a notification
 */
router.delete('/:id', writeRateLimiter, async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    await notificationService.deleteNotification(id, userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/notifications/read
 * Delete all read notifications
 */
router.delete('/read', writeRateLimiter, async (req, res, next) => {
  try {
    const userId = req.user!.id;
    const count = await notificationService.deleteReadNotifications(userId);
    res.json({ deleted: count });
  } catch (error) {
    next(error);
  }
});

export default router;
