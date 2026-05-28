# MCP Server Implementation Plan for Social Planner

> Detailed implementation guide for integrating Model Context Protocol (MCP) into Social Planner, enabling Claude Desktop to create, schedule, and manage social media posts.

---

## Implementation Status

| Phase                          | Description                               | Status      | Completed    |
| ------------------------------ | ----------------------------------------- | ----------- | ------------ |
| Phase 1                        | Foundation - OAuth & Token Infrastructure | ✅ Complete | Jan 18, 2026 |
| Phase 2                        | MCP Server Implementation                 | ✅ Complete | Jan 18, 2026 |
| Phase 3                        | Web UI - MCP Management & Confirmations   | ✅ Complete | Jan 18, 2026 |
| Phase 4                        | Testing & Documentation                   | ✅ Complete | Jan 18, 2026 |
| Phase 5                        | Operational Cleanup Jobs                  | ✅ Complete | Jan 18, 2026 |
| **Claude Desktop Integration** | Stdio bridge + OAuth fixes                | ✅ Complete | Jan 18, 2026 |

### Key Implementation Notes

**Route Order Fix (Critical)**:
MCP routes MUST be mounted in `app.ts` BEFORE generic `/api` routes that use router-level `requireAuth` middleware (like `channelRoutes`). Otherwise, all MCP requests will require JWT authentication, breaking the OAuth token endpoint.

**Client Credentials Grant**:
Added OAuth2 `client_credentials` grant type to enable machine-to-machine authentication for Claude Desktop without user interaction.

**Stdio Bridge Script**:
Created `scripts/mcp-stdio-bridge.js` to bridge Claude Desktop's stdio transport to the HTTP-based MCP server. The bridge handles:

- OAuth token acquisition via client_credentials grant
- Session ID management across requests
- SSE (Server-Sent Events) response parsing

**Configuration**:
Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "social-planner-mcp": {
      "command": "node",
      "args": ["/path/to/Social Planner/scripts/mcp-stdio-bridge.js"],
      "env": {
        "MCP_URL": "http://localhost:4000/api/mcp",
        "MCP_CLIENT_ID": "<your-client-id>",
        "MCP_CLIENT_SECRET": "<your-client-secret>",
        "MCP_TOKEN_URL": "http://localhost:4000/api/mcp/oauth/token"
      }
    }
  }
}
```

---

## Architecture Decision: Integrated MCP Server

**Decision**: Integrate MCP server directly into `apps/api` as a new route/service layer rather than creating a standalone `apps/mcp` package.

**Rationale**:

1. **Shared infrastructure** - MCP needs direct access to existing Prisma models, services (post.service.ts, channel.service.ts), and Redis/BullMQ
2. **Auth consistency** - Can extend existing JWT/Session patterns for MCP tokens rather than building parallel auth system
3. **Deployment simplicity** - Single API deployment vs managing separate MCP service; aligns with single-VPS Docker Compose architecture
4. **Code reuse** - MCP handlers can call existing service functions directly, avoiding API-over-HTTP calls

**Trade-off**: Couples MCP to API release cycle, but acceptable given single-team operation.

---

## Implementation Workflow

This ensures quality gates between steps and keeps progress documented.

---

## Phase 1: Foundation - OAuth & Token Infrastructure

**Estimated effort**: Core auth implementation

### Step 1.1: Database Schema - MCP Client & Session Models

**Files**:

- `packages/database/prisma/schema.prisma` — Add MCP client and session models

**Implementation**:

```prisma
// ============================================
// MCP (Model Context Protocol) INTEGRATION
// ============================================

enum MCPScope {
  READ_POSTS       // View posts and drafts
  CREATE_POSTS     // Create new drafts
  SCHEDULE_POSTS   // Schedule posts for publishing
  READ_CHANNELS    // View connected social accounts
  READ_ANALYTICS   // View post analytics
}

model MCPClient {
  id            String   @id @default(uuid())
  name          String   // e.g., "Claude Desktop - John's MacBook"
  clientId      String   @unique @map("client_id") // Random identifier
  clientSecret  String   @map("client_secret") // Hashed secret
  userId        String   @map("user_id")
  scopes        MCPScope[]
  redirectUris  String[] @map("redirect_uris")
  isActive      Boolean  @default(true) @map("is_active")
  createdAt     DateTime @default(now()) @map("created_at")
  lastUsedAt    DateTime? @map("last_used_at")

  user     User          @relation(fields: [userId], references: [id], onDelete: Cascade)
  sessions MCPSession[]
  auditLogs MCPAuditLog[]

  @@index([userId])
  @@index([clientId])
  @@map("mcp_clients")
}

model MCPSession {
  id            String   @id @default(uuid())
  clientId      String   @map("client_id")
  accessToken   String   @unique @map("access_token")
  refreshToken  String   @unique @map("refresh_token")
  scopes        MCPScope[]
  expiresAt     DateTime @map("expires_at")
  refreshExpiresAt DateTime @map("refresh_expires_at")
  createdAt     DateTime @default(now()) @map("created_at")
  revokedAt     DateTime? @map("revoked_at")

  client MCPClient @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@index([clientId])
  @@index([accessToken])
  @@index([expiresAt])
  @@map("mcp_sessions")
}

model MCPAuditLog {
  id          String   @id @default(uuid())
  clientId    String   @map("client_id")
  userId      String   @map("user_id")
  tool        String   // Tool name: create_post, schedule_post, etc.
  action      String   // Action taken
  inputParams Json     @map("input_params")
  result      Json     @default("{}")
  success     Boolean
  errorCode   String?  @map("error_code")
  durationMs  Int      @map("duration_ms")
  createdAt   DateTime @default(now()) @map("created_at")

  client MCPClient @relation(fields: [clientId], references: [id], onDelete: Cascade)

  @@index([clientId])
  @@index([userId])
  @@index([createdAt])
  @@index([tool])
  @@map("mcp_audit_logs")
}

// Pending confirmation for MCP actions requiring user approval
model MCPPendingAction {
  id            String   @id @default(uuid())
  userId        String   @map("user_id")
  clientId      String   @map("client_id")
  actionType    String   @map("action_type") // schedule_post, publish_now, etc.
  payload       Json     // Full action payload
  description   String   // Human-readable description
  status        String   @default("PENDING") // PENDING, APPROVED, REJECTED, EXPIRED
  expiresAt     DateTime @map("expires_at")
  resolvedAt    DateTime? @map("resolved_at")
  createdAt     DateTime @default(now()) @map("created_at")

  @@index([userId, status])
  @@index([expiresAt])
  @@map("mcp_pending_actions")
}
```

**Notes**:

- MCPScope enum defines granular permissions (matches OAuth 2.0 scope pattern)
- MCPPendingAction enables the confirmation flow - MCP proposes, user approves
- Separate from Session model to keep MCP auth isolated from browser sessions
- clientSecret stored hashed (bcrypt) like passwords

**Migration command**:

```bash
npm run db:migrate -- --name add_mcp_models
```

---

### Step 1.2: User Model Extension

**Files**:

- `packages/database/prisma/schema.prisma` — Add relation to User model

**Implementation**:

Add to existing User model relations:

```prisma
model User {
  // ... existing fields ...

  // MCP Relations (add these)
  mcpClients MCPClient[]

  // ... existing relations ...
}
```

---

### Step 1.3: Shared Types & Schemas

**Files**:

- `packages/shared/src/types/mcp.ts` — MCP-specific TypeScript types
- `packages/shared/src/validation/mcp.schemas.ts` — Zod validation schemas

**Implementation** (`packages/shared/src/types/mcp.ts`):

```typescript
// MCP Scopes
export const MCP_SCOPES = [
  'read_posts',
  'create_posts',
  'schedule_posts',
  'read_channels',
  'read_analytics',
] as const;

export type MCPScope = (typeof MCP_SCOPES)[number];

// OAuth Flow Types
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

// MCP Tool Types
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

// Pending Action Types
export interface MCPPendingActionSummary {
  id: string;
  actionType: string;
  description: string;
  payload: Record<string, unknown>;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
}

// Audit Log Types
export interface MCPAuditLogEntry {
  id: string;
  tool: string;
  action: string;
  success: boolean;
  errorCode?: string;
  createdAt: string;
}
```

**Implementation** (`packages/shared/src/validation/mcp.schemas.ts`):

```typescript
import { z } from 'zod';
import { MCP_SCOPES, type MCPScope } from '../types/mcp';

export const mcpScopeSchema = z.enum(MCP_SCOPES);

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
]);

export const mcpRevokeTokenSchema = z.object({
  token: z.string().min(1),
  tokenTypeHint: z.enum(['access_token', 'refresh_token']).optional(),
  clientId: mcpClientIdSchema,
  clientSecret: z.string().min(1),
});

// Tool Input Schemas
export const mcpCreatePostSchema = z.object({
  content: z.string().min(1).max(10000),
  channelIds: z.array(z.string().uuid()).optional(),
  mediaAssetIds: z.array(z.string().uuid()).optional(),
  linkUrl: z.string().url().optional(),
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
  status: z.enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SCHEDULED', 'PUBLISHED']).optional(),
  limit: z.number().int().min(1).max(50).default(20),
  offset: z.number().int().min(0).default(0),
});

