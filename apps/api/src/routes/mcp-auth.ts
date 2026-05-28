/**
 * Social Planner - MCP OAuth Routes
 *
 * OAuth 2.0 endpoints for MCP client registration and authentication.
 */

import { Router } from 'express';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import {
  registerMCPClientSchema,
  mcpAuthorizationSchema,
  mcpTokenRequestSchema,
  mcpRevokeTokenSchema,
} from '@social-planner/shared';
import * as mcpAuthService from '../services/mcp-auth.service';

const router = Router();

/**
 * Register a new MCP client (requires authenticated user)
 * POST /api/mcp/clients
 */
router.post('/clients', requireAuth, validate(registerMCPClientSchema), async (req, res, next) => {
  try {
    const result = await mcpAuthService.registerClient(
      req.user!.id,
      req.body.name,
      req.body.redirectUris,
      req.body.scopes
    );

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * List user's MCP clients
 * GET /api/mcp/clients
 */
router.get('/clients', requireAuth, async (req, res, next) => {
  try {
    const clients = await mcpAuthService.listUserClients(req.user!.id);
    res.json({ clients });
  } catch (error) {
    next(error);
  }
});

/**
 * Revoke an MCP client
 * DELETE /api/mcp/clients/:clientId
 */
router.delete('/clients/:clientId', requireAuth, async (req, res, next) => {
  try {
    await mcpAuthService.revokeClient(req.params.clientId, req.user!.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * Delete an MCP client permanently
 * DELETE /api/mcp/clients/:clientId/permanent
 */
router.delete('/clients/:clientId/permanent', requireAuth, async (req, res, next) => {
  try {
    await mcpAuthService.deleteClient(req.params.clientId, req.user!.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * OAuth authorization endpoint
 * GET /api/mcp/oauth/authorize
 *
 * For API-first approach, generates code directly if user is authenticated.
 * In a full implementation, this would render a consent page.
 */
router.get(
  '/oauth/authorize',
  requireAuth,
  validate(mcpAuthorizationSchema, 'query'),
  async (req, res, next) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { clientId, redirectUri, scope, state } = req.query as any;

      // Generate authorization code
      const code = await mcpAuthService.generateAuthorizationCode(
        clientId,
        req.user!.id,
        scope,
        redirectUri
      );

      // Redirect back to client with code
      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set('code', code);
      if (state) redirectUrl.searchParams.set('state', state);

      res.redirect(redirectUrl.toString());
    } catch (error) {
      next(error);
    }
  }
);

/**
 * OAuth token endpoint
 * POST /api/mcp/oauth/token
 */
router.post('/oauth/token', async (req, res, next) => {
  try {
    const body = mcpTokenRequestSchema.parse(req.body);

    let tokens;
    if (body.grantType === 'authorization_code') {
      tokens = await mcpAuthService.exchangeCodeForTokens(
        body.code,
        body.clientId,
        body.clientSecret,
        body.redirectUri
      );
    } else if (body.grantType === 'refresh_token') {
      tokens = await mcpAuthService.refreshAccessToken(
        body.refreshToken,
        body.clientId,
        body.clientSecret
      );
    } else {
      // client_credentials grant
      tokens = await mcpAuthService.clientCredentialsGrant(
        body.clientId,
        body.clientSecret,
        body.scope
      );
    }

    // Return in OAuth 2.0 format (snake_case)
    res.json({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: tokens.tokenType,
      expires_in: tokens.expiresIn,
      scope: tokens.scope,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * OAuth token revocation endpoint
 * POST /api/mcp/oauth/revoke
 */
router.post('/oauth/revoke', validate(mcpRevokeTokenSchema), async (req, res, next) => {
  try {
    const { token, tokenTypeHint, clientId, clientSecret } = req.body;

    // Validate client credentials
    const validation = await mcpAuthService.validateClient(clientId, clientSecret);
    if (!validation) {
      res.status(401).json({ error: 'invalid_client' });
      return;
    }

    await mcpAuthService.revokeToken(token, tokenTypeHint);
    res.status(200).send();
  } catch (error) {
    next(error);
  }
});

export default router;
