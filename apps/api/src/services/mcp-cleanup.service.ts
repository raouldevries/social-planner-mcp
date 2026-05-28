/**
 * MCP Cleanup Service
 *
 * Provides cleanup functions for expired MCP data:
 * - Expired pending actions
 * - Old audit logs (beyond retention period)
 * - Revoked/expired sessions
 *
 * These functions should be called by a scheduled job (e.g., BullMQ worker)
 * or can be triggered manually via admin endpoint.
 */

import { prisma } from '../lib/prisma';
import { config } from '../config';
import { logger } from '../lib/logger';

/**
 * Clean up expired pending actions
 * Marks PENDING actions past their expiresAt as EXPIRED
 * Should run hourly via scheduled job
 */
export async function cleanupExpiredPendingActions(): Promise<number> {
  const result = await prisma.mCPPendingAction.updateMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: new Date() },
    },
    data: {
      status: 'EXPIRED',
      resolvedAt: new Date(),
    },
  });

  if (result.count > 0) {
    logger.info(`Marked ${result.count} expired MCP pending actions`);
  }

  return result.count;
}

/**
 * Clean up old audit logs beyond retention period
 * Permanently deletes audit logs older than configured retention days
 * Should run daily via scheduled job
 */
export async function cleanupOldAuditLogs(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - config.MCP_AUDIT_RETENTION_DAYS);

  const result = await prisma.mCPAuditLog.deleteMany({
    where: {
      createdAt: { lt: cutoff },
    },
  });

  if (result.count > 0) {
    logger.info(
      `Deleted ${result.count} old MCP audit logs (retention: ${config.MCP_AUDIT_RETENTION_DAYS} days)`
    );
  }

  return result.count;
}

/**
 * Clean up revoked or expired sessions
 * Permanently deletes sessions that are either:
 * - Explicitly revoked (revokedAt is set)
 * - Past their refresh token expiration
 * Should run daily via scheduled job
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.mCPSession.deleteMany({
    where: {
      OR: [{ revokedAt: { not: null } }, { refreshExpiresAt: { lt: new Date() } }],
    },
  });

  if (result.count > 0) {
    logger.info(`Deleted ${result.count} expired/revoked MCP sessions`);
  }

  return result.count;
}

/**
 * Run all cleanup tasks
 * Convenience function for scheduled jobs
 */
export async function runAllCleanupTasks(): Promise<{
  expiredActions: number;
  deletedAuditLogs: number;
  deletedSessions: number;
}> {
  const [expiredActions, deletedAuditLogs, deletedSessions] = await Promise.all([
    cleanupExpiredPendingActions(),
    cleanupOldAuditLogs(),
    cleanupExpiredSessions(),
  ]);

  logger.info('MCP cleanup complete', {
    expiredActions,
    deletedAuditLogs,
    deletedSessions,
  });

  return {
    expiredActions,
    deletedAuditLogs,
    deletedSessions,
  };
}
