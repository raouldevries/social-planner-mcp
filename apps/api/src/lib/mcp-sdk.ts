/**
 * MCP SDK Dynamic Loader
 *
 * This module provides dynamic loading of MCP SDK to handle environments
 * where the SDK's ESM subpath exports may not work (e.g., Docker CJS runtime).
 *
 * Usage:
 *   const { McpServer, StreamableHTTPServerTransport, isInitializeRequest } = await loadMcpSdk();
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

// Type definitions (these are type-only, so they don't cause runtime imports)
export interface McpServer {
  tool(
    name: string,
    description: string,
    schema: Record<string, any>,
    handler: (params: Record<string, unknown>) => Promise<any>
  ): void;
  connect(transport: any): Promise<void>;
}

export interface StreamableHTTPServerTransport {
  sessionId?: string;
  sessionIdGenerator?: () => string;
  onsessioninitialized?: (id: string) => void;
  onclose?: () => void;
  handleRequest(req: any, res: any, body?: any): Promise<void>;
}

export type MCPTool = {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
};

// SDK instance cache
let sdkCache: {
  McpServer: any;
  StreamableHTTPServerTransport: any;
  isInitializeRequest: (body: unknown) => boolean;
} | null = null;

/**
 * Dynamically load the MCP SDK.
 * This function must be called at runtime to load the SDK.
 * Throws if the SDK is not available.
 */
export async function loadMcpSdk(): Promise<{
  McpServer: any;
  StreamableHTTPServerTransport: any;
  isInitializeRequest: (body: unknown) => boolean;
}> {
  if (sdkCache) {
    return sdkCache;
  }

  // Use Function constructor to create true runtime dynamic imports
  // This bypasses TypeScript's compilation of import() to require()
  // which would fail at module load time for ESM-only SDK subpaths
  const dynamicImport = new Function('modulePath', 'return import(modulePath)') as (
    path: string
  ) => Promise<any>;

  const [mcpServerModule, streamableHttpModule, typesModule] = await Promise.all([
    dynamicImport('@modelcontextprotocol/sdk/server/mcp.js'),
    dynamicImport('@modelcontextprotocol/sdk/server/streamableHttp.js'),
    dynamicImport('@modelcontextprotocol/sdk/types.js'),
  ]);

  sdkCache = {
    McpServer: mcpServerModule.McpServer,
    StreamableHTTPServerTransport: streamableHttpModule.StreamableHTTPServerTransport,
    isInitializeRequest: typesModule.isInitializeRequest,
  };

  return sdkCache;
}

/* eslint-enable @typescript-eslint/no-explicit-any */
