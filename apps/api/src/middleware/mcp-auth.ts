/**
 * Social Planner - MCP Authentication Middleware
 *
 * Express middleware for MCP (Model Context Protocol) authentication.
 * Validates MCP access tokens and enforces scope-based permissions.
 * Also supports Basic auth for simpler client configuration.
 */

import { Request, Response, NextFunction } from 'express';
import { validateAccessToken, validateClient } from '../services/mcp-auth.service';
import { AppError } from './errorHandler';
import type { MCPScope } from '@social-planner/shared';

/**
 * Parse Basic auth header and return credentials
 */
function parseBasicAuth(authHeader: string): { clientId: string; clientSecret: string } | null {
  if (!authHeader.startsWith('Basic ')) {
    return null;
  }

  try {
    const base64 = authHeader.slice(6);
    const decoded = Buffer.from(base64, 'base64').toString('utf-8');
    const colonIndex = decoded.indexOf(':');

    if (colonIndex === -1) {
      return null;
    }

    return {
      clientId: decoded.slice(0, colonIndex),
      clientSecret: decoded.slice(colonIndex + 1),
    };
  } catch {
    return null;
  }
}

/**
 * Authenticate using Basic auth credentials
 */
async function authenticateWithBasicAuth(
  clientId: string,
  clientSecret: string
): Promise<{
  clientId: string;
  clientName: string;
  userId: string;
  user: { id: string; email: string; fullName: string; role: string };
  scopes: MCPScope[];
} | null> {
  const validation = await validateClient(clientId, clientSecret);

  if (!validation) {
    return null;
  }

  const scopes = validation.client.scopes.map((s) => s.toLowerCase()) as MCPScope[];

  return {
    clientId: validation.client.id,
    clientName: validation.client.name,
    userId: validation.user.id,
    user: {
      id: validation.user.id,
      email: validation.user.email,
      fullName: validation.user.fullName,
      role: validation.user.role,
    },
    scopes,
  };
}

// Extend Express Request for MCP context
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      mcpContext?: {
        sessionId: string;
        clientId: string;
        clientName: string;
        userId: string;
        user: {
          id: string;
          email: string;
          fullName: string;
          role: string;
        };
        scopes: MCPScope[];
      };
    }
  }
}

/**
 * Middleware to require valid MCP authentication
 * Supports both Bearer tokens and Basic auth (client_id:client_secret)
 */
export function requireMCPAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next(new AppError('UNAUTHORIZED', 'Missing Authorization header', 401));
  }

  // Try Basic auth first (simpler setup for Claude Desktop)
  const basicCredentials = parseBasicAuth(authHeader);
  if (basicCredentials) {
    authenticateWithBasicAuth(basicCredentials.clientId, basicCredentials.clientSecret)
      .then((result) => {
        if (!result) {
          return next(new AppError('UNAUTHORIZED', 'Invalid client credentials', 401));
        }

        req.mcpContext = {
          sessionId: `basic-${result.clientId}`, // Synthetic session ID for Basic auth
          clientId: result.clientId,
          clientName: result.clientName,
          userId: result.userId,
          user: result.user,
          scopes: result.scopes,
        };

        next();
      })
      .catch(next);
    return;
  }

  // Fall back to Bearer token auth
  if (!authHeader.startsWith('Bearer ')) {
    return next(new AppError('UNAUTHORIZED', 'Invalid Authorization header format', 401));
  }

  const token = authHeader.slice(7);

  validateAccessToken(token)
    .then((result) => {
      if (!result) {
        return next(new AppError('UNAUTHORIZED', 'Invalid or expired access token', 401));
      }

      // Convert scopes to lowercase for API use
      const scopes = result.session.scopes.map((s) => s.toLowerCase()) as MCPScope[];

      req.mcpContext = {
        sessionId: result.session.id,
        clientId: result.client.id,
        clientName: result.client.name,
        userId: result.user.id,
        user: {
          id: result.user.id,
          email: result.user.email,
          fullName: result.user.fullName,
          role: result.user.role,
        },
        scopes,
      };

      next();
    })
    .catch(next);
}

/**
 * Middleware to require specific MCP scopes
 */
export function requireMCPScopes(...requiredScopes: MCPScope[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.mcpContext) {
      return next(new AppError('UNAUTHORIZED', 'MCP authentication required', 401));
    }

    const missingScopes = requiredScopes.filter((scope) => !req.mcpContext!.scopes.includes(scope));

    if (missingScopes.length > 0) {
      return next(
        new AppError(
          'INSUFFICIENT_SCOPE',
          `Missing required scopes: ${missingScopes.join(', ')}`,
          403
        )
      );
    }

    next();
  };
}

/**
 * Middleware to optionally authenticate MCP requests
 * Sets mcpContext if valid auth present, continues otherwise
 * Supports both Bearer tokens and Basic auth
 */
export function optionalMCPAuth(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return next();
  }

  // Try Basic auth first
  const basicCredentials = parseBasicAuth(authHeader);
  if (basicCredentials) {
    authenticateWithBasicAuth(basicCredentials.clientId, basicCredentials.clientSecret)
      .then((result) => {
        if (result) {
          req.mcpContext = {
            sessionId: `basic-${result.clientId}`,
            clientId: result.clientId,
            clientName: result.clientName,
            userId: result.userId,
            user: result.user,
            scopes: result.scopes,
          };
        }
        next();
      })
      .catch(next);
    return;
  }

  // Try Bearer token
  if (!authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.slice(7);

  validateAccessToken(token)
    .then((result) => {
      if (result) {
        const scopes = result.session.scopes.map((s) => s.toLowerCase()) as MCPScope[];

        req.mcpContext = {
          sessionId: result.session.id,
          clientId: result.client.id,
          clientName: result.client.name,
          userId: result.user.id,
          user: {
            id: result.user.id,
            email: result.user.email,
            fullName: result.user.fullName,
            role: result.user.role,
          },
          scopes,
        };
      }
      next();
    })
    .catch(next);
}
