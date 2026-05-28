/**
 * Social Planner - Social Account Routes
 *
 * API endpoints for social account management (Instagram, LinkedIn).
 */

import { Router } from 'express';
import { validateQuery, validate } from '../middleware/validate';
import { requireAuth, requireAdmin, requireEditor } from '../middleware/auth';
import { z } from 'zod';
import * as socialAccountService from '../services/social-account.service';
import { AppError } from '../middleware/errorHandler';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// ============================================
// VALIDATION SCHEMAS
// ============================================

const listQuerySchema = z.object({
  platform: z.enum(['INSTAGRAM', 'LINKEDIN']).optional(),
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(100).default(20),
});

const oauthCallbackSchema = z.object({
  code: z.string().min(1, 'Authorization code is required'),
});

const linkedInCompleteSchema = z.object({
  accessToken: z.string().min(1, 'Access token is required'),
  expiresIn: z.number().positive('Expires in must be positive'),
  organizationUrn: z.string().optional(),
  organizationName: z.string().optional(),
  organizationLogoUrl: z.string().url().optional().or(z.literal('')),
  personalProfileId: z.string().optional(),
  personalProfileName: z.string().optional(),
  personalProfilePicture: z.string().url().optional().or(z.literal('')).or(z.literal(undefined)),
});

// ============================================
// SOCIAL ACCOUNT CRUD
// ============================================

/**
 * GET /api/social-accounts
 * List all social accounts
 */
router.get('/', validateQuery(listQuerySchema), async (req, res, next) => {
  try {
    const { platform, page, perPage } = req.query as any;

    const filters: socialAccountService.SocialAccountFilters = {};
    if (platform) {
      filters.platform = platform;
    }

    const result = await socialAccountService.getSocialAccounts(filters, page ?? 1, perPage ?? 20);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/social-accounts/:accountId
 * Get a specific social account
 */
router.get('/:accountId', async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const account = await socialAccountService.getSocialAccountById(accountId);
    res.json(account);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/social-accounts/:accountId
 * Disconnect a social account
 */
router.delete('/:accountId', requireAdmin, async (req, res, next) => {
  try {
    const { accountId } = req.params;
    const userId = req.user!.id;

    await socialAccountService.deleteSocialAccount(accountId, userId);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

// ============================================
// INSTAGRAM OAUTH
// ============================================

/**
 * GET /api/social-accounts/oauth/instagram
 * Get Instagram OAuth URL
 */
router.get('/oauth/instagram', requireEditor, async (_req, res, next) => {
  try {
    const authUrl = socialAccountService.getInstagramAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/social-accounts/oauth/instagram/callback
 * Handle Instagram OAuth callback
 */
router.post(
  '/oauth/instagram/callback',
  requireEditor,
  validate(oauthCallbackSchema),
  async (req, res, next) => {
    try {
      const { code } = req.body as { code: string };
      const userId = req.user!.id;

      const account = await socialAccountService.handleInstagramCallback(code, userId);
      res.status(201).json(account);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// LINKEDIN OAUTH
// ============================================

/**
 * GET /api/social-accounts/oauth/linkedin
 * Get LinkedIn OAuth URL
 */
router.get('/oauth/linkedin', requireEditor, async (_req, res, next) => {
  try {
    const authUrl = socialAccountService.getLinkedInAuthUrl();
    res.json({ authUrl });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/social-accounts/oauth/linkedin/callback
 * Handle LinkedIn OAuth callback - returns token and organizations for selection
 */
router.post(
  '/oauth/linkedin/callback',
  requireEditor,
  validate(oauthCallbackSchema),
  async (req, res, next) => {
    try {
      const { code } = req.body as { code: string };
      const userId = req.user!.id;

      const result = await socialAccountService.handleLinkedInCallback(code, userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/social-accounts/oauth/linkedin/complete
 * Complete LinkedIn connection with selected organization or personal profile
 */
router.post(
  '/oauth/linkedin/complete',
  requireEditor,
  validate(linkedInCompleteSchema),
  async (req, res, next) => {
    try {
      const {
        accessToken,
        expiresIn,
        organizationUrn,
        organizationName,
        organizationLogoUrl,
        personalProfileId,
        personalProfileName,
        personalProfilePicture,
      } = req.body;
      const userId = req.user!.id;

      const account = await socialAccountService.completeLinkedInConnection(
        accessToken,
        expiresIn,
        userId,
        organizationUrn,
        organizationName,
        organizationLogoUrl || undefined,
        personalProfileId,
        personalProfileName,
        personalProfilePicture
      );
      res.status(201).json(account);
    } catch (error) {
      next(error);
    }
  }
);

// ============================================
// TOKEN REFRESH
// ============================================

/**
 * POST /api/social-accounts/:accountId/refresh
 * Refresh token for a social account
 */
router.post('/:accountId/refresh', requireAdmin, async (req, res, next) => {
  try {
    const { accountId } = req.params;

    // Get account to check platform
    const account = await socialAccountService.getSocialAccountById(accountId);

    if (account.platform !== 'INSTAGRAM') {
      throw new AppError('INVALID_PLATFORM', 'Token refresh is only supported for Instagram', 400);
    }

    await socialAccountService.refreshInstagramToken(accountId);

    res.json({ message: 'Token refreshed successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
