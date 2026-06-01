/**
 * Social Planner - Calendar Events Routes
 *
 * CRUD routes for custom calendar events (meetings, deadlines, reminders).
 * All routes require authentication. Events are shared with the entire team.
 */

import { Router } from 'express';
import { validate, validateQuery } from '../middleware/validate';
import { requireAuth, requireEditor } from '../middleware/auth';
import { writeRateLimiter } from '../middleware/rateLimiter';
import {
  createCalendarEventSchema,
  updateCalendarEventSchema,
  calendarEventFiltersSchema,
  rescheduleCalendarEventSchema,
} from '@social-planner/shared';
import * as calendarEventService from '../services/calendar-event.service';

const router = Router();

// ============================================
// ROUTES
// ============================================

/**
 * GET /api/calendar-events
 * List calendar events within a date range
 */
router.get('/', requireAuth, validateQuery(calendarEventFiltersSchema), async (req, res, next) => {
  try {
    const events = await calendarEventService.listCalendarEvents({
      from: req.query.from as string,
      to: req.query.to as string,
    });
    res.json({ data: events });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/calendar-events/:id
 * Get a single calendar event
 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const event = await calendarEventService.getCalendarEventById(req.params.id);
    res.json(event);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/calendar-events
 * Create a new calendar event
 */
router.post(
  '/',
  requireAuth,
  requireEditor,
  writeRateLimiter,
  validate(createCalendarEventSchema),
  async (req, res, next) => {
    try {
      const event = await calendarEventService.createCalendarEvent(req.user!.id, req.body);
      res.status(201).json(event);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/calendar-events/:id
 * Update a calendar event
 */
router.patch(
  '/:id',
  requireAuth,
  requireEditor,
  writeRateLimiter,
  validate(updateCalendarEventSchema),
  async (req, res, next) => {
    try {
      const event = await calendarEventService.updateCalendarEvent(req.params.id, req.body);
      res.json(event);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * PATCH /api/calendar-events/:id/reschedule
 * Reschedule a calendar event (drag-and-drop)
 */
router.patch(
  '/:id/reschedule',
  requireAuth,
  requireEditor,
  writeRateLimiter,
  validate(rescheduleCalendarEventSchema),
  async (req, res, next) => {
    try {
      const event = await calendarEventService.rescheduleCalendarEvent(
        req.params.id,
        req.body.startAt,
        req.body.endAt
      );
      res.json(event);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * DELETE /api/calendar-events/:id
 * Delete a calendar event
 */
router.delete('/:id', requireAuth, requireEditor, writeRateLimiter, async (req, res, next) => {
  try {
    await calendarEventService.deleteCalendarEvent(req.params.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

export default router;