export const mcpListChannelsSchema = z.object({
  platform: z.enum(['INSTAGRAM', 'LINKEDIN']).optional(),
});
```

**Dependencies**:

```bash
# Already installed - zod is used throughout the project
```

---

### Step 1.3b: Shared Package Barrel Exports

**Files**:

- `packages/shared/src/types/index.ts` — Export MCP types
- `packages/shared/src/validation/index.ts` — Export MCP schemas
- `packages/shared/src/index.ts` — Main barrel export

**Implementation** (`packages/shared/src/types/index.ts`):

Add export:

```typescript
// ... existing exports ...
export * from './mcp';
```

**Implementation** (`packages/shared/src/validation/index.ts`):

Add export:

```typescript
// ... existing exports ...
export * from './mcp.schemas';
```

**Implementation** (`packages/shared/src/index.ts`):

Verify these are already re-exported (typically via the type/validation barrel exports):

```typescript
export * from './types';
export * from './validation';
// ... other exports ...
```

**Notes**:

- Without these exports, `import { MCPScope } from '@social-planner/shared'` will fail at build time
- Run `npm run build -w packages/shared` after adding to verify exports work

---

### Step 1.4: Environment Configuration

**Files**:

- `apps/api/src/config/index.ts` — Add MCP-specific environment variables

**Implementation**:

Add to existing config schema:

```typescript
// Add to existing configSchema
const configSchema = z.object({
  // ... existing fields ...

  // MCP Configuration
  MCP_ENABLED: z.boolean().default(true),
  MCP_ACCESS_TOKEN_EXPIRES_IN: z.string().default('1h'),
  MCP_REFRESH_TOKEN_EXPIRES_IN: z.string().default('30d'),
  MCP_PENDING_ACTION_EXPIRES_IN: z.string().default('24h'),
  MCP_RATE_LIMIT_REQUESTS: z.number().default(100), // per minute
  MCP_AUDIT_RETENTION_DAYS: z.number().default(90),
});

// Add to exported config object
export const config = {
  // ... existing exports ...

  mcp: {
    enabled: parsed.MCP_ENABLED,
    accessTokenExpiresIn: parsed.MCP_ACCESS_TOKEN_EXPIRES_IN,
    refreshTokenExpiresIn: parsed.MCP_REFRESH_TOKEN_EXPIRES_IN,
    pendingActionExpiresIn: parsed.MCP_PENDING_ACTION_EXPIRES_IN,
    rateLimitRequests: parsed.MCP_RATE_LIMIT_REQUESTS,
    auditRetentionDays: parsed.MCP_AUDIT_RETENTION_DAYS,
  },
};
```

**Environment Variables** (add to `.env.example`):

```env
# MCP (Model Context Protocol)
MCP_ENABLED=true
MCP_ACCESS_TOKEN_EXPIRES_IN=1h
MCP_REFRESH_TOKEN_EXPIRES_IN=30d
MCP_PENDING_ACTION_EXPIRES_IN=24h
MCP_RATE_LIMIT_REQUESTS=100
MCP_AUDIT_RETENTION_DAYS=90
```

---

### Step 1.5: MCP Authentication Service

**Files**:

- `apps/api/src/services/mcp-auth.service.ts` — OAuth token management for MCP clients

**Implementation**:

```typescript
import { randomBytes } from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';
import type { MCPScope, MCPTokenResponse, MCPClientInfo } from '@social-planner/shared';

const SALT_ROUNDS = 12;

