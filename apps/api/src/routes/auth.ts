/**
 * Social Planner - Auth Routes
 *
 * Authentication endpoints for registration, login, logout, and password management.
 * Single workspace architecture - all users belong to Acme workspace.
 */

import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import { authRateLimiter } from '../middleware/rateLimiter';
import {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  updatePasswordSchema,
} from '@social-planner/shared';
import * as authService from '../services/auth.service';
import { config } from '../config';

const router = Router();

// Apply rate limiting to auth routes (disabled in development)
if (config.NODE_ENV !== 'development') {
  router.use(authRateLimiter);
}

/**
 * POST /api/auth/register
 * DISABLED: Registration is now invite-only.
 * Users must be invited by an admin and use the /api/invitations/:token/accept endpoint.
 */
router.post('/register', (_req, res) => {
  res.status(403).json({
    code: 'REGISTRATION_DISABLED',
    message: 'Registration is invite-only. Please contact an administrator to request access.',
  });
});

/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const userAgent = req.get('User-Agent');
    const ipAddress = req.ip;

    const result = await authService.loginUser(email, password, userAgent, ipAddress);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Exchange refresh token for new access token
 */
router.post('/refresh', validate(refreshTokenSchema), async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshTokens(refreshToken);

    res.json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout
 * Invalidate current session
 */
router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const refreshToken = req.body.refreshToken;
    await authService.logoutUser(req.user!.id, refreshToken);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/logout-all
 * Invalidate all sessions for current user
 */
router.post('/logout-all', requireAuth, async (req, res, next) => {
  try {
    await authService.logoutAllSessions(req.user!.id);

    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', requireAuth, async (req, res, next) => {
  try {
    const user = await authService.getUserById(req.user!.id);

    if (!user) {
      return res.status(404).json({
        code: 'USER_NOT_FOUND',
        message: 'User not found',
      });
    }

    res.json(user);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/forgot-password
 * Initiate password reset flow
 */
const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

router.post('/forgot-password', validate(forgotPasswordSchema), async (req, res, next) => {
  try {
    await authService.initiatePasswordReset(req.body.email);

    // Always return success to prevent email enumeration
    res.json({
      message: 'If an account exists with this email, a reset link has been sent',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/reset-password
 * Complete password reset with token
 */
const resetPasswordSchema = z.object({
  token: z.string(),
  password: registerSchema.shape.password,
});

router.post('/reset-password', validate(resetPasswordSchema), async (req, res, next) => {
  try {
    const { token, password } = req.body;
    await authService.resetPassword(token, password);

    res.json({ message: 'Password has been reset successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/update-password
 * Update password for logged-in user
 */
router.post(
  '/update-password',
  requireAuth,
  validate(updatePasswordSchema),
  async (req, res, next) => {
    try {
      const { currentPassword, newPassword } = req.body;
      await authService.updatePassword(req.user!.id, currentPassword, newPassword);

      res.json({ message: 'Password has been updated successfully' });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/auth/verify-email
 * Verify email address with token
 */
const verifyEmailSchema = z.object({
  token: z.string(),
});

router.post('/verify-email', validate(verifyEmailSchema), async (req, res, next) => {
  try {
    await authService.verifyEmail(req.body.token);

    res.json({ message: 'Email has been verified successfully' });
  } catch (error) {
    next(error);
  }
});

// ============================================
// OAuth Routes
// ============================================

// OAuth response types
interface GoogleTokenResponse {
  access_token?: string;
  error?: string;
}

interface GoogleUserResponse {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

interface MicrosoftTokenResponse {
  access_token?: string;
  error?: string;
}

interface MicrosoftUserResponse {
  id: string;
  mail?: string;
  userPrincipalName: string;
  displayName: string;
}

/**
 * GET /api/auth/google
 * Redirect to Google OAuth
 */
router.get('/google', (_req, res) => {
  if (!config.GOOGLE_CLIENT_ID) {
    return res.status(501).json({
      code: 'NOT_CONFIGURED',
      message: 'Google OAuth is not configured',
    });
  }

  const params = new URLSearchParams({
    client_id: config.GOOGLE_CLIENT_ID,
    redirect_uri: config.GOOGLE_REDIRECT_URI || '',
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'consent',
  });

  res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
});

/**
 * GET /api/auth/google/callback
 * Handle Google OAuth callback
 */
router.get('/google/callback', async (req, res, next) => {
  try {
    const { code, error } = req.query;

    if (error || !code) {
      return res.redirect(`${config.FRONTEND_URL}/auth/error?message=OAuth cancelled`);
    }

    if (!config.GOOGLE_CLIENT_ID || !config.GOOGLE_CLIENT_SECRET) {
      return res.redirect(`${config.FRONTEND_URL}/auth/error?message=OAuth not configured`);
    }

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: config.GOOGLE_CLIENT_ID,
        client_secret: config.GOOGLE_CLIENT_SECRET,
        code: code as string,
        grant_type: 'authorization_code',
        redirect_uri: config.GOOGLE_REDIRECT_URI || '',
      }),
    });

    const tokens = (await tokenResponse.json()) as GoogleTokenResponse;

    if (!tokens.access_token) {
      return res.redirect(`${config.FRONTEND_URL}/auth/error?message=Failed to get access token`);
    }

    // Get user info
    const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const googleUser = (await userResponse.json()) as GoogleUserResponse;

    // Create or update user
    const result = await authService.findOrCreateOAuthUser(
      'GOOGLE',
      googleUser.id,
      googleUser.email,
      googleUser.name,
      googleUser.picture
    );

    // Redirect to frontend with tokens
    const params = new URLSearchParams({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

    res.redirect(`${config.FRONTEND_URL}/auth/callback?${params}`);
  } catch (error) {
    // Handle invite-only rejection
    if (error instanceof Error && 'code' in error && error.code === 'NO_INVITATION') {
      return res.redirect(
        `${config.FRONTEND_URL}/auth/error?error=no_invitation&message=${encodeURIComponent(
          'Registration is invite-only. Please contact an administrator to request access.'
        )}`
      );
    }
    next(error);
  }
});

/**
 * GET /api/auth/microsoft
 * Redirect to Microsoft OAuth
 */
router.get('/microsoft', (_req, res) => {
  if (!config.MICROSOFT_CLIENT_ID) {
    return res.status(501).json({
      code: 'NOT_CONFIGURED',
      message: 'Microsoft OAuth is not configured',
    });
  }

  const params = new URLSearchParams({
    client_id: config.MICROSOFT_CLIENT_ID,
    redirect_uri: config.MICROSOFT_REDIRECT_URI || '',
    response_type: 'code',
    scope: 'openid email profile User.Read',
    response_mode: 'query',
  });

  res.redirect(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`);
});

/**
 * GET /api/auth/microsoft/callback
 * Handle Microsoft OAuth callback
 */
router.get('/microsoft/callback', async (req, res, next) => {
  try {
    const { code, error } = req.query;

    if (error || !code) {
      return res.redirect(`${config.FRONTEND_URL}/auth/error?message=OAuth cancelled`);
    }

    if (!config.MICROSOFT_CLIENT_ID || !config.MICROSOFT_CLIENT_SECRET) {
      return res.redirect(`${config.FRONTEND_URL}/auth/error?message=OAuth not configured`);
    }

    // Exchange code for tokens
    const tokenResponse = await fetch(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: config.MICROSOFT_CLIENT_ID,
          client_secret: config.MICROSOFT_CLIENT_SECRET,
          code: code as string,
          grant_type: 'authorization_code',
          redirect_uri: config.MICROSOFT_REDIRECT_URI || '',
          scope: 'openid email profile User.Read',
        }),
      }
    );

    const tokens = (await tokenResponse.json()) as MicrosoftTokenResponse;

    if (!tokens.access_token) {
      return res.redirect(`${config.FRONTEND_URL}/auth/error?message=Failed to get access token`);
    }

    // Get user info from Microsoft Graph
    const userResponse = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });

    const msUser = (await userResponse.json()) as MicrosoftUserResponse;

    // Create or update user
    const result = await authService.findOrCreateOAuthUser(
      'MICROSOFT',
      msUser.id,
      msUser.mail || msUser.userPrincipalName,
      msUser.displayName,
      undefined // Microsoft Graph doesn't return photo in this endpoint
    );

    // Redirect to frontend with tokens
    const params = new URLSearchParams({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
    });

    res.redirect(`${config.FRONTEND_URL}/auth/callback?${params}`);
  } catch (error) {
    // Handle invite-only rejection
    if (error instanceof Error && 'code' in error && error.code === 'NO_INVITATION') {
      return res.redirect(
        `${config.FRONTEND_URL}/auth/error?error=no_invitation&message=${encodeURIComponent(
          'Registration is invite-only. Please contact an administrator to request access.'
        )}`
      );
    }
    next(error);
  }
});

export default router;
