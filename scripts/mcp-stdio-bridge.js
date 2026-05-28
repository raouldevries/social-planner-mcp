#!/usr/bin/env node
/**
 * MCP Stdio-to-HTTP Bridge for Social Planner
 *
 * This script bridges Claude Desktop's stdio transport to
 * the Social Planner HTTP-based MCP server.
 */

const http = require('http');
const https = require('https');
const readline = require('readline');

// Helper to get the right http module based on URL protocol
function getHttpModule(url) {
  return url.startsWith('https') ? https : http;
}

const MCP_URL = process.env.MCP_URL || 'http://localhost:3000/api/mcp';
const CLIENT_ID = process.env.MCP_CLIENT_ID;
const CLIENT_SECRET = process.env.MCP_CLIENT_SECRET;
const TOKEN_URL = process.env.MCP_TOKEN_URL || 'http://localhost:3000/api/mcp/oauth/token';

let accessToken = null;
let sessionId = null;
let tokenExpiry = null;

// Check if token needs refresh (expired or expiring soon)
function tokenNeedsRefresh() {
  if (!accessToken || !tokenExpiry) return true;
  // Refresh if less than 5 minutes remaining
  return Date.now() > tokenExpiry - (5 * 60 * 1000);
}

// Get access token via client credentials grant
async function getAccessToken() {
  return new Promise((resolve, reject) => {
    const tokenUrl = new URL(TOKEN_URL);
    const httpModule = getHttpModule(TOKEN_URL);
    const postData = JSON.stringify({
      grantType: 'client_credentials',
      clientId: CLIENT_ID,
      clientSecret: CLIENT_SECRET,
      scope: 'read_posts create_posts schedule_posts read_channels read_analytics'
    });

    const options = {
      hostname: tokenUrl.hostname,
      port: tokenUrl.port || (TOKEN_URL.startsWith('https') ? 443 : 80),
      path: tokenUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = httpModule.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.accessToken || json.access_token) {
            const token = json.accessToken || json.access_token;
            const expiresIn = json.expiresIn || json.expires_in || 3600;
            tokenExpiry = Date.now() + (expiresIn * 1000);
            resolve(token);
          } else {
            reject(new Error(`Token response: ${data}`));
          }
        } catch (e) {
          reject(new Error(`Failed to parse token response: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Send request to MCP server
async function sendToMCP(message) {
  const messageId = message.id || null;

  return new Promise((resolve, reject) => {
    const mcpUrl = new URL(MCP_URL);
    const httpModule = getHttpModule(MCP_URL);
    const postData = JSON.stringify(message);

    const headers = {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Accept': 'application/json, text/event-stream'
    };

    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }
    if (sessionId) {
      headers['mcp-session-id'] = sessionId;
    }

    const options = {
      hostname: mcpUrl.hostname,
      port: mcpUrl.port || (MCP_URL.startsWith('https') ? 443 : 80),
      path: mcpUrl.pathname,
      method: 'POST',
      headers
    };

    const req = httpModule.request(options, (res) => {
      // Capture session ID from response
      if (res.headers['mcp-session-id']) {
        sessionId = res.headers['mcp-session-id'];
      }

      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        // Debug: log raw response
        process.stderr.write(`[MCP Bridge] Status: ${res.statusCode}, Raw response: ${data.substring(0, 500)}\n`);

        try {
          // Handle SSE format (event: message\ndata: {...})
          if (data.startsWith('event:') || data.startsWith('data:')) {
            const lines = data.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const jsonStr = line.slice(6);
                try {
                  const parsed = JSON.parse(jsonStr);
                  // Only accept if it's a valid JSON-RPC 2.0 message
                  if (parsed.jsonrpc === '2.0') {
                    // Ensure ID is always set from original request
                    if (parsed.id === null || parsed.id === undefined) {
                      parsed.id = messageId;
                    }
                    resolve(parsed);
                    return;
                  }
                  // If not valid JSON-RPC, continue looking
                } catch (e) {
                  // Continue looking for valid JSON
                }
              }
            }
            // If no valid data line found, return JSON-RPC error
            resolve({
              jsonrpc: '2.0',
              error: { code: -32603, message: `Invalid SSE response: ${data.substring(0, 200)}` },
              id: messageId
            });
          } else {
            // Try to parse as JSON
            const parsed = JSON.parse(data);

            // Only treat as valid JSON-RPC if it has the jsonrpc field
            if (parsed.jsonrpc === '2.0') {
              // Ensure ID is always set from original request
              if (parsed.id === null || parsed.id === undefined) {
                parsed.id = messageId;
              }
              resolve(parsed);
            } else if (parsed.error) {
              // Server returned an error object without JSON-RPC wrapper - wrap it
              const errorMessage = typeof parsed.error === 'string'
                ? parsed.error
                : (parsed.error.message || JSON.stringify(parsed.error));
              resolve({
                jsonrpc: '2.0',
                error: { code: -32603, message: errorMessage },
                id: messageId
              });
            } else if (parsed.result !== undefined) {
              // Has result but no jsonrpc field - wrap it
              resolve({
                jsonrpc: '2.0',
                result: parsed.result,
                id: messageId
              });
            } else {
              // Wrap entire response as result
              resolve({
                jsonrpc: '2.0',
                result: parsed,
                id: messageId
              });
            }
          }
        } catch (e) {
          // Return proper JSON-RPC error for parse failures
          resolve({
            jsonrpc: '2.0',
            error: { code: -32603, message: `Failed to parse response: ${data.substring(0, 200)}` },
            id: messageId
          });
        }
      });
    });

    req.on('error', (e) => {
      resolve({
        jsonrpc: '2.0',
        error: { code: -32603, message: `Request failed: ${e.message}` },
        id: messageId
      });
    });
    req.write(postData);
    req.end();
  });
}

// Main loop
async function main() {
  process.stderr.write(`[MCP Bridge v6] Starting...\n`);

  // Try to get access token
  if (CLIENT_ID && CLIENT_SECRET) {
    try {
      accessToken = await getAccessToken();
      process.stderr.write(`[MCP Bridge v6] Got access token\n`);
    } catch (e) {
      process.stderr.write(`[MCP Bridge v6] Warning: Could not get access token: ${e.message}\n`);
    }
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on('line', async (line) => {
    let messageId = null;
    try {
      const message = JSON.parse(line);
      messageId = message.id;

      // Notifications don't have an id field - they are fire-and-forget
      // and should NOT receive a response per JSON-RPC spec
      const isNotification = message.id === undefined;

      // Refresh token proactively if needed
      if (CLIENT_ID && CLIENT_SECRET && tokenNeedsRefresh()) {
        try {
          accessToken = await getAccessToken();
          process.stderr.write(`[MCP Bridge v6] Refreshed access token\n`);
        } catch (e) {
          process.stderr.write(`[MCP Bridge v6] Warning: Token refresh failed: ${e.message}\n`);
        }
      }

      let response = await sendToMCP(message);

      // Check if we got an "Invalid session" error - clear session and retry
      if (response.error && response.error.code === -32000 && response.error.message === 'Invalid session') {
        process.stderr.write(`[MCP Bridge v6] Session invalid, clearing and retrying...\n`);
        sessionId = null;
        response = await sendToMCP(message);
        if (!response.error) {
          process.stderr.write(`[MCP Bridge v6] Retry successful with new session\n`);
        }
      }

      // Check if we got an UNAUTHORIZED error - try refreshing token and retry once
      if (response.result && response.result.code === 'UNAUTHORIZED' && CLIENT_ID && CLIENT_SECRET) {
        process.stderr.write(`[MCP Bridge v6] Got UNAUTHORIZED, refreshing token...\n`);
        try {
          accessToken = await getAccessToken();
          process.stderr.write(`[MCP Bridge v6] Token refreshed, retrying request\n`);
          response = await sendToMCP(message);
        } catch (e) {
          process.stderr.write(`[MCP Bridge v6] Token refresh failed: ${e.message}\n`);
        }
      }

      // Only send response for requests (not notifications)
      if (!isNotification) {
        console.log(JSON.stringify(response));
      }
    } catch (e) {
      // Only send error response if it was a request (has id)
      if (messageId !== undefined) {
        console.log(JSON.stringify({
          jsonrpc: '2.0',
          error: { code: -32603, message: e.message },
          id: messageId
        }));
      }
    }
  });

  rl.on('close', () => {
    process.exit(0);
  });
}

main().catch(e => {
  process.stderr.write(`Fatal error: ${e.message}\n`);
  process.exit(1);
});