// Generate secure random strings
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

  const client = await prisma.mCPClient.create({
    data: {
      name,
      clientId,
      clientSecret: hashedSecret,
      userId,
      scopes,
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

  return {
    client: {
      ...client,
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
export async function validateClient(
  clientId: string,
  clientSecret: string
): Promise<{ client: MCPClient; user: User } | null> {
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

  // Verify requested scopes are subset of registered scopes
  const invalidScopes = requestedScopes.filter((s) => !client.scopes.includes(s));
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
    config.jwt.accessSecret,
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
    payload = jwt.verify(code, config.jwt.accessSecret) as typeof payload;
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

  const accessExpiresMs = parseDuration(config.mcp.accessTokenExpiresIn);
  const refreshExpiresMs = parseDuration(config.mcp.refreshTokenExpiresIn);

  const expiresAt = new Date(Date.now() + accessExpiresMs);
  const refreshExpiresAt = new Date(Date.now() + refreshExpiresMs);

  await prisma.mCPSession.create({
    data: {
      clientId,
      accessToken,
      refreshToken,
      scopes,
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

  // Create new session with same scopes
  return createSession(session.clientId, session.scopes);
}

/**
 * Validate access token and return session info
 */
export async function validateAccessToken(accessToken: string): Promise<{
  session: MCPSession;
  client: MCPClient;
  user: User;
} | null> {
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
    ...c,
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
```

**Notes**:

- OAuth 2.0 authorization code flow with PKCE could be added later for enhanced security
- Client secrets are bcrypt-hashed (never stored plaintext)
- Access tokens are opaque (not JWTs) for revocability
- Authorization codes are JWTs for self-contained validation

---

### Step 1.6: MCP Authentication Middleware

**Files**:

- `apps/api/src/middleware/mcp-auth.ts` — Express middleware for MCP auth

**Implementation**:

```typescript
import { Request, Response, NextFunction } from 'express';
import { validateAccessToken } from '../services/mcp-auth.service';
import { AppError } from './errorHandler';
import type { MCPScope } from '@social-planner/shared';

// Extend Express Request for MCP context
declare global {
  namespace Express {
    interface Request {
      mcpContext?: {
        sessionId: string;
        clientId: string;
        clientName: string;
        userId: string;
        user: {
          id: string;
          email: string;
          fullName: string;
          role: string;
        };
        scopes: MCPScope[];
      };
    }
  }
}

/**
 * Middleware to require valid MCP access token
 */
export function requireMCPAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new AppError('UNAUTHORIZED', 'Missing or invalid Authorization header', 401));
  }

  const token = authHeader.slice(7);

  validateAccessToken(token)
    .then((result) => {
      if (!result) {
        return next(new AppError('UNAUTHORIZED', 'Invalid or expired access token', 401));
      }

      req.mcpContext = {
        sessionId: result.session.id,
        clientId: result.client.id,
        clientName: result.client.name,
        userId: result.user.id,
        user: {
          id: result.user.id,
          email: result.user.email,
          fullName: result.user.fullName,
          role: result.user.role,
        },
        scopes: result.session.scopes,
      };

      next();
    })
    .catch(next);
}

/**
 * Middleware to require specific MCP scopes
 */
export function requireMCPScopes(...requiredScopes: MCPScope[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.mcpContext) {
      return next(new AppError('UNAUTHORIZED', 'MCP authentication required', 401));
    }

    const missingScopes = requiredScopes.filter((scope) => !req.mcpContext!.scopes.includes(scope));

    if (missingScopes.length > 0) {
      return next(
        new AppError(
          'INSUFFICIENT_SCOPE',
          `Missing required scopes: ${missingScopes.join(', ')}`,
          403
        )
      );
    }

    next();
  };
}
```

---

## Phase 2: MCP Server Implementation

**Estimated effort**: Core MCP server with tools

### Where the MCP SDK is used in this flow

- `apps/api/src/routes/mcp.ts`: uses `McpServer`, `StreamableHTTPServerTransport`, and `isInitializeRequest` from `@modelcontextprotocol/sdk` to implement the MCP HTTP transport and tool registration.
- `apps/api/src/services/mcp-tools.service.ts`: uses Zod schemas that are passed into `server.registerTool(...)` (SDK consumes these schemas at runtime).
- `apps/api/src/routes/mcp.ts`: tool registration happens via `server.registerTool(...)`, which is the SDK API.

### Step 2.1: Install MCP SDK

**Dependencies**:

```bash
npm install @modelcontextprotocol/sdk@latest -w apps/api
```

**Installed Version**: ^1.25.2 (see `apps/api/package.json`)

**Notes**:

- The MCP SDK uses Zod for schema validation (already in project as peer dependency)
- SDK follows MCP spec version 2025-11-25
- Key imports used in this implementation:
  - `McpServer` - Core server class for registering tools/resources
  - `StreamableHTTPServerTransport` - HTTP transport (recommended for remote servers)
  - `isInitializeRequest` - Type guard for session initialization

**SDK Built-in OAuth Alternative**:
The SDK provides built-in OAuth providers (`ProxyOAuthServerProvider`, `mcpAuthRouter`) that can simplify OAuth implementation. This plan uses a custom OAuth implementation for greater control over the authorization flow and to integrate with existing JWT patterns. To use SDK OAuth instead:

```typescript
import { ProxyOAuthServerProvider } from '@modelcontextprotocol/sdk/server/auth/providers/proxyProvider.js';
import { mcpAuthRouter } from '@modelcontextprotocol/sdk/server/auth/router.js';
```

**Development Tooling**:
During implementation, Context7 MCP server can fetch up-to-date SDK documentation:

- Library ID: `/modelcontextprotocol/typescript-sdk`
- Use "use context7" in prompts for latest API examples
- SDK has 80+ code snippets covering transports, tools, OAuth, and session management
- Note: Context7 is configured per-user in `~/.claude.json`, not in the repo

---

### Step 2.2: MCP Tool Registry Service

**Files**:

- `apps/api/src/services/mcp-tools.service.ts` — MCP tool definitions and handlers

**Implementation**:

```typescript
import * as z from 'zod';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import * as postService from './post.service';
import * as channelService from './channel.service';
import type { MCPScope, MCPToolResult } from '@social-planner/shared';

// Tool definitions with Zod schemas
export const MCP_TOOLS = {
  // =========================================
  // READ TOOLS
  // =========================================

  list_posts: {
    name: 'list_posts',
    description:
      'List posts with optional filtering by status. Returns summaries of posts you have access to.',
    requiredScopes: ['read_posts'] as MCPScope[],
    inputSchema: {
      status: z
        .enum(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SCHEDULED', 'PUBLISHED', 'REJECTED'])
        .optional()
        .describe('Filter by post status'),
      limit: z
        .number()
        .int()
        .min(1)
        .max(50)
        .default(20)
        .describe('Maximum number of posts to return'),
      offset: z.number().int().min(0).default(0).describe('Number of posts to skip for pagination'),
    },
    outputSchema: {
      posts: z.array(
        z.object({
          id: z.string(),
          status: z.string(),
          baseContent: z.string().nullable(),
          authorName: z.string(),
          createdAt: z.string(),
          scheduledAt: z.string().nullable(),
          channelCount: z.number(),
        })
      ),
      total: z.number(),
      hasMore: z.boolean(),
    },
  },

  get_post: {
    name: 'get_post',
    description:
      'Get detailed information about a specific post including its content, channels, and scheduling.',
    requiredScopes: ['read_posts'] as MCPScope[],
    inputSchema: {
      postId: z.string().uuid().describe('The unique identifier of the post'),
    },
    outputSchema: {
      id: z.string(),
      status: z.string(),
      baseContent: z.string().nullable(),
      linkUrl: z.string().nullable(),
      author: z.object({
        id: z.string(),
        fullName: z.string(),
        email: z.string(),
      }),
      channels: z.array(
        z.object({
          id: z.string(),
          platform: z.string(),
          accountName: z.string(),
          customContent: z.string().nullable(),
          scheduledAt: z.string().nullable(),
          status: z.string(),
        })
      ),
      media: z.array(
        z.object({
          id: z.string(),
          fileName: z.string(),
          fileType: z.string(),
        })
      ),
      createdAt: z.string(),
      updatedAt: z.string(),
    },
  },

  list_channels: {
    name: 'list_channels',
    description: 'List connected social media accounts (channels) that can be used for publishing.',
    requiredScopes: ['read_channels'] as MCPScope[],
    inputSchema: {
      platform: z.enum(['INSTAGRAM', 'LINKEDIN']).optional().describe('Filter by social platform'),
    },
    outputSchema: {
      channels: z.array(
        z.object({
          id: z.string(),
          platform: z.string(),
          accountName: z.string(),
          profileImageUrl: z.string().nullable(),
          lastSyncAt: z.string().nullable(),
        })
      ),
    },
  },

  // =========================================
  // WRITE TOOLS
  // =========================================

  create_post: {
    name: 'create_post',
    description:
      'Create a new post draft. The post will be saved as a DRAFT and can later be scheduled or submitted for approval.',
    requiredScopes: ['create_posts'] as MCPScope[],
    inputSchema: {
      content: z.string().min(1).max(10000).describe('The main content/text of the post'),
      channelIds: z
        .array(z.string().uuid())
        .optional()
        .describe('Social account IDs to attach as channels'),
      linkUrl: z.string().url().optional().describe('Optional link URL to attach'),
    },
    outputSchema: {
      id: z.string(),
      status: z.string(),
      baseContent: z.string(),
      createdAt: z.string(),
      message: z.string(),
    },
  },

  update_post: {
    name: 'update_post',
    description:
      'Update an existing draft post. Only posts in DRAFT or REJECTED status can be updated.',
    requiredScopes: ['create_posts'] as MCPScope[],
    inputSchema: {
      postId: z.string().uuid().describe('The post ID to update'),
      content: z.string().min(1).max(10000).optional().describe('New content for the post'),
      linkUrl: z.string().url().nullable().optional().describe('Updated link URL (null to remove)'),
    },
    outputSchema: {
      id: z.string(),
      status: z.string(),
      baseContent: z.string().nullable(),
      updatedAt: z.string(),
      message: z.string(),
    },
  },

  schedule_post: {
    name: 'schedule_post',
    description:
      'Schedule a post for publishing. This will create a pending action that the user must confirm in the web interface before the post is actually scheduled.',
    requiredScopes: ['schedule_posts'] as MCPScope[],
    inputSchema: {
      postId: z.string().uuid().describe('The post ID to schedule'),
      channels: z
        .array(
          z.object({
            socialAccountId: z.string().uuid().describe('Social account ID'),
            scheduledAt: z.string().datetime().describe('ISO 8601 datetime for scheduling'),
            customContent: z
              .string()
              .max(5000)
              .optional()
              .describe('Platform-specific content override'),
          })
        )
        .min(1)
        .describe('Channel scheduling configuration'),
    },
    outputSchema: {
      pendingActionId: z.string(),
      message: z.string(),
      expiresAt: z.string(),
      channelSummary: z.array(
        z.object({
          platform: z.string(),
          accountName: z.string(),
          scheduledAt: z.string(),
        })
      ),
    },
  },

  submit_for_approval: {
    name: 'submit_for_approval',
    description:
      'Submit a draft post for approval review. Only posts in DRAFT status can be submitted.',
    requiredScopes: ['create_posts'] as MCPScope[],
    inputSchema: {
      postId: z.string().uuid().describe('The post ID to submit'),
    },
    outputSchema: {
      id: z.string(),
      status: z.string(),
      message: z.string(),
    },
  },
} as const;

// Context passed to all tool handlers (exported for use in mcp.ts route)
export interface ToolContext {
  userId: string;
  userRole: 'ADMIN' | 'EDITOR' | 'VIEWER';
  clientId: string;
}

// Helper: Check if user can modify a post
function canModifyPost(post: { authorId: string }, context: ToolContext): boolean {
  return post.authorId === context.userId || context.userRole === 'ADMIN';
}

// Tool handler implementations
// NOTE: Social Planner uses single-workspace architecture (all users share one workspace).
// For multi-tenant scenarios, add workspaceId/orgId filtering to all queries.
export const toolHandlers = {
  async list_posts(
    params: { status?: string; limit?: number; offset?: number },
    context: ToolContext
  ): Promise<MCPToolResult> {
    try {
      const { status, limit = 20, offset = 0 } = params;

      // Build query filters
      // Single-workspace: all users can see all posts in the workspace
      // For VIEWER role, only show published posts and posts where they're collaborators
      const where: any = {};
      if (status) {
        where.status = status;
      }

      // Scope based on user role
      if (context.userRole === 'VIEWER') {
        // Viewers can only see published posts or posts they're assigned to
        where.OR = [
          { status: 'PUBLISHED' },
          { collaborators: { some: { userId: context.userId } } },
        ];
      }

      const [posts, total] = await Promise.all([
        prisma.post.findMany({
          where,
          select: {
            id: true,
            status: true,
            baseContent: true,
            createdAt: true,
            scheduledAt: true,
            author: {
              select: { fullName: true },
            },
            _count: {
              select: { channels: true },
            },
          },
          orderBy: { createdAt: 'desc' },
          take: limit,
          skip: offset,
        }),
        prisma.post.count({ where }),
      ]);

      return {
        success: true,
        data: {
          posts: posts.map((p) => ({
            id: p.id,
            status: p.status,
            baseContent: p.baseContent,
            authorName: p.author.fullName,
            createdAt: p.createdAt.toISOString(),
            scheduledAt: p.scheduledAt?.toISOString() ?? null,
            channelCount: p._count.channels,
          })),
          total,
          hasMore: offset + posts.length < total,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LIST_POSTS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to list posts',
        },
      };
    }
  },

  async get_post(params: { postId: string }, context: ToolContext): Promise<MCPToolResult> {
    try {
      const post = await prisma.post.findUnique({
        where: { id: params.postId },
        include: {
          author: {
            select: { id: true, fullName: true, email: true },
          },
          channels: {
            include: {
              socialAccount: {
                select: { platform: true, accountName: true },
              },
            },
          },
          media: {
            include: {
              mediaAsset: {
                select: { id: true, fileName: true, fileType: true },
              },
            },
            orderBy: { position: 'asc' },
          },
          collaborators: {
            select: { userId: true },
          },
        },
      });

      if (!post) {
        return {
          success: false,
          error: { code: 'POST_NOT_FOUND', message: 'Post not found' },
        };
      }

      // Access control for VIEWER role
      if (context.userRole === 'VIEWER') {
        const isCollaborator = post.collaborators.some((c) => c.userId === context.userId);
        const isPublished = post.status === 'PUBLISHED';
        if (!isCollaborator && !isPublished) {
          return {
            success: false,
            error: { code: 'FORBIDDEN', message: 'You do not have access to this post' },
          };
        }
      }

      return {
        success: true,
        data: {
          id: post.id,
          status: post.status,
          baseContent: post.baseContent,
          linkUrl: post.linkUrl,
          author: post.author,
          channels: post.channels.map((c) => ({
            id: c.id,
            platform: c.socialAccount.platform,
            accountName: c.socialAccount.accountName,
            customContent: c.customContent,
            scheduledAt: c.scheduledAt?.toISOString() ?? null,
            status: c.status,
          })),
          media: post.media.map((m) => ({
            id: m.mediaAsset.id,
            fileName: m.mediaAsset.fileName,
            fileType: m.mediaAsset.fileType,
          })),
          createdAt: post.createdAt.toISOString(),
          updatedAt: post.updatedAt.toISOString(),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'GET_POST_FAILED',
          message: error instanceof Error ? error.message : 'Failed to get post',
        },
      };
    }
  },

  async list_channels(params: { platform?: string }, context: ToolContext): Promise<MCPToolResult> {
    try {
      // Single-workspace: all social accounts are shared across the workspace
      // All authenticated users (regardless of role) can view available channels
      // This is intentional - users need to see channels to create/schedule posts
      // For multi-tenant: add workspaceId filter here
      const where: any = {};
      if (params.platform) {
        where.platform = params.platform;
      }

      const accounts = await prisma.socialAccount.findMany({
        where,
        select: {
          id: true,
          platform: true,
          accountName: true,
          profileImageUrl: true,
          lastSyncAt: true,
        },
        orderBy: { accountName: 'asc' },
      });

      return {
        success: true,
        data: {
          channels: accounts.map((a) => ({
            id: a.id,
            platform: a.platform,
            accountName: a.accountName,
            profileImageUrl: a.profileImageUrl,
            lastSyncAt: a.lastSyncAt?.toISOString() ?? null,
          })),
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'LIST_CHANNELS_FAILED',
          message: error instanceof Error ? error.message : 'Failed to list channels',
        },
      };
    }
  },

  async create_post(
    params: { content: string; channelIds?: string[]; linkUrl?: string },
    context: ToolContext
  ): Promise<MCPToolResult> {
    // Only EDITOR and ADMIN can create posts
    if (context.userRole === 'VIEWER') {
      return {
        success: false,
        error: { code: 'FORBIDDEN', message: 'Viewers cannot create posts' },
      };
    }
    try {
      const post = await prisma.post.create({
        data: {
          authorId: context.userId,
          baseContent: params.content,
          linkUrl: params.linkUrl,
          status: 'DRAFT',
        },
        select: {
          id: true,
          status: true,
          baseContent: true,
          createdAt: true,
        },
      });

      // Attach channels if provided
      if (params.channelIds && params.channelIds.length > 0) {
        await prisma.postChannel.createMany({
          data: params.channelIds.map((socialAccountId) => ({
            postId: post.id,
            socialAccountId,
          })),
          skipDuplicates: true,
        });
      }

      // Log activity
      await prisma.activityLog.create({
        data: {
          postId: post.id,
          actorId: context.userId,
          action: 'CREATED',
          details: { source: 'mcp', clientId: context.clientId },
        },
      });

      return {
        success: true,
        data: {
          id: post.id,
          status: post.status,
          baseContent: post.baseContent,
          createdAt: post.createdAt.toISOString(),
          message:
            'Post draft created successfully. Use schedule_post to schedule it for publishing.',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CREATE_POST_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create post',
        },
      };
    }
  },

  async update_post(
    params: { postId: string; content?: string; linkUrl?: string | null },
    context: ToolContext
  ): Promise<MCPToolResult> {
    try {
      const existing = await prisma.post.findUnique({
        where: { id: params.postId },
        select: { id: true, status: true, authorId: true },
      });

      if (!existing) {
        return {
          success: false,
          error: { code: 'POST_NOT_FOUND', message: 'Post not found' },
        };
      }

      // Access control: only author or admin can update
      if (!canModifyPost(existing, context)) {
        return {
          success: false,
          error: { code: 'FORBIDDEN', message: 'You can only update your own posts' },
        };
      }

      if (!['DRAFT', 'REJECTED'].includes(existing.status)) {
        return {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot update post in ${existing.status} status`,
          },
        };
      }

      const updateData: any = {};
      if (params.content !== undefined) updateData.baseContent = params.content;
      if (params.linkUrl !== undefined) updateData.linkUrl = params.linkUrl;

      const post = await prisma.post.update({
        where: { id: params.postId },
        data: updateData,
        select: {
          id: true,
          status: true,
          baseContent: true,
          updatedAt: true,
        },
      });

      await prisma.activityLog.create({
        data: {
          postId: post.id,
          actorId: context.userId,
          action: 'UPDATED',
          details: { source: 'mcp', clientId: context.clientId },
        },
      });

      return {
        success: true,
        data: {
          id: post.id,
          status: post.status,
          baseContent: post.baseContent,
          updatedAt: post.updatedAt.toISOString(),
          message: 'Post updated successfully.',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'UPDATE_POST_FAILED',
          message: error instanceof Error ? error.message : 'Failed to update post',
        },
      };
    }
  },

  async schedule_post(
    params: {
      postId: string;
      channels: Array<{
        socialAccountId: string;
        scheduledAt: string;
        customContent?: string;
      }>;
    },
    context: ToolContext
  ): Promise<MCPToolResult> {
    try {
      const post = await prisma.post.findUnique({
        where: { id: params.postId },
        select: { id: true, status: true, authorId: true },
      });

      if (!post) {
        return {
          success: false,
          error: { code: 'POST_NOT_FOUND', message: 'Post not found' },
        };
      }

      // Access control: only author or admin can schedule
      if (!canModifyPost(post, context)) {
        return {
          success: false,
          error: { code: 'FORBIDDEN', message: 'You can only schedule your own posts' },
        };
      }

      if (!['DRAFT', 'APPROVED'].includes(post.status)) {
        return {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot schedule post in ${post.status} status. Post must be DRAFT or APPROVED.`,
          },
        };
      }

      // Validate channels exist
      const accountIds = params.channels.map((c) => c.socialAccountId);
      const accounts = await prisma.socialAccount.findMany({
        where: { id: { in: accountIds } },
        select: { id: true, platform: true, accountName: true },
      });

      if (accounts.length !== accountIds.length) {
        const found = accounts.map((a) => a.id);
        const missing = accountIds.filter((id) => !found.includes(id));
        return {
          success: false,
          error: {
            code: 'INVALID_CHANNELS',
            message: `Social accounts not found: ${missing.join(', ')}`,
          },
        };
      }

      // Create pending action for user confirmation
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

      const channelSummary = params.channels.map((c) => {
        const account = accounts.find((a) => a.id === c.socialAccountId)!;
        return {
          platform: account.platform,
          accountName: account.accountName,
          scheduledAt: c.scheduledAt,
        };
      });

      const pendingAction = await prisma.mCPPendingAction.create({
        data: {
          userId: context.userId,
          clientId: context.clientId,
          actionType: 'schedule_post',
          payload: {
            postId: params.postId,
            channels: params.channels,
          },
          description: `Schedule post to ${channelSummary.map((c) => `${c.accountName} (${c.platform})`).join(', ')}`,
          expiresAt,
        },
      });

      return {
        success: true,
        data: {
          pendingActionId: pendingAction.id,
          message:
            'Scheduling request created. Please confirm in the Social Planner web interface.',
          expiresAt: expiresAt.toISOString(),
          channelSummary,
        },
        pendingActionId: pendingAction.id,
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SCHEDULE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to create schedule request',
        },
      };
    }
  },

  async submit_for_approval(
    params: { postId: string },
    context: ToolContext
  ): Promise<MCPToolResult> {
    try {
      const post = await prisma.post.findUnique({
        where: { id: params.postId },
        select: { id: true, status: true, authorId: true },
      });

      if (!post) {
        return {
          success: false,
          error: { code: 'POST_NOT_FOUND', message: 'Post not found' },
        };
      }

      // Access control: only author or admin can submit
      if (!canModifyPost(post, context)) {
        return {
          success: false,
          error: { code: 'FORBIDDEN', message: 'You can only submit your own posts' },
        };
      }

      if (post.status !== 'DRAFT') {
        return {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot submit post in ${post.status} status. Post must be DRAFT.`,
          },
        };
      }

      const updated = await prisma.post.update({
        where: { id: params.postId },
        data: { status: 'PENDING_APPROVAL' },
        select: { id: true, status: true },
      });

      await prisma.activityLog.create({
        data: {
          postId: post.id,
          actorId: context.userId,
          action: 'SUBMITTED',
          details: { source: 'mcp', clientId: context.clientId },
        },
      });

      return {
        success: true,
        data: {
          id: updated.id,
          status: updated.status,
          message: 'Post submitted for approval. An admin will review it.',
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SUBMIT_FAILED',
          message: error instanceof Error ? error.message : 'Failed to submit post',
        },
      };
    }
  },
};

// Get tool by name
export function getTool(name: string) {
  return MCP_TOOLS[name as keyof typeof MCP_TOOLS];
}

// Get handler by name
export function getHandler(name: string) {
  return toolHandlers[name as keyof typeof toolHandlers];
}
```

---

### Step 2.3: MCP Audit Service

**Files**:

- `apps/api/src/services/mcp-audit.service.ts` — Audit logging for MCP actions

**Implementation**:

```typescript
import { prisma } from '../lib/prisma';
import type { MCPAuditLogEntry } from '@social-planner/shared';

interface AuditLogParams {
  clientId: string;
  userId: string;
  tool: string;
  action: string;
  inputParams: Record<string, unknown>;
  result: Record<string, unknown>;
  success: boolean;
  errorCode?: string;
  durationMs: number;
}

/**
 * Create an audit log entry for MCP tool invocation
 */
export async function logToolInvocation(params: AuditLogParams): Promise<void> {
  await prisma.mCPAuditLog.create({
    data: {
      clientId: params.clientId,
      userId: params.userId,
      tool: params.tool,
      action: params.action,
      inputParams: params.inputParams,
      result: params.result,
      success: params.success,
      errorCode: params.errorCode,
      durationMs: params.durationMs,
    },
  });
}

/**
 * Get audit logs for a user's MCP clients
 */
export async function getUserAuditLogs(
  userId: string,
  options: { limit?: number; offset?: number; tool?: string }
): Promise<{ logs: MCPAuditLogEntry[]; total: number }> {
  const { limit = 50, offset = 0, tool } = options;

  const where: any = { userId };
  if (tool) where.tool = tool;

  const [logs, total] = await Promise.all([
    prisma.mCPAuditLog.findMany({
      where,
      select: {
        id: true,
        tool: true,
        action: true,
        success: true,
        errorCode: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
    }),
    prisma.mCPAuditLog.count({ where }),
  ]);

  return {
    logs: logs.map((l) => ({
      id: l.id,
      tool: l.tool,
      action: l.action,
      success: l.success,
      errorCode: l.errorCode ?? undefined,
      createdAt: l.createdAt.toISOString(),
    })),
    total,
  };
}

/**
 * Clean up old audit logs (run as scheduled job)
 */
export async function cleanupOldAuditLogs(retentionDays: number): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - retentionDays);

  const result = await prisma.mCPAuditLog.deleteMany({
    where: {
      createdAt: { lt: cutoff },
    },
  });

  return result.count;
}
```

---

### Step 2.4: MCP Server Route (Express Integration)

**Files**:

- `apps/api/src/routes/mcp.ts` — MCP HTTP transport endpoint

**Implementation**:

```typescript
import { Router, Request, Response, NextFunction } from 'express';
import { randomUUID } from 'node:crypto';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';

import { requireMCPAuth } from '../middleware/mcp-auth';
import { MCP_TOOLS, getHandler, type ToolContext } from '../services/mcp-tools.service';
import { logToolInvocation } from '../services/mcp-audit.service';
import { config } from '../config';

const router = Router();

// Session storage (in production, use Redis for multi-instance support)
const transports: Record<string, StreamableHTTPServerTransport> = {};
const serversBySession: Record<string, McpServer> = {};

/**
 * Create MCP server instance with tools configured for the authenticated user
 */
function createMcpServer(mcpContext: NonNullable<Request['mcpContext']>): McpServer {
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

    server.registerTool(
      toolName,
      {
        title: toolName.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
        description: toolDef.description,
        inputSchema: toolDef.inputSchema,
        outputSchema: toolDef.outputSchema,
      },
      async (params) => {
        const startTime = Date.now();
        const handler = getHandler(toolName);

        if (!handler) {
          throw new Error(`No handler for tool: ${toolName}`);
        }

        try {
          const result = await handler(params, toolContext);

          const durationMs = Date.now() - startTime;

          // Audit log
          await logToolInvocation({
            clientId: toolContext.clientId,
            userId: toolContext.userId,
            tool: toolName,
            action: result.success ? 'success' : 'error',
            inputParams: params as Record<string, unknown>,
            result: result.data ?? {},
            success: result.success,
            errorCode: result.error?.code,
            durationMs,
          });

          if (!result.success) {
            return {
              content: [
                {
                  type: 'text',
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
                type: 'text',
                text: JSON.stringify(result.data),
              },
            ],
            structuredContent: result.data,
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
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    let transport: StreamableHTTPServerTransport;

    if (sessionId && transports[sessionId]) {
      // Reuse existing session
      transport = transports[sessionId];
    } else if (!sessionId && isInitializeRequest(req.body)) {
      // New session initialization
      transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: () => randomUUID(),
        enableJsonResponse: true,
        onsessioninitialized: (id) => {
          transports[id] = transport;
        },
        onsessionclosed: (id) => {
          delete transports[id];
          delete serversBySession[id];
        },
      });

      transport.onclose = () => {
        if (transport.sessionId) {
          delete transports[transport.sessionId];
          delete serversBySession[transport.sessionId];
        }
      };

      // Create MCP server for this session
      const server = createMcpServer(req.mcpContext!);
      await server.connect(transport);

      // Store server reference
      if (transport.sessionId) {
        serversBySession[transport.sessionId] = server;
      }
    } else {
      res.status(400).json({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'Invalid session' },
        id: null,
      });
      return;
    }

    await transport.handleRequest(req, res, req.body);
  } catch (error) {
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
```

---

### Step 2.5: MCP OAuth Routes

**Files**:

- `apps/api/src/routes/mcp-auth.ts` — OAuth endpoints for MCP client registration/auth

**Implementation**:

```typescript
import { Router } from 'express';
import { validate } from '../middleware/validate';
import { requireAuth } from '../middleware/auth';
import {
  registerMCPClientSchema,
  mcpAuthorizationSchema,
  mcpTokenRequestSchema,
  mcpRevokeTokenSchema,
} from '@social-planner/shared';
import * as mcpAuthService from '../services/mcp-auth.service';

const router = Router();

/**
 * Register a new MCP client (requires authenticated user)
 * POST /api/mcp/clients
 */
router.post('/clients', requireAuth, validate(registerMCPClientSchema), async (req, res, next) => {
  try {
    const result = await mcpAuthService.registerClient(
      req.user!.id,
      req.body.name,
      req.body.redirectUris,
      req.body.scopes
    );

    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
});

/**
 * List user's MCP clients
 * GET /api/mcp/clients
 */
router.get('/clients', requireAuth, async (req, res, next) => {
  try {
    const clients = await mcpAuthService.listUserClients(req.user!.id);
    res.json({ clients });
  } catch (error) {
    next(error);
  }
});

/**
 * Revoke an MCP client
 * DELETE /api/mcp/clients/:clientId
 */
router.delete('/clients/:clientId', requireAuth, async (req, res, next) => {
  try {
    await mcpAuthService.revokeClient(req.params.clientId, req.user!.id);
    res.status(204).send();
  } catch (error) {
    next(error);
  }
});

/**
 * OAuth authorization endpoint
 * GET /api/mcp/oauth/authorize
 *
 * Renders consent page (or returns JSON for API flow)
 */
router.get(
  '/oauth/authorize',
  requireAuth,
  validate(mcpAuthorizationSchema, 'query'),
  async (req, res, next) => {
    try {
      const { clientId, redirectUri, scope, state } = req.query as any;

      // In a full implementation, this would render a consent page
      // For API-first approach, generate code directly if user is authenticated
      const code = await mcpAuthService.generateAuthorizationCode(
        clientId,
        req.user!.id,
        scope,
        redirectUri
      );

      // Redirect back to client with code
      const redirectUrl = new URL(redirectUri);
      redirectUrl.searchParams.set('code', code);
      if (state) redirectUrl.searchParams.set('state', state);

      res.redirect(redirectUrl.toString());
    } catch (error) {
      next(error);
    }
  }
);

/**
 * OAuth token endpoint
 * POST /api/mcp/oauth/token
 */
router.post('/oauth/token', async (req, res, next) => {
  try {
    const body = mcpTokenRequestSchema.parse(req.body);

    let tokens;
    if (body.grantType === 'authorization_code') {
      tokens = await mcpAuthService.exchangeCodeForTokens(
        body.code,
        body.clientId,
        body.clientSecret,
        body.redirectUri
      );
    } else {
      tokens = await mcpAuthService.refreshAccessToken(
        body.refreshToken,
        body.clientId,
        body.clientSecret
      );
    }

    res.json({
      access_token: tokens.accessToken,
      refresh_token: tokens.refreshToken,
      token_type: tokens.tokenType,
      expires_in: tokens.expiresIn,
      scope: tokens.scope,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * OAuth token revocation endpoint
 * POST /api/mcp/oauth/revoke
 */
router.post('/oauth/revoke', validate(mcpRevokeTokenSchema), async (req, res, next) => {
  try {
    const { token, tokenTypeHint, clientId, clientSecret } = req.body;

    // Validate client credentials
    const validation = await mcpAuthService.validateClient(clientId, clientSecret);
    if (!validation) {
      res.status(401).json({ error: 'invalid_client' });
      return;
    }

    await mcpAuthService.revokeToken(token, tokenTypeHint);
    res.status(200).send();
  } catch (error) {
    next(error);
  }
});

export default router;
```

---

### Step 2.6: Register Routes in App

**Files**:

- `apps/api/src/app.ts` — Register MCP routes
- `apps/api/src/routes/index.ts` — Export MCP routes

**Implementation** (`apps/api/src/routes/index.ts`):

Add exports:

```typescript
// ... existing exports ...
export { default as mcpRoutes } from './mcp';
export { default as mcpAuthRoutes } from './mcp-auth';
export { default as mcpPendingActionsRoutes } from './mcp-pending-actions';
```

**Implementation** (`apps/api/src/app.ts`):

Add route registration:

```typescript
import { mcpRoutes, mcpAuthRoutes, mcpPendingActionsRoutes } from './routes';

// ... existing route registrations ...

// MCP routes (before error handler)
if (config.mcp.enabled) {
  app.use('/api/mcp', mcpAuthRoutes);
  app.use('/api/mcp/pending-actions', mcpPendingActionsRoutes);
  app.use('/api', mcpRoutes);
}
```

---

## Phase 3: Web UI - MCP Management & Confirmations

**Estimated effort**: Frontend integration

### Step 3.1: MCP Settings Page Component

**Files**:

- `apps/web/src/pages/SettingsMCP.tsx` — MCP client management page

**Implementation**:

```typescript
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { useMCPClients, useRegisterMCPClient, useRevokeMCPClient } from '@/hooks/useMCP';

const AVAILABLE_SCOPES = [
  { id: 'read_posts', label: 'Read Posts', description: 'View posts and drafts' },
  { id: 'create_posts', label: 'Create Posts', description: 'Create new drafts' },
  { id: 'schedule_posts', label: 'Schedule Posts', description: 'Schedule for publishing' },
  { id: 'read_channels', label: 'Read Channels', description: 'View connected accounts' },
  { id: 'read_analytics', label: 'Read Analytics', description: 'View post analytics' },
];

export function SettingsMCP() {
  const { t } = useTranslation();
  const { data: clients, isLoading } = useMCPClients();
  const registerMutation = useRegisterMCPClient();
  const revokeMutation = useRevokeMCPClient();

  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [newCredentials, setNewCredentials] = useState<{
    clientId: string;
    clientSecret: string;
  } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    redirectUris: [''],
    scopes: ['read_posts', 'read_channels'],
  });

  const handleRegister = async () => {
    const result = await registerMutation.mutateAsync({
      name: formData.name,
      redirectUris: formData.redirectUris.filter((u) => u.trim()),
      scopes: formData.scopes,
    });

    setNewCredentials(result.credentials);
    setShowRegisterModal(false);
    setShowCredentialsModal(true);
    setFormData({ name: '', redirectUris: [''], scopes: ['read_posts', 'read_channels'] });
  };

  const handleRevoke = async (clientId: string) => {
    if (confirm('Are you sure you want to revoke this client? This cannot be undone.')) {
      await revokeMutation.mutateAsync(clientId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">MCP Clients</h2>
          <p className="text-sm text-gray-500">
            Connect AI assistants like Claude Desktop to manage your posts
          </p>
        </div>
        <Button onClick={() => setShowRegisterModal(true)}>
          Register New Client
        </Button>
      </div>

      {isLoading ? (
        <div>Loading...</div>
      ) : clients?.clients.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-gray-500">No MCP clients registered yet.</p>
          <p className="text-sm text-gray-400 mt-2">
            Register a client to allow AI assistants to create and schedule posts.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {clients?.clients.map((client) => (
            <Card key={client.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-medium">{client.name}</h3>
                  <p className="text-sm text-gray-500 font-mono">{client.clientId}</p>
                  <div className="flex gap-2 mt-2">
                    {client.scopes.map((scope) => (
                      <span
                        key={scope}
                        className="px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded"
                      >
                        {scope}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">
                    Last used: {client.lastUsedAt ? new Date(client.lastUsedAt).toLocaleString() : 'Never'}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleRevoke(client.id)}
                  disabled={revokeMutation.isPending}
                >
                  Revoke
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Register Modal */}
      <Modal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        title="Register MCP Client"
      >
        <div className="space-y-4">
          <Input
            label="Client Name"
            placeholder="e.g., Claude Desktop - Work Laptop"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />

          <div>
            <label className="block text-sm font-medium mb-2">Redirect URIs</label>
            {formData.redirectUris.map((uri, i) => (
              <Input
                key={i}
                placeholder="http://localhost:3000/callback"
                value={uri}
                onChange={(e) => {
                  const newUris = [...formData.redirectUris];
                  newUris[i] = e.target.value;
                  setFormData({ ...formData, redirectUris: newUris });
                }}
                className="mb-2"
              />
            ))}
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                setFormData({ ...formData, redirectUris: [...formData.redirectUris, ''] })
              }
            >
              + Add URI
            </Button>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Permissions</label>
            <div className="space-y-2">
              {AVAILABLE_SCOPES.map((scope) => (
                <label key={scope.id} className="flex items-start gap-2">
                  <input
                    type="checkbox"
                    checked={formData.scopes.includes(scope.id)}
                    onChange={(e) => {
                      const newScopes = e.target.checked
                        ? [...formData.scopes, scope.id]
                        : formData.scopes.filter((s) => s !== scope.id);
                      setFormData({ ...formData, scopes: newScopes });
                    }}
                    className="mt-1"
                  />
                  <div>
                    <span className="font-medium">{scope.label}</span>
                    <p className="text-xs text-gray-500">{scope.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="ghost" onClick={() => setShowRegisterModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleRegister}
              disabled={!formData.name || formData.scopes.length === 0 || registerMutation.isPending}
            >
              Register
            </Button>
          </div>
        </div>
      </Modal>

      {/* Credentials Modal */}
      <Modal
        isOpen={showCredentialsModal}
        onClose={() => setShowCredentialsModal(false)}
        title="Client Credentials"
      >
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <p className="text-sm text-yellow-800 font-medium">
              Save these credentials now! The client secret will not be shown again.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Client ID</label>
            <code className="block p-2 bg-gray-100 rounded text-sm break-all">
              {newCredentials?.clientId}
            </code>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Client Secret</label>
            <code className="block p-2 bg-gray-100 rounded text-sm break-all">
              {newCredentials?.clientSecret}
            </code>
          </div>

          <Button onClick={() => setShowCredentialsModal(false)} className="w-full">
            I've saved the credentials
          </Button>
        </div>
      </Modal>
    </div>
  );
}
```

---

### Step 3.2: MCP Pending Actions Component

**Files**:

- `apps/web/src/components/mcp/PendingActions.tsx` — Display and approve/reject MCP pending actions

**Implementation**:

```typescript
import { formatDistanceToNow } from 'date-fns';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import {
  useMCPPendingActions,
  useApproveMCPAction,
  useRejectMCPAction,
} from '@/hooks/useMCP';

export function PendingActions() {
  const { data: pendingActions, isLoading } = useMCPPendingActions();
  const approveMutation = useApproveMCPAction();
  const rejectMutation = useRejectMCPAction();

  if (isLoading) return <div>Loading...</div>;

  if (!pendingActions?.actions.length) {
    return null; // Don't show if no pending actions
  }

  return (
    <div className="space-y-4">
      <h3 className="font-medium text-gray-900">Pending AI Requests</h3>
      <p className="text-sm text-gray-500">
        These actions were requested by AI assistants and need your approval.
      </p>

      {pendingActions.actions.map((action) => (
        <Card key={action.id} className="p-4 border-l-4 border-l-amber-400">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 rounded">
                  {action.actionType.replace(/_/g, ' ')}
                </span>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(action.createdAt), { addSuffix: true })}
                </span>
              </div>
              <p className="mt-2 text-sm">{action.description}</p>
              <p className="mt-1 text-xs text-gray-400">
                Expires {formatDistanceToNow(new Date(action.expiresAt), { addSuffix: true })}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => rejectMutation.mutate(action.id)}
                disabled={rejectMutation.isPending}
              >
                Reject
              </Button>
              <Button
                size="sm"
                onClick={() => approveMutation.mutate(action.id)}
                disabled={approveMutation.isPending}
              >
                Approve
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
```

---

### Step 3.3: MCP React Query Hooks

**Files**:

- `apps/web/src/hooks/useMCP.ts` — TanStack Query hooks for MCP features

**Implementation**:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  MCPClientInfo,
  MCPPendingActionSummary,
  MCPClientRegistration,
  MCPClientCredentials,
} from '@social-planner/shared';

// NOTE: api client baseURL is configured to include '/api' prefix
// So '/mcp/clients' resolves to '/api/mcp/clients'
// Verify this matches your apps/web/src/lib/api.ts configuration

// Query Keys
export const mcpKeys = {
  all: ['mcp'] as const,
  clients: () => [...mcpKeys.all, 'clients'] as const,
  pendingActions: () => [...mcpKeys.all, 'pending-actions'] as const,
  auditLogs: (params?: { limit?: number }) => [...mcpKeys.all, 'audit-logs', params] as const,
};

// List MCP Clients
export function useMCPClients() {
  return useQuery({
    queryKey: mcpKeys.clients(),
    queryFn: async () => {
      const { data } = await api.get<{ clients: MCPClientInfo[] }>('/mcp/clients');
      return data;
    },
  });
}

// Register MCP Client
export function useRegisterMCPClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (registration: MCPClientRegistration) => {
      const { data } = await api.post<{
        client: MCPClientInfo;
        credentials: MCPClientCredentials;
      }>('/mcp/clients', registration);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.clients() });
    },
  });
}

// Revoke MCP Client
export function useRevokeMCPClient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (clientId: string) => {
      await api.delete(`/mcp/clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.clients() });
    },
  });
}

// List Pending Actions
export function useMCPPendingActions() {
  return useQuery({
    queryKey: mcpKeys.pendingActions(),
    queryFn: async () => {
      const { data } = await api.get<{ actions: MCPPendingActionSummary[] }>(
        '/mcp/pending-actions'
      );
      return data;
    },
    refetchInterval: 30000, // Poll every 30s for new actions
  });
}

// Approve Pending Action
export function useApproveMCPAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actionId: string) => {
      const { data } = await api.post(`/mcp/pending-actions/${actionId}/approve`);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.pendingActions() });
      queryClient.invalidateQueries({ queryKey: ['posts'] }); // Refresh posts if scheduling happened
    },
  });
}

// Reject Pending Action
export function useRejectMCPAction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (actionId: string) => {
      await api.post(`/mcp/pending-actions/${actionId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: mcpKeys.pendingActions() });
    },
  });
}
```

---

### Step 3.4: Pending Actions API Routes

**Files**:

- `apps/api/src/routes/mcp-pending-actions.ts` — Routes for managing pending actions

**Implementation**:

```typescript
import { Router } from 'express';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import * as postService from '../services/post.service';

