/**
 * Social Planner - Rate Limiter Middleware
 *
 * Redis-based rate limiting.
 */

import { Request, Response, NextFunction } from 'express';
import { redis } from '../lib/redis';

interface RateLimitConfig {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
}

export function rateLimiter(rateLimitConfig: RateLimitConfig) {
  const { windowMs, max, keyGenerator } = rateLimitConfig;

  return async (req: Request, res: Response, next: NextFunction) => {
    const key = keyGenerator
      ? keyGenerator(req)
      : `ratelimit:${req.ip}:${req.path}`;

    try {
      const current = await redis.incr(key);

      if (current === 1) {
        await redis.pexpire(key, windowMs);
      }

      const ttl = await redis.pttl(key);

      res.setHeader('X-RateLimit-Limit', max);
      res.setHeader('X-RateLimit-Remaining', Math.max(0, max - current));
      res.setHeader('X-RateLimit-Reset', Date.now() + ttl);

      if (current > max) {
        return res.status(429).json({
          code: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many requests, please try again later',
          retryAfter: Math.ceil(ttl / 1000),
        });
      }

      next();
    } catch {
      // If Redis fails, allow request to proceed
      next();
    }
  };
}

// Preset rate limiters (increased for development)
export const globalRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 1000, // Increased from 100 for development
});

export const authRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Increased from 10 for development
  keyGenerator: (req) => `ratelimit:auth:${req.ip}`,
});

export const writeRateLimiter = rateLimiter({
  windowMs: 60 * 1000, // 1 minute
  max: 300, // Increased from 30 for development
  keyGenerator: (req) => `ratelimit:write:${req.user?.id || req.ip}`,
});
