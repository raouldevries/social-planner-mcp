/**
 * Social Planner - MCP Pending Actions Routes
 *
 * Routes for managing MCP pending actions (approve/reject).
 */

import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import * as postService from '../services/post.service';

const router = Router();

/**
 * List pending actions for the authenticated user
 * GET /api/mcp/pending-actions
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const actions = await prisma.mCPPendingAction.findMany({
      where: {
        userId: req.user!.id,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      actions: actions.map((a) => ({
        id: a.id,
        actionType: a.actionType,
        description: a.description,
        payload: a.payload,
        status: a.status,
        expiresAt: a.expiresAt.toISOString(),
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Get count of pending actions for the authenticated user
 * GET /api/mcp/pending-actions/count
 */
router.get('/count', requireAuth, async (req, res, next) => {
  try {
    const count = await prisma.mCPPendingAction.count({
      where: {
        userId: req.user!.id,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
    });

    res.json({ count });
  } catch (error) {
    next(error);
  }
});

/**
 * Get a specific pending action
 * GET /api/mcp/pending-actions/:id
 */
router.get('/:id', requireAuth, async (req, res, next) => {
  try {
    const action = await prisma.mCPPendingAction.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
      },
    });

    if (!action) {
      throw new AppError('ACTION_NOT_FOUND', 'Pending action not found', 404);
    }

    res.json({
      id: action.id,
      actionType: action.actionType,
      description: action.description,
      payload: action.payload,
      status: action.status,
      expiresAt: action.expiresAt.toISOString(),
      createdAt: action.createdAt.toISOString(),
      resolvedAt: action.resolvedAt?.toISOString() ?? null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Approve a pending action
 * POST /api/mcp/pending-actions/:id/approve
 */
router.post('/:id/approve', requireAuth, async (req, res, next) => {
  try {
    const action = await prisma.mCPPendingAction.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
        status: 'PENDING',
      },
    });

    if (!action) {
      throw new AppError('ACTION_NOT_FOUND', 'Pending action not found', 404);
    }

    if (action.expiresAt < new Date()) {
      await prisma.mCPPendingAction.update({
        where: { id: action.id },
        data: { status: 'EXPIRED' },
      });
      throw new AppError('ACTION_EXPIRED', 'Action has expired', 400);
    }

    // Execute the action based on type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const payload = action.payload as any;

    switch (action.actionType) {
      case 'schedule_post': {
        // MCP payload format: { postId, channels: [{ socialAccountId, scheduledAt, customContent? }] }
        const channels = payload.channels as Array<{
          socialAccountId: string;
          scheduledAt: string;
          customContent?: string;
        }>;

        if (!channels || channels.length === 0) {
          throw new AppError('INVALID_PAYLOAD', 'No channel schedule provided', 400);
        }

        // First, ensure PostChannel records exist for each socialAccountId
        // Check which channels already exist on the post
        const existingChannels = await prisma.postChannel.findMany({
          where: { postId: payload.postId },
          select: { socialAccountId: true },
        });
        const existingSocialAccountIds = new Set(existingChannels.map((c) => c.socialAccountId));

        // Create PostChannel records for any that don't exist
        const newChannels = channels.filter(
          (c) => !existingSocialAccountIds.has(c.socialAccountId)
        );
        if (newChannels.length > 0) {
          await prisma.postChannel.createMany({
            data: newChannels.map((c) => ({
              postId: payload.postId,
              socialAccountId: c.socialAccountId,
              customContent: c.customContent ?? null,
            })),
            skipDuplicates: true,
          });
        }

        // Use the first channel's scheduledAt as the main scheduledAt
        const mainScheduledAt = channels[0].scheduledAt;

        // Now schedule the post with all the channel schedules
        await postService.schedulePost(payload.postId, req.user!.id, {
          scheduledAt: mainScheduledAt,
          channelSchedules: channels.map((c) => ({
            socialAccountId: c.socialAccountId,
            scheduledAt: c.scheduledAt,
          })),
        });
        break;
      }
      // Add other action types as needed
      default:
        throw new AppError('UNKNOWN_ACTION', `Unknown action type: ${action.actionType}`, 400);
    }

    // Mark as approved
    await prisma.mCPPendingAction.update({
      where: { id: action.id },
      data: {
        status: 'APPROVED',
        resolvedAt: new Date(),
      },
    });

    res.json({ success: true, message: 'Action approved and executed' });
  } catch (error) {
    next(error);
  }
});

/**
 * Reject a pending action
 * POST /api/mcp/pending-actions/:id/reject
 */
router.post('/:id/reject', requireAuth, async (req, res, next) => {
  try {
    const action = await prisma.mCPPendingAction.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
        status: 'PENDING',
      },
    });

    if (!action) {
      throw new AppError('ACTION_NOT_FOUND', 'Pending action not found', 404);
    }

    await prisma.mCPPendingAction.update({
      where: { id: action.id },
      data: {
        status: 'REJECTED',
        resolvedAt: new Date(),
      },
    });

    res.json({ success: true, message: 'Action rejected' });
  } catch (error) {
    next(error);
  }
});

export default router;
