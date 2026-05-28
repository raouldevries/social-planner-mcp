/**
 * MCP Cleanup Job
 *
 * BullMQ job for cleaning up expired MCP data.
 * Runs hourly to:
 * - Mark expired pending actions
 * - Delete old audit logs
 * - Remove expired/revoked sessions
 *
 * Note: This job requires the API services to be available.
 * The cleanup functions are imported from the API package.
 */

import type { Job } from 'bullmq';

// Job name constant for queue registration
export const MCP_CLEANUP_JOB = 'mcp:cleanup';

// Cron pattern for hourly execution
export const MCP_CLEANUP_CRON = '0 * * * *'; // Every hour at minute 0

/**
 * Process MCP cleanup job
 *
 * This is a placeholder that will be implemented when the worker
 * infrastructure is built out. The actual cleanup functions are
 * in apps/api/src/services/mcp-cleanup.service.ts
 */
export async function processMCPCleanup(_job: Job): Promise<void> {
  // TODO: Import and call cleanup functions when worker infrastructure is ready
  // import { runAllCleanupTasks } from '@social-planner/api/services/mcp-cleanup.service';
  // await runAllCleanupTasks();

  console.log('MCP cleanup job executed - implementation pending worker setup');
}

/**
 * Job options for scheduling
 */
export const mcpCleanupJobOptions = {
  repeat: {
    pattern: MCP_CLEANUP_CRON,
  },
  removeOnComplete: 100, // Keep last 100 completed jobs
  removeOnFail: 50, // Keep last 50 failed jobs
};
