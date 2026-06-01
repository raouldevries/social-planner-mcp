/**
 * Social Planner - MCP (Model Context Protocol) Types
 *
 * Types for MCP client registration, OAuth flows, and tool interactions.
 */

// ============================================
// MCP SCOPES
// ============================================

export const MCP_SCOPES = [
  'read_posts',
  'create_posts',
  'schedule_posts',
  'read_channels',
  'read_analytics',
] as const;

export type MCPScope = (typeof MCP_SCOPES)[number];

/**
 * Scopes that allow mutating data. The read-only demo account never receives
 * these — they are stripped before MCP tools are registered (see mcp.ts), so a
 * demo user can never invoke a write tool even over the MCP transport.
 */
export const MCP_WRITE_SCOPES = ['create_posts', 'schedule_posts'] as const;

// ============================================
// OAUTH FLOW TYPES
// ============================================

export interface MCPClientRegistration {
  name: string;
  redirectUris: string[];
  scopes: MCPScope[];
}

export interface MCPClientCredentials {
  clientId: string;
  clientSecret: string; // Only returned once on creation
}

export interface MCPTokenResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: 'Bearer';
  expiresIn: number; // seconds
  scope: string; // space-separated scopes
}

export interface MCPClientInfo {
  id: string;
  name: string;
  clientId: string;
  scopes: MCPScope[];
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

// ============================================
// MCP TOOL TYPES
// ============================================

export interface MCPToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  pendingActionId?: string; // If action requires confirmation
}

// ============================================
// PENDING ACTION TYPES
// ============================================

export type MCPPendingActionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';

export interface MCPPendingActionSummary {
  id: string;
  actionType: string;
  description: string;
  payload: Record<string, unknown>;
  status: MCPPendingActionStatus;
  expiresAt: string;
  createdAt: string;
}

export interface MCPPendingActionDetail extends MCPPendingActionSummary {
  clientId: string;
  clientName: string;
}

// ============================================
// AUDIT LOG TYPES
// ============================================

export interface MCPAuditLogEntry {
  id: string;
  tool: string;
  action: string;
  success: boolean;
  errorCode?: string;
  durationMs: number;
  createdAt: string;
}

export interface MCPAuditLogDetail extends MCPAuditLogEntry {
  clientId: string;
  clientName: string;
  inputParams: Record<string, unknown>;
  result: Record<string, unknown>;
}

// ============================================
// API REQUEST/RESPONSE TYPES
// ============================================

export interface RegisterMCPClientRequest {
  name: string;
  redirectUris: string[];
  scopes: MCPScope[];
}

export interface RegisterMCPClientResponse {
  client: MCPClientInfo;
  credentials: MCPClientCredentials;
}

export interface MCPAuthorizationRequest {
  responseType: 'code';
  clientId: string;
  redirectUri: string;
  scope: string; // space-separated
  state?: string;
}

export interface MCPTokenRequest {
  grantType: 'authorization_code' | 'refresh_token';
  code?: string;
  refreshToken?: string;
  redirectUri?: string;
  clientId: string;
  clientSecret: string;
}

export interface MCPRevokeTokenRequest {
  token: string;
  tokenTypeHint?: 'access_token' | 'refresh_token';
  clientId: string;
  clientSecret: string;
}

export interface ResolvePendingActionRequest {
  action: 'approve' | 'reject';
}
