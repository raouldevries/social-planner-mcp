/**
 * Social Planner - MCP Validation Schemas
 *
 * Zod schemas for MCP client registration, OAuth flows, and tool inputs.
 */

import { z } from 'zod';
import { MCP_SCOPES, type MCPScope } from '../types/mcp';

// ============================================
// MCP SCOPE VALIDATION
// ============================================

export const mcpScopeSchema = z.enum(MCP_SCOPES);

// ============================================
// CLIENT REGISTRATION SCHEMAS
// ============================================

export const registerMCPClientSchema = z.object({
  name: z.string().min(1).max(100),
  redirectUris: z.array(z.string().url()).min(1).max(5),
  scopes: z.array(mcpScopeSchema).min(1),
});

// Client ID is base64url token, not UUID (22 chars for 16 bytes)
export const mcpClientIdSchema = z
  .string()
  .min(20)
  .max(50)
  .regex(/^[A-Za-z0-9_-]+$/);

// ============================================
// OAUTH FLOW SCHEMAS
// ============================================

export const mcpAuthorizationSchema = z.object({
  responseType: z.literal('code'),
  clientId: mcpClientIdSchema,
  redirectUri: z.string().url(),
  // Parse and validate each scope against the enum
  scope: z.string().transform((s, ctx) => {
    const scopes = s.split(' ').filter(Boolean);
    const validScopes = scopes.filter((scope): scope is MCPScope =>
      MCP_SCOPES.includes(scope as MCPScope)
    );
    if (validScopes.length !== scopes.length) {
      const invalid = scopes.filter((s) => !MCP_SCOPES.includes(s as MCPScope));
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Invalid scopes: ${invalid.join(', ')}`,
      });
      return z.NEVER;
    }
    return validScopes;
  }),
  state: z.string().optional(),
});

export const mcpTokenRequestSchema = z.discriminatedUnion('grantType', [
  z.object({
    grantType: z.literal('authorization_code'),
    code: z.string(),
    redirectUri: z.string().url(),
    clientId: mcpClientIdSchema,
    clientSecret: z.string().min(1),
  }),
  z.object({
    grantType: z.literal('refresh_token'),
    refreshToken: z.string().min(1),
    clientId: mcpClientIdSchema,
    clientSecret: z.string().min(1),
  }),
  z.object({
    grantType: z.literal('client_credentials'),
    clientId: mcpClientIdSchema,
    clientSecret: z.string().min(1),
    scope: z.string().optional(), // Space-separated scopes
  }),
]);

export const mcpRevokeTokenSchema = z.object({
  token: z.string().min(1),
  tokenTypeHint: z.enum(['access_token', 'refresh_token']).optional(),
  clientId: mcpClientIdSchema,
  clientSecret: z.string().min(1),
});

// ============================================
// TOOL INPUT SCHEMAS
// ============================================

export const mcpCreatePostSchema = z.object({
  content: z.string().min(1).max(10000),
  channelIds: z.array(z.string().uuid()).optional(),
  mediaAssetIds: z.array(z.string().uuid()).optional(),
  linkUrl: z.string().url().optional(),
});

export const mcpUpdatePostSchema = z.object({
  postId: z.string().uuid(),
  content: z.string().min(1).max(10000).optional(),
  linkUrl: z.string().url().nullable().optional(),
});

export const mcpSchedulePostSchema = z.object({
  postId: z.string().uuid(),
  channels: z
    .array(
      z.object({
        socialAccountId: z.string().uuid(),
        scheduledAt: z.string().datetime(),
        customContent: z.string().max(5000).optional(),
      })
    )
    .min(1),
  requiresConfirmation: z.boolean().default(true),
});

export const mcpListPostsSchema = z.object({
  status: z
    .enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'REJECTED'])
    .optional(),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
});

export const mcpGetPostSchema = z.object({
  postId: z.string().uuid(),
});

export const mcpListChannelsSchema = z.object({
  platform: z.enum(['INSTAGRAM', 'LINKEDIN']).optional(),
});

export const mcpSubmitForApprovalSchema = z.object({
  postId: z.string().uuid(),
});

// ============================================
// PENDING ACTION SCHEMAS
// ============================================

export const mcpResolvePendingActionSchema = z.object({
  action: z.enum(['approve', 'reject']),
});
