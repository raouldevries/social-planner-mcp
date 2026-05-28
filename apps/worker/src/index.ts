/**
 * Worker Entry Point
 *
 * BullMQ worker for processing background jobs.
 * Currently a placeholder - to be fully implemented when needed.
 *
 * Available jobs:
 * - MCP Cleanup (mcp:cleanup) - Cleans expired MCP data hourly
 */

// Job imports (for reference when implementing)
// import { MCP_CLEANUP_JOB, processMCPCleanup, mcpCleanupJobOptions } from './jobs/mcp-cleanup.job';

console.log('Worker entry point - implementation pending');

// TODO: Implement when BullMQ infrastructure is needed
// Example setup:
//
// import { Queue, Worker } from 'bullmq';
// import Redis from 'ioredis';
//
// const redisConnection = new Redis(process.env.REDIS_URL);
//
// // Create MCP queue
// const mcpQueue = new Queue('mcp', { connection: redisConnection });
//
// // Schedule MCP cleanup job
// await mcpQueue.add(MCP_CLEANUP_JOB, {}, mcpCleanupJobOptions);
//
// // Create worker
// const mcpWorker = new Worker('mcp', async (job) => {
//   if (job.name === MCP_CLEANUP_JOB) {
//     await processMCPCleanup(job);
//   }
// }, { connection: redisConnection });
//
// mcpWorker.on('completed', (job) => console.log(`Job ${job.id} completed`));
// mcpWorker.on('failed', (job, err) => console.error(`Job ${job?.id} failed:`, err));