const router = Router();

/**
 * List pending actions for the authenticated user
 */
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const actions = await prisma.mCPPendingAction.findMany({
      where: {
        userId: req.user!.id,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({
      actions: actions.map((a) => ({
        id: a.id,
        actionType: a.actionType,
        description: a.description,
        payload: a.payload,
        status: a.status,
        expiresAt: a.expiresAt.toISOString(),
        createdAt: a.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Approve a pending action
 */
router.post('/:id/approve', requireAuth, async (req, res, next) => {
  try {
    const action = await prisma.mCPPendingAction.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
        status: 'PENDING',
      },
    });

    if (!action) {
      throw new AppError('ACTION_NOT_FOUND', 'Pending action not found', 404);
    }

    if (action.expiresAt < new Date()) {
      await prisma.mCPPendingAction.update({
        where: { id: action.id },
        data: { status: 'EXPIRED' },
      });
      throw new AppError('ACTION_EXPIRED', 'Action has expired', 400);
    }

    // Execute the action based on type
    const payload = action.payload as any;

    switch (action.actionType) {
      case 'schedule_post': {
        // Actually schedule the post now
        await postService.schedulePost(payload.postId, req.user!.id, {
          channels: payload.channels,
        });
        break;
      }
      // Add other action types as needed
      default:
        throw new AppError('UNKNOWN_ACTION', `Unknown action type: ${action.actionType}`, 400);
    }

    // Mark as approved
    await prisma.mCPPendingAction.update({
      where: { id: action.id },
      data: {
        status: 'APPROVED',
        resolvedAt: new Date(),
      },
    });

    res.json({ success: true, message: 'Action approved and executed' });
  } catch (error) {
    next(error);
  }
});

/**
 * Reject a pending action
 */
router.post('/:id/reject', requireAuth, async (req, res, next) => {
  try {
    const action = await prisma.mCPPendingAction.findFirst({
      where: {
        id: req.params.id,
        userId: req.user!.id,
        status: 'PENDING',
      },
    });

    if (!action) {
      throw new AppError('ACTION_NOT_FOUND', 'Pending action not found', 404);
    }

    await prisma.mCPPendingAction.update({
      where: { id: action.id },
      data: {
        status: 'REJECTED',
        resolvedAt: new Date(),
      },
    });

    res.json({ success: true, message: 'Action rejected' });
  } catch (error) {
    next(error);
  }
});

export default router;
```

---

## Phase 4: Testing & Documentation

### Step 4.1: MCP Service Tests

**Files**:

- `apps/api/src/services/mcp-auth.service.test.ts` — Unit tests for MCP auth

**Implementation**:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as mcpAuthService from './mcp-auth.service';

// Mock prisma
vi.mock('../lib/prisma', () => ({
  prisma: {
    mCPClient: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    mCPSession: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

describe('MCP Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerClient', () => {
    it('should create client with hashed secret', async () => {
      // Test implementation
    });
  });

  describe('validateClient', () => {
    it('should return null for invalid client ID', async () => {
      // Test implementation
    });

    it('should return null for invalid secret', async () => {
      // Test implementation
    });
  });

  describe('exchangeCodeForTokens', () => {
    it('should exchange valid code for tokens', async () => {
      // Test implementation
    });

    it('should reject expired code', async () => {
      // Test implementation
    });
  });
});
```

---

### Step 4.2: MCP Documentation

**Files**:

- `docs/mcp-integration.md` — Setup guide for connecting Claude Desktop

**Implementation**:

````markdown
# Connecting Claude Desktop to Social Planner

This guide explains how to connect Claude Desktop (or other MCP-compatible AI assistants) to Social Planner for AI-assisted content creation and scheduling.

## Prerequisites

- Social Planner account with EDITOR or ADMIN role
- Claude Desktop installed (or another MCP-compatible client)

## Step 1: Register an MCP Client

1. Log into Social Planner
2. Go to **Settings → AI Integrations**
3. Click **Register New Client**
4. Enter a name (e.g., "Claude Desktop - Work Laptop")
5. Add redirect URI: `http://localhost:3000/callback` (for Claude Desktop)
6. Select permissions:
   - **Read Posts** - View your posts and drafts
   - **Create Posts** - Create new draft posts
   - **Schedule Posts** - Schedule posts for publishing
   - **Read Channels** - View connected social accounts
7. Click **Register**
8. **IMPORTANT**: Copy the Client ID and Client Secret immediately. The secret will not be shown again.

## Step 2: Configure Claude Desktop

Add the following to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "social-planner-mcp": {
      "transport": "http",
      "url": "https://your-instance.com/api/mcp",
      "auth": {
        "type": "oauth2",
        "clientId": "YOUR_CLIENT_ID",
        "clientSecret": "YOUR_CLIENT_SECRET",
        "authorizationUrl": "https://your-instance.com/api/mcp/oauth/authorize",
        "tokenUrl": "https://your-instance.com/api/mcp/oauth/token",
        "scopes": ["read_posts", "create_posts", "schedule_posts", "read_channels"]
      }
    }
  }
}
```
````

## Step 3: Authorize Connection

1. Restart Claude Desktop
2. Claude will prompt you to authorize the Social Planner connection
3. Log in and approve the requested permissions

## Available Tools

Once connected, Claude can use these tools:

### `list_posts`

List your posts with optional filtering.

### `get_post`

Get detailed information about a specific post.

### `list_channels`

View connected social media accounts.

### `create_post`

Create a new draft post.

### `update_post`

Modify an existing draft.

### `schedule_post`

Schedule a post for publishing. This creates a **pending action** that you must approve in the web interface.

### `submit_for_approval`

Submit a draft for approval review.

## Confirmation Flow

For safety, scheduling actions require your explicit approval:

1. Claude requests to schedule a post
2. You see a "Pending AI Request" notification in Social Planner
3. Review the details and click **Approve** or **Reject**
4. Only approved actions are executed

## Revoking Access

To disconnect Claude Desktop:

1. Go to **Settings → AI Integrations**
2. Find the client and click **Revoke**
3. All active sessions will be terminated immediately

````

---

## Phase 5: Operational Cleanup Jobs

**Estimated effort**: Background job setup

### Step 5.1: MCP Cleanup Service

**Files**:
- `apps/api/src/services/mcp-cleanup.service.ts` — Cleanup functions for expired data

**Implementation**:

```typescript
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { logger } from '../lib/logger';

/**
 * Clean up expired pending actions
 * Should run hourly via scheduled job
 */
export async function cleanupExpiredPendingActions(): Promise<number> {
  const result = await prisma.mCPPendingAction.updateMany({
    where: {
      status: 'PENDING',
      expiresAt: { lt: new Date() },
    },
    data: {
      status: 'EXPIRED',
      resolvedAt: new Date(),
    },
  });

  if (result.count > 0) {
    logger.info(`Marked ${result.count} expired MCP pending actions`);
  }

  return result.count;
}

/**
 * Clean up old audit logs beyond retention period
 * Should run daily via scheduled job
 */
export async function cleanupOldAuditLogs(): Promise<number> {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - config.mcp.auditRetentionDays);

  const result = await prisma.mCPAuditLog.deleteMany({
    where: {
      createdAt: { lt: cutoff },
    },
  });

  if (result.count > 0) {
    logger.info(`Deleted ${result.count} old MCP audit logs (retention: ${config.mcp.auditRetentionDays} days)`);
  }

  return result.count;
}

/**
 * Clean up revoked/expired sessions
 * Should run daily via scheduled job
 */
export async function cleanupExpiredSessions(): Promise<number> {
  const result = await prisma.mCPSession.deleteMany({
    where: {
      OR: [
        { revokedAt: { not: null } },
        { refreshExpiresAt: { lt: new Date() } },
      ],
    },
  });

  if (result.count > 0) {
    logger.info(`Deleted ${result.count} expired/revoked MCP sessions`);
  }

  return result.count;
}
````

---

### Step 5.2: BullMQ Job Registration (If Using Worker)

**Files**:

- `apps/worker/src/jobs/mcp-cleanup.job.ts` — BullMQ job definition

**Implementation**:

```typescript
import { Job } from 'bullmq';
import {
  cleanupExpiredPendingActions,
  cleanupOldAuditLogs,
  cleanupExpiredSessions,
} from '@social-planner/api/services/mcp-cleanup.service';
import { logger } from '../lib/logger';

export const MCP_CLEANUP_JOB = 'mcp:cleanup';

export async function processMCPCleanup(job: Job): Promise<void> {
  logger.info('Starting MCP cleanup job');

  const [expired, audits, sessions] = await Promise.all([
    cleanupExpiredPendingActions(),
    cleanupOldAuditLogs(),
    cleanupExpiredSessions(),
  ]);

  logger.info('MCP cleanup complete', {
    expiredActions: expired,
    deletedAuditLogs: audits,
    deletedSessions: sessions,
  });
}
```

**Files**:

- `apps/worker/src/index.ts` — Register job with scheduler

**Implementation**:

```typescript
import { Queue, Worker } from 'bullmq';
import { MCP_CLEANUP_JOB, processMCPCleanup } from './jobs/mcp-cleanup.job';

// Add to existing queue setup
const mcpQueue = new Queue('mcp', { connection: redisConnection });

// Schedule cleanup job (run every hour)
await mcpQueue.add(
  MCP_CLEANUP_JOB,
  {},
  {
    repeat: {
      pattern: '0 * * * *', // Every hour at minute 0
    },
    removeOnComplete: 100,
    removeOnFail: 50,
  }
);

// Add worker
const mcpWorker = new Worker(
  'mcp',
  async (job) => {
    if (job.name === MCP_CLEANUP_JOB) {
      await processMCPCleanup(job);
    }
  },
  { connection: redisConnection }
);
```

---

### Step 5.3: Alternative - Express Cron (If No Worker)

If `apps/worker` is not yet implemented, add cleanup as cron job in the API:

**Files**:

- `apps/api/src/jobs/mcp-cleanup.cron.ts` — Cron-based cleanup

**Implementation**:

```typescript
import cron from 'node-cron';
import {
  cleanupExpiredPendingActions,
  cleanupOldAuditLogs,
  cleanupExpiredSessions,
} from '../services/mcp-cleanup.service';
import { logger } from '../lib/logger';
import { config } from '../config';

export function scheduleMCPCleanupJobs(): void {
  if (!config.mcp.enabled) {
    return;
  }

  // Run every hour - mark expired pending actions
  cron.schedule('0 * * * *', async () => {
    try {
      await cleanupExpiredPendingActions();
    } catch (error) {
      logger.error('MCP pending actions cleanup failed', { error });
    }
  });

  // Run daily at 3 AM - cleanup old audit logs and sessions
  cron.schedule('0 3 * * *', async () => {
    try {
      await Promise.all([cleanupOldAuditLogs(), cleanupExpiredSessions()]);
    } catch (error) {
      logger.error('MCP daily cleanup failed', { error });
    }
  });

  logger.info('MCP cleanup jobs scheduled');
}
```

**Files**:

- `apps/api/src/server.ts` — Initialize cron jobs on startup

**Implementation**:

```typescript
import { scheduleMCPCleanupJobs } from './jobs/mcp-cleanup.cron';

// After app setup, before listen
scheduleMCPCleanupJobs();
```

**Dependencies**:

```bash
npm install node-cron -w apps/api
npm install -D @types/node-cron -w apps/api
```

**Notes**:

- BullMQ approach is preferred for production (resilient, distributed)
- Cron approach is simpler for single-instance deployments
- Both ensure expired actions don't accumulate and audit logs are pruned

---

## Migration Checklist

### Database & Schema

- [ ] Run database migration: `npm run db:migrate -- --name add_mcp_models`
- [ ] Add `mcpClients MCPClient[]` relation to User model in schema.prisma

### Environment Variables

- [ ] Add to `.env`:
  ```
  MCP_ENABLED=true
  MCP_ACCESS_TOKEN_EXPIRES_IN=1h
  MCP_REFRESH_TOKEN_EXPIRES_IN=30d
  MCP_PENDING_ACTION_EXPIRES_IN=24h
  MCP_RATE_LIMIT_REQUESTS=100
  MCP_AUDIT_RETENTION_DAYS=90
  ```

### Dependencies

- [x] Install MCP SDK: `npm install @modelcontextprotocol/sdk@latest -w apps/api` _(installed v1.25.2)_
- [ ] Install cron (if using cron approach): `npm install node-cron -w apps/api && npm install -D @types/node-cron -w apps/api`

### Shared Package

- [ ] Create `packages/shared/src/types/mcp.ts` with types
- [ ] Create `packages/shared/src/validation/mcp.schemas.ts` with Zod schemas
- [ ] Add exports to `packages/shared/src/types/index.ts`
- [ ] Add exports to `packages/shared/src/validation/index.ts`
- [ ] Build shared package: `npm run build -w packages/shared`

### API Service Layer

- [ ] Create `apps/api/src/services/mcp-auth.service.ts`
- [ ] Create `apps/api/src/services/mcp-tools.service.ts`
- [ ] Create `apps/api/src/services/mcp-audit.service.ts`
- [ ] Create `apps/api/src/services/mcp-cleanup.service.ts`
- [ ] Create `apps/api/src/middleware/mcp-auth.ts`

### API Routes

- [ ] Create `apps/api/src/routes/mcp.ts`
- [ ] Create `apps/api/src/routes/mcp-auth.ts`
- [ ] Create `apps/api/src/routes/mcp-pending-actions.ts`
- [ ] Export all routes in `apps/api/src/routes/index.ts`
- [ ] Register routes in `apps/api/src/app.ts`

### Cleanup Jobs

- [ ] Create `apps/api/src/jobs/mcp-cleanup.cron.ts` (or BullMQ job)
- [ ] Initialize cleanup jobs in `apps/api/src/server.ts`

### Frontend

- [ ] Create `apps/web/src/pages/SettingsMCP.tsx`
- [ ] Create `apps/web/src/components/mcp/PendingActions.tsx`
- [ ] Create `apps/web/src/hooks/useMCP.ts`
- [ ] Add MCP Settings to navigation/routing

### Testing & Verification

- [ ] Build all packages: `npm run build`
- [ ] Run tests: `npm run test`
- [ ] Run lint: `npm run lint`
- [ ] Manual test: Register client, authorize, make tool calls

### Deployment

- [ ] Deploy API with new routes
- [ ] Verify cleanup jobs are running (check logs)

## Security Considerations

1. **Token Security**
   - Access tokens expire in 1 hour (configurable)
   - Refresh tokens expire in 30 days
   - Client secrets are bcrypt-hashed
   - All tokens are opaque (not JWTs) for revocability

2. **Scope Enforcement**
   - Tools only available if client has required scopes
   - Scopes validated on every request

3. **Confirmation Flow**
   - Destructive actions (scheduling, publishing) require user approval
   - Pending actions expire in 24 hours
   - Users can see which AI client made each request

4. **Audit Trail**
   - Every tool invocation logged with timestamp, parameters, result
   - Audit logs retained for 90 days (configurable)
   - Users can view audit history in settings

## Open Questions

1. **Multi-instance session storage**: Current implementation uses in-memory MCP session storage (`transports` Map). For production with multiple API instances behind a load balancer, MCP sessions should be stored in Redis. This requires:
   - Serializing transport state to Redis
   - Implementing session recovery on different instances
   - Consider using sticky sessions as simpler alternative

2. **PKCE support**: Consider adding PKCE (Proof Key for Code Exchange) for enhanced OAuth security. This is especially important for:
   - Public clients (mobile apps, SPAs)
   - Claude Desktop (which may not securely store client secrets)
   - Implementation: Add `code_verifier`/`code_challenge` to authorization flow

3. **Per-client rate limiting**: Current implementation uses global rate limiter. Consider per-client rate limits:
   - Track request counts per `clientId` in Redis
   - Different limits for read vs write operations
   - Return `429 Too Many Requests` with `Retry-After` header

4. **Real-time notifications**: When pending action is created, consider notifying the web app in real-time:
   - Option A: WebSocket push to connected clients
   - Option B: Server-Sent Events for pending action updates
   - Option C: Keep current polling approach (30s interval)

5. **Batch operations**: MCP SDK supports batch tool calls. Current handlers process one request at a time. For batch support:
   - Wrap handlers to accept arrays
   - Implement transactional batching for related operations
   - Consider rate limiting implications

## Resolved Items

The following concerns from initial review have been addressed:

- **Client ID format**: Updated validation to use `mcpClientIdSchema` (base64url, not UUID)
- **Write access control**: Added `canModifyPost()` checks to all write handlers with user role awareness
- **Read access control**: Added role-based filtering to `list_posts` and `get_post` (VIEWERs restricted to published posts or posts where assigned as collaborator)
- **list_channels access**: Documented as intentionally workspace-scoped (all users can see channels in single-workspace mode)
- **ToolContext propagation**: Fixed `createMcpServer` to build and pass full `ToolContext` (userId, userRole, clientId) to handlers
- **MCPScope import**: Added missing `type MCPScope` import to mcp.schemas.ts
- **Scope validation**: `mcpAuthorizationSchema` now validates scopes against `MCPScope` enum with proper error messages
- **ToolContext export**: Added `export` to `ToolContext` interface and imported in mcp.ts route
- **Route registration**: Added `mcp-pending-actions` route to exports and app registration
- **API path documentation**: Added note to hooks clarifying baseURL assumption
- **Shared exports**: Added Step 1.3b documenting barrel export requirements
- **Cleanup jobs**: Added Phase 5 with BullMQ and cron-based cleanup implementations

---

## Version History

- **v1.0** - Initial implementation with core tools and OAuth flow
