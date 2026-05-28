/**
 * Social Planner - MCP Audit Service
 *
 * Provides audit logging for MCP tool invocations and cleanup functionality.
 */

import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma';
import type { MCPAuditLogEntry } from '@social-planner/shared';

interface AuditLogParams {
  clientId: string;
  userId: string;
  tool: string;
  action: string;
  inputParams: Record<string, unknown>;
  result: Record<string, unknown>;
  success: boolean;
  errorCode?: string;
  durationMs: number;
}

/**
 * Create an audit log entry for MCP tool invocation
 */
export async function logToolInvocation(params: AuditLogParams): Promise<void> {
  await prisma.mCPAuditLog.create({
    data: {
      clientId: params.clientId,
      userId: params.userId,
      tool: params.tool,
      action: params.action,
      inputParams: params.inputParams as Prisma.InputJsonValue,
      result: params.result as Prisma.InputJsonValue,
      success: params.success,
      errorCode: params.errorCode ?? null,
      durationMs: params.durationMs,
    },
  });
}

/**
 * Get audit logs for a user's MCP clients
 */
export async function getUserAuditLogs(
  userId: string,
  options: { limit?: number; offset?: number; tool?: string }
): Promise<{ logs: MCPAuditLogEntry[]; total: number }> {
  const { limit = 50, offset = 0, tool } = options;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { userId };
  if (tool) where.tool = tool;

  const [logs, total] = await Promise.all([
    prisma.mCPAuditLog.findMany({
      where,
      select: {
        id: true,
        tool: true,
        action: true,
        success: true,
        errorCode: true,
        durationMs: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.mCPAuditLog.count({ where }),
  ]);

  return {
    logs: logs.map(
      (l): MCPAuditLogEntry => ({
        id: l.id,
        tool: l.tool,
        action: l.action,
        success: l.success,
        ...(l.errorCode && { errorCode: l.errorCode }),
        durationMs: l.durationMs,
        createdAt: l.createdAt.toISOString(),
      })
    ),
    total,
  };
}

/**
 * Get detailed audit log entry
 */
export async function getAuditLogDetail(logId: string, userId: string) {
  const log = await prisma.mCPAuditLog.findFirst({
    where: { id: logId, userId },
    include: {
      client: {
        select: { id: true, name: true },
      },
    },
  });

  if (!log) return null;

  return {
    id: log.id,
    tool: log.tool,
    action: log.action,
    success: log.success,
    errorCode: log.errorCode ?? undefined,
    durationMs: log.durationMs,
    createdAt: log.createdAt.toISOString(),
    clientId: log.client.id,
    clientName: log.client.name,
    inputParams: log.inputParams as Record<string, unknown>,
    result: log.result as Record<string, unknown>,
  };
}

/**
 * Clean up old audit logs (run as scheduled job)
 */
export async function cleanupOldAuditLogs(retentionDays: number): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  const result = await prisma.mCPAuditLog.deleteMany({
    where: {
      createdAt: { lt: cutoff },
    },
  });

  return result.count;
}
