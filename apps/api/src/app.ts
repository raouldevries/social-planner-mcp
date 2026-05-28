/**
 * Social Planner - Express Application
 *
 * Main Express app configuration with middleware and routes.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import passport from 'passport';
import pinoHttp from 'pino-http';
import { config } from './config';
import { logger } from './lib/logger';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';
import { globalRateLimiter } from './middleware/rateLimiter';

// Import routes (except MCP which uses dynamic import due to SDK compatibility)
import {
  healthRoutes,
  authRoutes,
  postRoutes,
  articleRoutes,
  socialAccountRoutes,
  channelRoutes,
  activityRoutes,
  notificationRoutes,
  schedulerRoutes,
  mediaRoutes,
  userRoutes,
  commentRoutes,
  dashboardRoutes,
  shareLinkRoutes,
  versionRoutes,
  ambassadorRoutes,
  analyticsRoutes,
  analyticsSyncRoutes,
  calendarEventRoutes,
  feedbackRoutes,
  invitationRoutes,
} from './routes';

// MCP routes are loaded dynamically to handle SDK compatibility issues
// See setupMCPRoutes() function below

// Import auth middleware to initialize passport strategy
import './middleware/auth';

const app = express();

// Trust proxy (for rate limiting behind load balancer)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS
app.use(
  cors({
    origin: config.FRONTEND_URL,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'mcp-session-id'],
    exposedHeaders: ['mcp-session-id'],
  })
);

// Compression
app.use(compression());

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use(pinoHttp({ logger }));

// Passport initialization
app.use(passport.initialize());

// Rate limiting (disabled in development)
if (config.NODE_ENV !== 'development') {
  app.use(globalRateLimiter);
}

// Routes without router-level auth (or with per-route auth) - registered early
// These must come BEFORE routes with router.use(requireAuth) to avoid auth conflicts
app.use('/health', healthRoutes);
app.use('/api/auth', authRoutes);

// MCP routes placeholder - actual routes registered by setupMCPRoutes()
// IMPORTANT: MCP routes must be registered BEFORE routes with router.use(requireAuth)
// because those routers catch all /api/* requests and require JWT auth

/**
 * Register remaining routes after MCP routes are set up.
 * This ensures MCP OAuth endpoints (which don't require auth) aren't
 * caught by routers with router.use(requireAuth).
 */
export function registerRemainingRoutes(): void {
  // IMPORTANT: Routes with public endpoints must be registered BEFORE routes with
  // router.use(requireAuth), because router-level middleware runs before route matching.

  // Invitation routes have public endpoints (validate, accept) and admin endpoints
  app.use('/api/invitations', invitationRoutes);

  // shareLinkRoutes has public /share/:token/* endpoints that must not require auth.
  app.use('/api', shareLinkRoutes);

  // Routes with router.use(requireAuth) - these catch all subroutes
  app.use('/api/posts', postRoutes);
  app.use('/api/articles', articleRoutes);
  app.use('/api/social-accounts', socialAccountRoutes);
  app.use('/api', channelRoutes);
  app.use('/api/activity', activityRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/scheduler', schedulerRoutes);
  app.use('/api/media', mediaRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api', commentRoutes);
  app.use('/api/dashboard', dashboardRoutes);
  app.use('/api', versionRoutes);
  app.use('/api', ambassadorRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/analytics-sync', analyticsSyncRoutes);
  app.use('/api/calendar-events', calendarEventRoutes);
  app.use('/api/feedback', feedbackRoutes);

  logger.info('Remaining routes registered');
}

// NOTE: Error handlers are registered AFTER MCP routes in server.ts
// This ensures MCP routes are matched before the 404 handler

/**
 * Helper to extract the default export from a dynamically imported module.
 * Handles both ESM default exports and CJS module.exports interop.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getDefaultExport(module: any): any {
  // Handle nested default (CJS interop: { default: { default: router } })
  if (module.default?.default) {
    return module.default.default;
  }
  // Standard ESM default export
  if (module.default) {
    return module.default;
  }
  // Direct export (rare)
  return module;
}

/**
 * Setup MCP routes with dynamic import to handle SDK compatibility issues.
 * This is called from server.ts after the app is initialized but before error handlers.
 */
export async function setupMCPRoutes(): Promise<void> {
  if (!config.MCP_ENABLED) {
    logger.info('MCP routes disabled (MCP_ENABLED=false)');
    return;
  }

  try {
    // Dynamic import to handle SDK compatibility
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [mcpAuthModule, mcpPendingModule, mcpModule] = await Promise.all<any>([
      import('./routes/mcp-auth.js'),
      import('./routes/mcp-pending-actions.js'),
      import('./routes/mcp.js'),
    ]);

    // Extract routers, handling CJS/ESM interop
    const mcpAuthRouter = getDefaultExport(mcpAuthModule);
    const mcpPendingRouter = getDefaultExport(mcpPendingModule);
    const mcpRouter = getDefaultExport(mcpModule);

    // Register MCP routes directly - error handlers are added AFTER this in server.ts
    app.use('/api/mcp', mcpAuthRouter);
    app.use('/api/mcp/pending-actions', mcpPendingRouter);
    app.use('/api', mcpRouter);

    logger.info('MCP routes registered successfully');
  } catch (error) {
    // MCP SDK not available - disable MCP feature gracefully
    logger.warn(
      { error: error instanceof Error ? error.message : String(error) },
      'MCP routes could not be loaded - MCP feature disabled. ' +
        'This is expected in production if the MCP SDK is not compatible.'
    );
  }
}

/**
 * Setup error handlers. Must be called AFTER all routes are registered.
 */
export function setupErrorHandlers(): void {
  app.use(notFoundHandler);
  app.use(errorHandler);
  logger.info('Error handlers registered');
}

export default app;
