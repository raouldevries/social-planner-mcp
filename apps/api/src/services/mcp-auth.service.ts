/**
 * Social Planner - MCP Authentication Service
 *
 * Handles OAuth 2.0 token management for MCP clients (e.g., Claude Desktop).
 * Implements authorization code flow with opaque access/refresh tokens.
 */

import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import type { MCPScope, MCPTokenResponse, MCPClientInfo } from '@social-planner/shared';

const SALT_ROUNDS = 12;

// Generate secure random strings (base64url encoded)
function generateToken(bytes = 32): string {
  return randomBytes(bytes).toString('base64url');
}

// Parse duration strings like '1h', '30d' to milliseconds
function parseDuration(duration: string): number {
  const match = duration.match(/^(\d+)([smhd])$/);
  if (!match) throw new Error(`Invalid duration: ${duration}`);
  const value = parseInt(match[1], 10);
  const unit = match[2];
  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
  };
  return value * multipliers[unit];
}

export interface RegisterClientResult {
  client: MCPClientInfo;
  credentials: {
    clientId: string;
    clientSecret: string; // Only returned once!
  };
}

/**
 * Register a new MCP client for a user (e.g., Claude Desktop)
 */
export async function registerClient(
  userId: string,
  name: string,
  redirectUris: string[],
  scopes: MCPScope[]
): Promise<RegisterClientResult> {
  const clientId = generateToken(16);
  const clientSecret = generateToken(32);
  const hashedSecret = await bcrypt.hash(clientSecret, SALT_ROUNDS);

  // Convert lowercase scopes to uppercase for Prisma enum
  const prismaScopes = scopes.map((s) => s.toUpperCase().replace(/_/g, '_')) as Array<
    'READ_POSTS' | 'CREATE_POSTS' | 'SCHEDULE_POSTS' | 'READ_CHANNELS' | 'READ_ANALYTICS'
  >;

  const client = await prisma.mCPClient.create({
    data: {
      name,
      clientId,
      clientSecret: hashedSecret,
      userId,
      scopes: prismaScopes,
      redirectUris,
    },
    select: {
      id: true,
      name: true,
      clientId: true,
      scopes: true,
      isActive: true,
      createdAt: true,
      lastUsedAt: true,
    },
  });

  // Convert scopes back to lowercase for API response
  const responseScopes = client.scopes.map((s) => s.toLowerCase()) as MCPScope[];

  return {
    client: {
      id: client.id,
      name: client.name,
      clientId: client.clientId,
      scopes: responseScopes,
      isActive: client.isActive,
      createdAt: client.createdAt.toISOString(),
      lastUsedAt: client.lastUsedAt?.toISOString() ?? null,
    },
    credentials: {
      clientId,
      clientSecret, // Only time secret is returned in plaintext
    },
  };
}

/**
 * Validate client credentials
 */
export async function validateClient(clientId: string, clientSecret: string) {
  const client = await prisma.mCPClient.findUnique({
    where: { clientId },
    include: { user: true },
  });

  if (!client || !client.isActive) {
    return null;
  }

  const isValid = await bcrypt.compare(clientSecret, client.clientSecret);
  if (!isValid) {
    return null;
  }

  return { client, user: client.user };
}

/**
 * Generate authorization code (short-lived, single-use)
 */
export async function generateAuthorizationCode(
  clientId: string,
  userId: string,
  requestedScopes: MCPScope[],
  redirectUri: string
): Promise<string> {
  const client = await prisma.mCPClient.findUnique({
    where: { clientId },
  });

  if (!client || client.userId !== userId) {
    throw new AppError('INVALID_CLIENT', 'Client not found or unauthorized', 400);
  }

  // Verify redirect URI is registered
  if (!client.redirectUris.includes(redirectUri)) {
    throw new AppError('INVALID_REDIRECT', 'Redirect URI not registered', 400);
  }

  // Convert client scopes to lowercase for comparison
  const clientScopesLower = client.scopes.map((s) => s.toLowerCase()) as MCPScope[];

  // Verify requested scopes are subset of registered scopes
  const invalidScopes = requestedScopes.filter((s) => !clientScopesLower.includes(s));
  if (invalidScopes.length > 0) {
    throw new AppError('INVALID_SCOPE', `Scopes not authorized: ${invalidScopes.join(', ')}`, 400);
  }

  // Generate code as JWT (short-lived, self-contained)
  const code = jwt.sign(
    {
      clientId,
      userId,
      scopes: requestedScopes,
      redirectUri,
      type: 'authorization_code',
    },
    config.JWT_ACCESS_SECRET,
    { expiresIn: '10m' }
  );

  return code;
}

