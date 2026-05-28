/**
 * MCP Auth Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

// Mock jsonwebtoken
vi.mock('jsonwebtoken', () => ({
  default: {
    sign: vi.fn(),
    verify: vi.fn(),
  },
}));

// Import modules after mocks
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import {
  registerClient,
  validateClient,
  generateAuthorizationCode,
  exchangeCodeForTokens,
  refreshAccessToken,
  validateAccessToken,
  revokeToken,
  listUserClients,
  revokeClient,
  deleteClient,
} from './mcp-auth.service';

// Get mocked modules
const mockPrisma = vi.mocked(prisma);
const mockBcrypt = vi.mocked(bcrypt);
const mockJwt = vi.mocked(jwt);

describe('MCP Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerClient', () => {
    const userId = 'user-123';
    const name = 'Claude Desktop';
    const redirectUris = ['http://localhost:3000/callback'];
    const scopes = ['read_posts', 'create_posts'] as const;

    it('should register a new MCP client with hashed secret', async () => {
      mockBcrypt.hash.mockResolvedValue('hashed-secret' as never);

      const mockClient = {
        id: 'client-uuid',
        name,
        clientId: 'random-client-id',
        scopes: ['READ_POSTS', 'CREATE_POSTS'],
        isActive: true,
        createdAt: new Date(),
        lastUsedAt: null,
      };
      mockPrisma.mCPClient.create.mockResolvedValue(mockClient as never);

      const result = await registerClient(userId, name, redirectUris, [...scopes]);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(expect.any(String), 12);
      expect(mockPrisma.mCPClient.create).toHaveBeenCalled();
      expect(result.client.name).toBe(name);
      expect(result.credentials).toHaveProperty('clientId');
      expect(result.credentials).toHaveProperty('clientSecret');
    });

    it('should convert scopes to uppercase for storage', async () => {
      mockBcrypt.hash.mockResolvedValue('hashed-secret' as never);

      const mockClient = {
        id: 'client-uuid',
        name,
        clientId: 'random-client-id',
        scopes: ['READ_POSTS', 'CREATE_POSTS'],
        isActive: true,
        createdAt: new Date(),
        lastUsedAt: null,
      };
      mockPrisma.mCPClient.create.mockResolvedValue(mockClient as never);

      await registerClient(userId, name, redirectUris, [...scopes]);

      expect(mockPrisma.mCPClient.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scopes: ['READ_POSTS', 'CREATE_POSTS'],
          }),
        })
      );
    });
  });

  describe('validateClient', () => {
    const clientId = 'test-client-id';
    const clientSecret = 'test-secret';

    it('should return null for non-existent client', async () => {
      mockPrisma.mCPClient.findUnique.mockResolvedValue(null);

      const result = await validateClient(clientId, clientSecret);

      expect(result).toBeNull();
    });

    it('should return null for inactive client', async () => {
      mockPrisma.mCPClient.findUnique.mockResolvedValue({
        id: 'uuid',
        clientId,
        clientSecret: 'hashed',
        isActive: false,
        user: { id: 'user-123' },
      } as never);

      const result = await validateClient(clientId, clientSecret);

      expect(result).toBeNull();
    });

    it('should return null for invalid secret', async () => {
      mockPrisma.mCPClient.findUnique.mockResolvedValue({
        id: 'uuid',
        clientId,
        clientSecret: 'hashed',
        isActive: true,
        user: { id: 'user-123' },
      } as never);
      mockBcrypt.compare.mockResolvedValue(false as never);

      const result = await validateClient(clientId, clientSecret);

      expect(result).toBeNull();
    });

    it('should return client and user for valid credentials', async () => {
      const mockClient = {
        id: 'uuid',
        clientId,
        clientSecret: 'hashed',
        isActive: true,
        user: { id: 'user-123', email: 'test@example.com' },
      };
      mockPrisma.mCPClient.findUnique.mockResolvedValue(mockClient as never);
      mockBcrypt.compare.mockResolvedValue(true as never);

      const result = await validateClient(clientId, clientSecret);

      expect(result).not.toBeNull();
      expect(result?.client).toEqual(mockClient);
      expect(result?.user).toEqual(mockClient.user);
    });
  });

  describe('generateAuthorizationCode', () => {
    const clientId = 'test-client-id';
    const userId = 'user-123';
    const scopes = ['read_posts'] as const;
    const redirectUri = 'http://localhost:3000/callback';

    it('should throw error for non-existent client', async () => {
      mockPrisma.mCPClient.findUnique.mockResolvedValue(null);

      await expect(
        generateAuthorizationCode(clientId, userId, [...scopes], redirectUri)
      ).rejects.toThrow('Client not found');
    });

    it('should throw error for wrong user', async () => {
      mockPrisma.mCPClient.findUnique.mockResolvedValue({
        clientId,
        userId: 'different-user',
        redirectUris: [redirectUri],
        scopes: ['READ_POSTS'],
      } as never);

      await expect(
        generateAuthorizationCode(clientId, userId, [...scopes], redirectUri)
      ).rejects.toThrow('Client not found');
    });

    it('should throw error for unregistered redirect URI', async () => {
      mockPrisma.mCPClient.findUnique.mockResolvedValue({
        clientId,
        userId,
        redirectUris: ['http://other.com/callback'],
        scopes: ['READ_POSTS'],
      } as never);

      await expect(
        generateAuthorizationCode(clientId, userId, [...scopes], redirectUri)
      ).rejects.toThrow('Redirect URI not registered');
    });

    it('should throw error for unauthorized scopes', async () => {
      mockPrisma.mCPClient.findUnique.mockResolvedValue({
        clientId,
        userId,
        redirectUris: [redirectUri],
        scopes: ['READ_CHANNELS'], // Different scope
      } as never);

      await expect(
        generateAuthorizationCode(clientId, userId, [...scopes], redirectUri)
      ).rejects.toThrow('Scopes not authorized');
    });

    it('should generate JWT authorization code', async () => {
      mockPrisma.mCPClient.findUnique.mockResolvedValue({
        clientId,
        userId,
        redirectUris: [redirectUri],
        scopes: ['READ_POSTS'],
      } as never);
      mockJwt.sign.mockReturnValue('jwt-auth-code' as never);

      const result = await generateAuthorizationCode(clientId, userId, [...scopes], redirectUri);

      expect(mockJwt.sign).toHaveBeenCalledWith(
        expect.objectContaining({
          clientId,
          userId,
          scopes: [...scopes],
          redirectUri,
          type: 'authorization_code',
        }),
        expect.any(String),
        expect.objectContaining({ expiresIn: '10m' })
      );
      expect(result).toBe('jwt-auth-code');
    });
  });

  describe('exchangeCodeForTokens', () => {
    const code = 'valid-code';
    const clientId = 'test-client-id';
    const clientSecret = 'test-secret';
    const redirectUri = 'http://localhost:3000/callback';

    it('should throw error for invalid client credentials', async () => {
      mockPrisma.mCPClient.findUnique.mockResolvedValue(null);

      await expect(
        exchangeCodeForTokens(code, clientId, clientSecret, redirectUri)
      ).rejects.toThrow('Invalid client credentials');
    });

    it('should throw error for invalid/expired code', async () => {
      // Mock valid client
      mockPrisma.mCPClient.findUnique.mockResolvedValue({
        id: 'uuid',
        clientId,
        clientSecret: 'hashed',
        isActive: true,
        user: { id: 'user-123' },
      } as never);
      mockBcrypt.compare.mockResolvedValue(true as never);

      // Mock JWT verify throws error
      mockJwt.verify.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await expect(
        exchangeCodeForTokens(code, clientId, clientSecret, redirectUri)
      ).rejects.toThrow('Authorization code invalid or expired');
    });

    it('should throw error for client ID mismatch', async () => {
      mockPrisma.mCPClient.findUnique.mockResolvedValue({
        id: 'uuid',
        clientId,
        clientSecret: 'hashed',
        isActive: true,
        user: { id: 'user-123' },
      } as never);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockJwt.verify.mockReturnValue({
        clientId: 'different-client',
        userId: 'user-123',
        scopes: ['read_posts'],
        redirectUri,
        type: 'authorization_code',
      } as never);

      await expect(
        exchangeCodeForTokens(code, clientId, clientSecret, redirectUri)
      ).rejects.toThrow('Authorization code mismatch');
    });

    it('should throw error for redirect URI mismatch', async () => {
      mockPrisma.mCPClient.findUnique.mockResolvedValue({
        id: 'uuid',
        clientId,
        clientSecret: 'hashed',
        isActive: true,
        user: { id: 'user-123' },
      } as never);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockJwt.verify.mockReturnValue({
        clientId,
        userId: 'user-123',
        scopes: ['read_posts'],
        redirectUri: 'http://other.com/callback',
        type: 'authorization_code',
      } as never);

      await expect(
        exchangeCodeForTokens(code, clientId, clientSecret, redirectUri)
      ).rejects.toThrow('Redirect URI mismatch');
    });

    it('should create session and return tokens for valid code', async () => {
      mockPrisma.mCPClient.findUnique.mockResolvedValue({
        id: 'client-uuid',
        clientId,
        clientSecret: 'hashed',
        isActive: true,
        user: { id: 'user-123' },
      } as never);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockJwt.verify.mockReturnValue({
        clientId,
        userId: 'user-123',
        scopes: ['read_posts'],
        redirectUri,
        type: 'authorization_code',
      } as never);
      mockPrisma.mCPSession.create.mockResolvedValue({} as never);
      mockPrisma.mCPClient.update.mockResolvedValue({} as never);

      const result = await exchangeCodeForTokens(code, clientId, clientSecret, redirectUri);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result).toHaveProperty('tokenType', 'Bearer');
      expect(result).toHaveProperty('expiresIn');
      expect(result).toHaveProperty('scope');
    });
  });

  describe('refreshAccessToken', () => {
    const refreshTokenValue = 'valid-refresh-token';
    const clientId = 'test-client-id';
    const clientSecret = 'test-secret';

    it('should throw error for invalid client credentials', async () => {
      mockPrisma.mCPClient.findUnique.mockResolvedValue(null);

      await expect(refreshAccessToken(refreshTokenValue, clientId, clientSecret)).rejects.toThrow(
        'Invalid client credentials'
      );
    });

    it('should throw error for invalid refresh token', async () => {
      mockPrisma.mCPClient.findUnique.mockResolvedValue({
        id: 'uuid',
        clientId,
        clientSecret: 'hashed',
        isActive: true,
        user: { id: 'user-123' },
      } as never);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockPrisma.mCPSession.findUnique.mockResolvedValue(null);

      await expect(refreshAccessToken(refreshTokenValue, clientId, clientSecret)).rejects.toThrow(
        'Refresh token invalid'
      );
    });

    it('should throw error for revoked token', async () => {
      mockPrisma.mCPClient.findUnique.mockResolvedValue({
        id: 'uuid',
        clientId,
        clientSecret: 'hashed',
        isActive: true,
        user: { id: 'user-123' },
      } as never);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockPrisma.mCPSession.findUnique.mockResolvedValue({
        id: 'session-1',
        refreshToken: refreshTokenValue,
        revokedAt: new Date(),
        refreshExpiresAt: new Date(Date.now() + 86400000),
        client: { clientId },
      } as never);

      await expect(refreshAccessToken(refreshTokenValue, clientId, clientSecret)).rejects.toThrow(
        'Token has been revoked'
      );
    });

    it('should throw error for expired refresh token', async () => {
      mockPrisma.mCPClient.findUnique.mockResolvedValue({
        id: 'uuid',
        clientId,
        clientSecret: 'hashed',
        isActive: true,
        user: { id: 'user-123' },
      } as never);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockPrisma.mCPSession.findUnique.mockResolvedValue({
        id: 'session-1',
        refreshToken: refreshTokenValue,
        revokedAt: null,
        refreshExpiresAt: new Date(Date.now() - 1000),
        client: { clientId },
      } as never);

      await expect(refreshAccessToken(refreshTokenValue, clientId, clientSecret)).rejects.toThrow(
        'Refresh token expired'
      );
    });

    it('should create new session for valid refresh token', async () => {
      mockPrisma.mCPClient.findUnique.mockResolvedValue({
        id: 'uuid',
        clientId,
        clientSecret: 'hashed',
        isActive: true,
        user: { id: 'user-123' },
      } as never);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockPrisma.mCPSession.findUnique.mockResolvedValue({
        id: 'session-1',
        clientId: 'client-uuid',
        refreshToken: refreshTokenValue,
        revokedAt: null,
        refreshExpiresAt: new Date(Date.now() + 86400000),
        scopes: ['READ_POSTS'],
        client: { clientId },
      } as never);
      mockPrisma.mCPSession.update.mockResolvedValue({} as never);
      mockPrisma.mCPSession.create.mockResolvedValue({} as never);
      mockPrisma.mCPClient.update.mockResolvedValue({} as never);

      const result = await refreshAccessToken(refreshTokenValue, clientId, clientSecret);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(mockPrisma.mCPSession.update).toHaveBeenCalled(); // Old session revoked
      expect(mockPrisma.mCPSession.create).toHaveBeenCalled(); // New session created
    });
  });

  describe('validateAccessToken', () => {
    const accessToken = 'valid-access-token';

    it('should return null for non-existent token', async () => {
      mockPrisma.mCPSession.findUnique.mockResolvedValue(null);

      const result = await validateAccessToken(accessToken);

      expect(result).toBeNull();
    });

    it('should return null for revoked token', async () => {
      mockPrisma.mCPSession.findUnique.mockResolvedValue({
        accessToken,
        revokedAt: new Date(),
        expiresAt: new Date(Date.now() + 3600000),
        client: { isActive: true, user: {} },
      } as never);

      const result = await validateAccessToken(accessToken);

      expect(result).toBeNull();
    });

    it('should return null for expired token', async () => {
      mockPrisma.mCPSession.findUnique.mockResolvedValue({
        accessToken,
        revokedAt: null,
        expiresAt: new Date(Date.now() - 1000),
        client: { isActive: true, user: {} },
      } as never);

      const result = await validateAccessToken(accessToken);

      expect(result).toBeNull();
    });

    it('should return null for inactive client', async () => {
      mockPrisma.mCPSession.findUnique.mockResolvedValue({
        accessToken,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 3600000),
        client: { isActive: false, user: {} },
      } as never);

      const result = await validateAccessToken(accessToken);

      expect(result).toBeNull();
    });

    it('should return session data for valid token', async () => {
      const mockSession = {
        accessToken,
        revokedAt: null,
        expiresAt: new Date(Date.now() + 3600000),
        client: { isActive: true, user: { id: 'user-123' } },
      };
      mockPrisma.mCPSession.findUnique.mockResolvedValue(mockSession as never);

      const result = await validateAccessToken(accessToken);

      expect(result).not.toBeNull();
      expect(result?.session).toEqual(mockSession);
    });
  });

  describe('listUserClients', () => {
    const userId = 'user-123';

    it('should return empty array when no clients', async () => {
      mockPrisma.mCPClient.findMany.mockResolvedValue([]);

      const result = await listUserClients(userId);

      expect(result).toEqual([]);
    });

    it('should return clients with lowercase scopes', async () => {
      const mockClients = [
        {
          id: 'client-1',
          name: 'Claude Desktop',
          clientId: 'client-id-1',
          scopes: ['READ_POSTS', 'CREATE_POSTS'],
          isActive: true,
          createdAt: new Date(),
          lastUsedAt: new Date(),
        },
      ];
      mockPrisma.mCPClient.findMany.mockResolvedValue(mockClients as never);

      const result = await listUserClients(userId);

      expect(result).toHaveLength(1);
      expect(result[0].scopes).toEqual(['read_posts', 'create_posts']);
    });
  });

  describe('revokeClient', () => {
    const clientId = 'client-uuid';
    const userId = 'user-123';

    it('should throw error for non-existent client', async () => {
      mockPrisma.mCPClient.findFirst.mockResolvedValue(null);

      await expect(revokeClient(clientId, userId)).rejects.toThrow('Client not found');
    });

    it('should revoke all sessions and deactivate client', async () => {
      mockPrisma.mCPClient.findFirst.mockResolvedValue({
        id: clientId,
        userId,
      } as never);
      mockPrisma.mCPSession.updateMany.mockResolvedValue({ count: 2 } as never);
      mockPrisma.mCPClient.update.mockResolvedValue({} as never);

      await revokeClient(clientId, userId);

      expect(mockPrisma.mCPSession.updateMany).toHaveBeenCalledWith({
        where: { clientId, revokedAt: null },
        data: { revokedAt: expect.any(Date) },
      });
      expect(mockPrisma.mCPClient.update).toHaveBeenCalledWith({
        where: { id: clientId },
        data: { isActive: false },
      });
    });
  });

  describe('deleteClient', () => {
    const clientId = 'client-uuid';
    const userId = 'user-123';

    it('should throw error for non-existent client', async () => {
      mockPrisma.mCPClient.findFirst.mockResolvedValue(null);

      await expect(deleteClient(clientId, userId)).rejects.toThrow('Client not found');
    });

    it('should delete client permanently', async () => {
      mockPrisma.mCPClient.findFirst.mockResolvedValue({
        id: clientId,
        userId,
      } as never);
      mockPrisma.mCPClient.delete.mockResolvedValue({} as never);

      await deleteClient(clientId, userId);

      expect(mockPrisma.mCPClient.delete).toHaveBeenCalledWith({
        where: { id: clientId },
      });
    });
  });

  describe('revokeToken', () => {
    it('should revoke by access token', async () => {
      const token = 'access-token';
      mockPrisma.mCPSession.findUnique.mockResolvedValueOnce({
        id: 'session-1',
        accessToken: token,
      } as never);
      mockPrisma.mCPSession.update.mockResolvedValue({} as never);

      await revokeToken(token, 'access_token');

      expect(mockPrisma.mCPSession.findUnique).toHaveBeenCalledWith({
        where: { accessToken: token },
      });
      expect(mockPrisma.mCPSession.update).toHaveBeenCalled();
    });

    it('should revoke by refresh token when hint provided', async () => {
      const token = 'refresh-token';
      mockPrisma.mCPSession.findUnique.mockResolvedValueOnce({
        id: 'session-1',
        refreshToken: token,
      } as never);
      mockPrisma.mCPSession.update.mockResolvedValue({} as never);

      await revokeToken(token, 'refresh_token');

      expect(mockPrisma.mCPSession.findUnique).toHaveBeenCalledWith({
        where: { refreshToken: token },
      });
    });

    it('should try refresh token if access token not found', async () => {
      const token = 'unknown-token';
      mockPrisma.mCPSession.findUnique
        .mockResolvedValueOnce(null) // Access token lookup
        .mockResolvedValueOnce({ id: 'session-1' } as never); // Refresh token lookup
      mockPrisma.mCPSession.update.mockResolvedValue({} as never);

      await revokeToken(token);

      expect(mockPrisma.mCPSession.findUnique).toHaveBeenCalledTimes(2);
    });
  });
});
