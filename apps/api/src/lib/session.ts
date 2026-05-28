/**
 * Social Planner - Session Management
 *
 * Shared session storage utilities using Redis.
 * Used by auth.service.ts and invitation.service.ts.
 */

import { redis } from './redis';

export const SESSION_PREFIX = 'session:';

/**
 * Store session in Redis
 */
export async function storeSession(
  userId: string,
  refreshToken: string,
  userAgent?: string,
  ipAddress?: string
): Promise<void> {
  const sessionKey = `${SESSION_PREFIX}${userId}:${refreshToken}`;
  const sessionData = JSON.stringify({
    userId,
    userAgent,
    ipAddress,
    createdAt: new Date().toISOString(),
  });

  // Store session with 7-day expiry
  await redis.setex(sessionKey, 7 * 24 * 60 * 60, sessionData);
}

/**
 * Delete a specific session from Redis
 */
export async function deleteSession(userId: string, refreshToken: string): Promise<void> {
  const sessionKey = `${SESSION_PREFIX}${userId}:${refreshToken}`;
  await redis.del(sessionKey);
}

/**
 * Delete all sessions for a user
 */
export async function deleteAllUserSessions(userId: string): Promise<void> {
  const pattern = `${SESSION_PREFIX}${userId}:*`;
  const keys = await redis.keys(pattern);
  if (keys.length > 0) {
    await redis.del(...keys);
  }
}
