/**
 * Social Planner - Route Index
 *
 * Exports all route modules.
 */

export { default as healthRoutes } from './health';
export { default as authRoutes } from './auth';
export { default as postRoutes } from './posts';
export { default as articleRoutes } from './articles';
export { default as socialAccountRoutes } from './social-accounts';
export { default as channelRoutes } from './channels';
export { default as activityRoutes } from './activity';
export { default as notificationRoutes } from './notifications';
export { default as schedulerRoutes } from './scheduler';
export { default as mediaRoutes } from './media';
export { default as userRoutes } from './users';
export { default as commentRoutes } from './comments';
export { default as dashboardRoutes } from './dashboard';
export { default as shareLinkRoutes } from './sharelinks';
export { default as versionRoutes } from './versions';
export { default as ambassadorRoutes } from './ambassador';
export { default as analyticsRoutes } from './analytics';
export { default as analyticsSyncRoutes } from './analytics-sync';
export { default as calendarEventRoutes } from './calendar-events';
export { default as feedbackRoutes } from './feedback';

// Invitation routes (invite-only registration)
export { default as invitationRoutes } from './invitations';

// MCP (Model Context Protocol) routes
export { default as mcpRoutes } from './mcp';
export { default as mcpAuthRoutes } from './mcp-auth';
export { default as mcpPendingActionsRoutes } from './mcp-pending-actions';