/**
 * Exchange authorization code for tokens
 */
export async function exchangeCodeForTokens(
  code: string,
  clientId: string,
  clientSecret: string,
  redirectUri: string
): Promise<MCPTokenResponse> {
  // Validate client
  const validation = await validateClient(clientId, clientSecret);
  if (!validation) {
    throw new AppError('INVALID_CLIENT', 'Invalid client credentials', 401);
  }

  // Verify code
  let payload: {
    clientId: string;
    userId: string;
    scopes: MCPScope[];
    redirectUri: string;
    type: string;
  };

  try {
    payload = jwt.verify(code, config.JWT_ACCESS_SECRET) as typeof payload;
  } catch {
    throw new AppError('INVALID_CODE', 'Authorization code invalid or expired', 400);
  }

  if (payload.type !== 'authorization_code' || payload.clientId !== clientId) {
    throw new AppError('INVALID_CODE', 'Authorization code mismatch', 400);
  }

  if (payload.redirectUri !== redirectUri) {
    throw new AppError('INVALID_REDIRECT', 'Redirect URI mismatch', 400);
  }

  // Generate tokens
  return createSession(validation.client.id, payload.scopes);
}

/**
 * Create new MCP session with tokens
 */
async function createSession(clientId: string, scopes: MCPScope[]): Promise<MCPTokenResponse> {
  const accessToken = generateToken(32);
  const refreshToken = generateToken(48);

  const accessExpiresMs = parseDuration(config.MCP_ACCESS_TOKEN_EXPIRES_IN);
  const refreshExpiresMs = parseDuration(config.MCP_REFRESH_TOKEN_EXPIRES_IN);

  const expiresAt = new Date(Date.now() + accessExpiresMs);
  const refreshExpiresAt = new Date(Date.now() + refreshExpiresMs);

  // Convert scopes to uppercase for Prisma enum
  const prismaScopes = scopes.map((s) => s.toUpperCase()) as Array<
    'READ_POSTS' | 'CREATE_POSTS' | 'SCHEDULE_POSTS' | 'READ_CHANNELS' | 'READ_ANALYTICS'
  >;

  await prisma.mCPSession.create({
    data: {
      clientId,
      accessToken,
      refreshToken,
      scopes: prismaScopes,
      expiresAt,
      refreshExpiresAt,
    },
  });

  // Update last used timestamp
  await prisma.mCPClient.update({
    where: { id: clientId },
    data: { lastUsedAt: new Date() },
  });

  return {
    accessToken,
    refreshToken,
    tokenType: 'Bearer',
    expiresIn: Math.floor(accessExpiresMs / 1000),
    scope: scopes.join(' '),
  };
}

/**
 * Refresh access token
 */
export async function refreshAccessToken(
  refreshToken: string,
  clientId: string,
  clientSecret: string
): Promise<MCPTokenResponse> {
  // Validate client
  const validation = await validateClient(clientId, clientSecret);
  if (!validation) {
    throw new AppError('INVALID_CLIENT', 'Invalid client credentials', 401);
  }

  // Find session by refresh token
  const session = await prisma.mCPSession.findUnique({
    where: { refreshToken },
    include: { client: true },
  });

  if (!session || session.client.clientId !== clientId) {
    throw new AppError('INVALID_TOKEN', 'Refresh token invalid', 401);
  }

  if (session.revokedAt) {
    throw new AppError('TOKEN_REVOKED', 'Token has been revoked', 401);
  }

  if (session.refreshExpiresAt < new Date()) {
    throw new AppError('TOKEN_EXPIRED', 'Refresh token expired', 401);
  }

  // Revoke old session
  await prisma.mCPSession.update({
    where: { id: session.id },
    data: { revokedAt: new Date() },
  });

  // Create new session with same scopes (convert to lowercase)
  const scopes = session.scopes.map((s) => s.toLowerCase()) as MCPScope[];
  return createSession(session.clientId, scopes);
}

