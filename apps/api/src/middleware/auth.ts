/**
 * Social Planner - Authentication Middleware
 *
 * JWT-based authentication for the API.
 * Single workspace architecture - role is stored directly on User.
 */

import { Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { prisma } from '../lib/prisma';
import { UserRole } from '@social-planner/shared';

// Extend Express Request type
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface User {
      id: string;
      email: string;
      fullName: string;
      avatarUrl: string | null;
      timezone: string;
      role: UserRole;
      isDemo: boolean;
    }
  }
}

// JWT Strategy
passport.use(
  'jwt',
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: config.JWT_ACCESS_SECRET,
      issuer: 'social-planner-mcp',
      audience: 'planner-api',
    },
    async (payload, done) => {
      try {
        const user = await prisma.user.findUnique({
          where: { id: payload.sub },
          select: {
            id: true,
            email: true,
            fullName: true,
            avatarUrl: true,
            timezone: true,
            role: true,
            isDemo: true,
          },
        });

        if (!user) {
          return done(null, false);
        }

        return done(null, user as Express.User);
      } catch (error) {
        return done(error, false);
      }
    }
  )
);

// HTTP methods that never mutate state — always allowed, even for demo users.
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

// Write endpoints a demo user is still allowed to call (so they can sign out).
const DEMO_WRITE_ALLOWLIST = new Set(['/api/auth/logout', '/api/auth/logout-all']);

/**
 * Read-only demo guard.
 *
 * Demo accounts (User.isDemo) get read-only access. This rejects every
 * state-changing request from a demo user, regardless of role or which route it
 * targets. It is a single choke point: because it is folded into requireAuth
 * (below), a forgotten per-route write guard can never accidentally expose a
 * mutation to the public demo account.
 *
 * Runs after authentication, so req.user is populated.
 */
export const blockDemoWrites = (req: Request, res: Response, next: NextFunction): void => {
  if (req.user?.isDemo && !SAFE_METHODS.has(req.method)) {
    const path = req.originalUrl.split('?')[0];
    if (!DEMO_WRITE_ALLOWLIST.has(path)) {
      res.status(403).json({
        code: 'DEMO_READ_ONLY',
        message: 'This is a read-only demo account. Sign up for your own account to make changes.',
      });
      return;
    }
  }
  next();
};

// Authentication middleware.
// Authenticates the JWT, then enforces the read-only demo guard. Since every
// protected route uses requireAuth, the demo guard automatically covers them all.
const authenticateJwt = passport.authenticate('jwt', { session: false });

export const requireAuth = (req: Request, res: Response, next: NextFunction): void => {
  authenticateJwt(req, res, (err?: unknown) => {
    if (err) return next(err);
    blockDemoWrites(req, res, next);
  });
};

// Role-based access control middleware
// Single workspace: uses user.role directly instead of membership
export const requireRole = (...roles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      });
    }

    if (!roles.includes(req.user.role as UserRole)) {
      return res.status(403).json({
        code: 'INSUFFICIENT_PERMISSIONS',
        message: `This action requires one of the following roles: ${roles.join(', ')}`,
      });
    }

    next();
  };
};

// Admin-only middleware shortcut
export const requireAdmin = requireRole('ADMIN');

// Editor or Admin middleware shortcut
export const requireEditor = requireRole('ADMIN', 'EDITOR');

// Token generation utilities
export function generateAccessToken(userId: string): string {
  return jwt.sign({ sub: userId }, config.JWT_ACCESS_SECRET, {
    expiresIn: config.JWT_ACCESS_EXPIRES_IN as string,
    issuer: 'social-planner-mcp',
    audience: 'planner-api',
  } as jwt.SignOptions);
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign({ sub: userId, type: 'refresh' }, config.JWT_REFRESH_SECRET, {
    expiresIn: config.JWT_REFRESH_EXPIRES_IN as string,
    issuer: 'social-planner-mcp',
  } as jwt.SignOptions);
}

export function verifyRefreshToken(token: string): { sub: string } | null {
  try {
    return jwt.verify(token, config.JWT_REFRESH_SECRET, {
      issuer: 'social-planner-mcp',
    }) as { sub: string };
  } catch {
    return null;
  }
}
