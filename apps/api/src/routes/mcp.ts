/**
 * Social Planner - MCP Server Route
 *
 * HTTP transport endpoint for Model Context Protocol.
 * Handles tool requests from Claude Desktop and other MCP clients.
 */

import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { loadMcpSdk } from '../lib/mcp-sdk.js';

import { requireMCPAuth } from '../middleware/mcp-auth.js';
import { MCP_TOOLS, getHandler, type ToolContext } from '../services/mcp-tools.service.js';
import { logToolInvocation } from '../services/mcp-audit.service.js';

const router = Router();

// Session storage (in production, use Redis for multi-instance support)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const transports: Record<string, any> = {};
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const serversBySession: Record<string, any> = {};

// SDK loaded state
let sdk: Awaited<ReturnType<typeof loadMcpSdk>> | null = null;

/**
 * Load MCP SDK on first use (lazy initialization)
 */
async function getSdk(): Promise<Awaited<ReturnType<typeof loadMcpSdk>>> {
  if (!sdk) {
    sdk = await loadMcpSdk();
  }
  return sdk;
}

/**
 * Create MCP server instance with tools configured for the authenticated user
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createMcpServer(mcpContext: NonNullable<Request['mcpContext']>): Promise<any> {
  const { McpServer } = await getSdk();

  const server = new McpServer({
    name: 'social-planner-mcp',
    version: '1.0.0',
  });

  // Build tool context from MCP auth context
  const toolContext: ToolContext = {
    userId: mcpContext.userId,
    userRole: mcpContext.user.role as 'ADMIN' | 'EDITOR' | 'VIEWER',
    clientId: mcpContext.clientId,
  };

  // Register all tools
  for (const [toolName, toolDef] of Object.entries(MCP_TOOLS)) {
    // Check if user has required scopes
    const hasRequiredScopes = toolDef.requiredScopes.every((scope) =>
      mcpContext.scopes.includes(scope)
    );

    if (!hasRequiredScopes) {
      // Skip tools user doesn't have access to
      continue;
    }

    server.tool(
      toolName,
      toolDef.description,
      toolDef.inputSchema.shape,
      async (params: Record<string, unknown>) => {
        const startTime = Date.now();
        const handler = getHandler(toolName);

        if (!handler) {
          throw new Error(`No handler for tool: ${toolName}`);
        }

        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const result = await handler(params as any, toolContext);

          const durationMs = Date.now() - startTime;

          // Audit log
          await logToolInvocation({
            clientId: toolContext.clientId,
            userId: toolContext.userId,
            tool: toolName,
            action: result.success ? 'success' : 'error',
            inputParams: params,
            result: (result.data ?? {}) as Record<string, unknown>,
            success: result.success,
            ...(result.error?.code && { errorCode: result.error.code }),
            durationMs,
          });

          if (!result.success) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: JSON.stringify({
                    error: result.error,
                  }),
                },
              ],
              isError: true,
            };
          }

          return {
            content: [
              {
                type: 'text' as const,
                text: JSON.stringify(result.data),
              },
            ],
          };
        } catch (error) {
          const durationMs = Date.now() - startTime;

          await logToolInvocation({
            clientId: toolContext.clientId,
            userId: toolContext.userId,
            tool: toolName,
            action: 'exception',
            inputParams: params as Record<string, unknown>,
            result: {},
            success: false,
            errorCode: 'INTERNAL_ERROR',
            durationMs,
          });

          throw error;
        }
      }
    );
  }

  return server;
}

/**
 * MCP endpoint - handles all MCP protocol messages
 */
router.post('/mcp', requireMCPAuth, async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Log for debugging
    console.log('[MCP] Processing request, method:', req.body?.method);

    const { StreamableHTTPServerTransport, isInitializeRequest } = await getSdk();
    console.log('[MCP] SDK loaded successfully');

    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let transport: any;

    if (sessionId && transports[sessionId]) {
      // Reuse existing session
      transport = transports[sessionId];
    } else if (isInitializeRequest(req.body)) {
      console.log('[MCP] Initialize request detected');

      // New session initialization (or re-initialization if old session was lost)
      // This handles both: no sessionId + initialize, or invalid sessionId + initialize
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        onsessioninitialized: (id: string) => {
          console.log('[MCP] Session initialized:', id);
          transports[id] = transport;
        },
      });
      console.log('[MCP] Transport created');

      transport.onclose = () => {
        if (transport.sessionId) {
          delete transports[transport.sessionId];
          delete serversBySession[transport.sessionId];
        }
      };

      // Create MCP server for this session
      console.log('[MCP] Creating MCP server...');
      const server = await createMcpServer(req.mcpContext!);
      console.log('[MCP] MCP server created, connecting...');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await server.connect(transport as any);
      console.log('[MCP] Server connected to transport');

      // Store server reference
      if (transport.sessionId) {
        serversBySession[transport.sessionId] = server;
      }
    } else {
      // Non-initialize request without valid session - client needs to re-initialize
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Invalid session' },
        id: req.body?.id ?? null,
      });
      return;
    }

    console.log('[MCP] Handling request...');
    await transport.handleRequest(req, res, req.body);
    console.log('[MCP] Request handled');
  } catch (error) {
    console.error('[MCP] Error:', error instanceof Error ? error.message : error);
    console.error('[MCP] Stack:', error instanceof Error ? error.stack : 'No stack');
    next(error);
  }
});

/**
 * MCP GET endpoint for SSE streaming (optional)
 */
router.get('/mcp', requireMCPAuth, async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  const transport = transports[sessionId];

  if (transport) {
    await transport.handleRequest(req, res);
  } else {
    res.status(400).send('Invalid session');
  }
});

/**
 * MCP DELETE endpoint for session cleanup
 */
router.delete('/mcp', requireMCPAuth, async (req: Request, res: Response) => {
  const sessionId = req.headers['mcp-session-id'] as string;
  const transport = transports[sessionId];

  if (transport) {
    await transport.handleRequest(req, res);
  } else {
    res.status(400).send('Invalid session');
  }
});

export default router;