/**
 * Client credentials grant - for machine-to-machine authentication
 * Returns tokens using the client's registered scopes
 */
export async function clientCredentialsGrant(
  clientId: string,
  clientSecret: string,
  requestedScope?: string
): Promise<MCPTokenResponse> {
  // Validate client
  const validation = await validateClient(clientId, clientSecret);
  if (!validation) {
    throw new AppError('INVALID_CLIENT', 'Invalid client credentials', 401);
  }

  // Get client's registered scopes (convert to lowercase)
  const clientScopes = validation.client.scopes.map((s) => s.toLowerCase()) as MCPScope[];

  // If scope requested, filter to only those scopes
  let scopes = clientScopes;
  if (requestedScope) {
    const requested = requestedScope.split(' ') as MCPScope[];
    scopes = requested.filter((s) => clientScopes.includes(s));
    if (scopes.length === 0) {
      throw new AppError('INVALID_SCOPE', 'No valid scopes requested', 400);
    }
  }

  // Create session with validated scopes
  return createSession(validation.client.id, scopes);
}

/**
 * Validate access token and return session info
 */
export async function validateAccessToken(accessToken: string) {
  const session = await prisma.mCPSession.findUnique({
    where: { accessToken },
    include: {
      client: {
        include: { user: true },
      },
    },
  });

  if (!session) {
    return null;
  }

  if (session.revokedAt || session.expiresAt < new Date()) {
    return null;
  }

  if (!session.client.isActive) {
    return null;
  }

  return {
    session,
    client: session.client,
    user: session.client.user,
  };
}

/**
 * Revoke token (access or refresh)
 */
export async function revokeToken(
  token: string,
  tokenTypeHint?: 'access_token' | 'refresh_token'
): Promise<void> {
  // Try to find by access token first (unless hint says refresh)
  if (tokenTypeHint !== 'refresh_token') {
    const byAccess = await prisma.mCPSession.findUnique({
      where: { accessToken: token },
    });
    if (byAccess) {
      await prisma.mCPSession.update({
        where: { id: byAccess.id },
        data: { revokedAt: new Date() },
      });
      return;
    }
  }

  // Try refresh token
  const byRefresh = await prisma.mCPSession.findUnique({
    where: { refreshToken: token },
  });
  if (byRefresh) {
    await prisma.mCPSession.update({
      where: { id: byRefresh.id },
      data: { revokedAt: new Date() },
    });
  }
}

/**
 * List user's MCP clients
 */
export async function listUserClients(userId: string): Promise<MCPClientInfo[]> {
  const clients = await prisma.mCPClient.findMany({
    where: { userId },
    select: {
      id: true,
      name: true,
      clientId: true,
      scopes: true,
      isActive: true,
      createdAt: true,
      lastUsedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return clients.map((c) => ({
    id: c.id,
    name: c.name,
    clientId: c.clientId,
    scopes: c.scopes.map((s) => s.toLowerCase()) as MCPScope[],
    isActive: c.isActive,
    createdAt: c.createdAt.toISOString(),
    lastUsedAt: c.lastUsedAt?.toISOString() ?? null,
  }));
}

/**
 * Revoke client (and all its sessions)
 */
export async function revokeClient(clientId: string, userId: string): Promise<void> {
  const client = await prisma.mCPClient.findFirst({
    where: { id: clientId, userId },
  });

  if (!client) {
    throw new AppError('CLIENT_NOT_FOUND', 'Client not found', 404);
  }

  // Revoke all sessions
  await prisma.mCPSession.updateMany({
    where: { clientId: client.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  // Deactivate client
  await prisma.mCPClient.update({
    where: { id: client.id },
    data: { isActive: false },
  });
}

/**
 * Delete client permanently
 */
export async function deleteClient(clientId: string, userId: string): Promise<void> {
  const client = await prisma.mCPClient.findFirst({
    where: { id: clientId, userId },
  });

  if (!client) {
    throw new AppError('CLIENT_NOT_FOUND', 'Client not found', 404);
  }

  // Delete will cascade to sessions and audit logs
  await prisma.mCPClient.delete({
    where: { id: client.id },
  });
}
