/**
 * MCP Demo Read-Only Enforcement Tests
 *
 * The MCP transport authenticates via requireMCPAuth, NOT requireAuth, so the
 * blockDemoWrites guard does not cover it. Instead, demo users have write scopes
 * stripped before tools are registered (see createMcpServer in routes/mcp.ts).
 * These tests prove that stripping write scopes makes every write tool
 * unregisterable while leaving every read tool available.
 */

import { describe, it, expect, vi } from 'vitest';

// mcp-tools.service imports prisma (-> logger -> config, which process.exit()s on
// missing env). We only exercise the pure MCP_TOOLS constant and scope helper, so
// stub the prisma module to keep the import side-effect-free.
vi.mock('../lib/prisma', () => ({ prisma: {} }));
vi.mock('../config', () => ({ config: { NODE_ENV: 'test' } }));

import { MCP_SCOPES, MCP_WRITE_SCOPES } from '@social-planner/shared';
import { MCP_TOOLS, filterReadOnlyScopes } from './mcp-tools.service';

describe('filterReadOnlyScopes', () => {
  it('removes every write scope and keeps read scopes', () => {
    const result = filterReadOnlyScopes([...MCP_SCOPES]);
    expect(result).toEqual(['read_posts', 'read_channels', 'read_analytics']);
    for (const writeScope of MCP_WRITE_SCOPES) {
      expect(result).not.toContain(writeScope);
    }
  });

  it('is a no-op for an already read-only scope list', () => {
    expect(filterReadOnlyScopes(['read_posts', 'read_channels'])).toEqual([
      'read_posts',
      'read_channels',
    ]);
  });
});

describe('demo read-only MCP tool exposure', () => {
  const writeScopes = MCP_WRITE_SCOPES as readonly string[];
  // A demo user who somehow held every scope still loses all write scopes.
  const demoScopes = filterReadOnlyScopes([...MCP_SCOPES]);

  it('makes every write tool unregisterable and keeps every read tool', () => {
    for (const [name, def] of Object.entries(MCP_TOOLS)) {
      const isWriteTool = def.requiredScopes.some((scope) => writeScopes.includes(scope));
      const satisfiableForDemo = def.requiredScopes.every((scope) => demoScopes.includes(scope));
      if (isWriteTool) {
        expect(satisfiableForDemo, `${name} must be blocked for demo users`).toBe(false);
      } else {
        expect(satisfiableForDemo, `${name} must remain available for demo users`).toBe(true);
      }
    }
  });

  it('blocks exactly the known mutating tools', () => {
    const blocked = Object.entries(MCP_TOOLS)
      .filter(([, def]) => !def.requiredScopes.every((scope) => demoScopes.includes(scope)))
      .map(([name]) => name)
      .sort();
    expect(blocked).toEqual(['create_post', 'schedule_post', 'submit_for_approval', 'update_post']);
  });
});
