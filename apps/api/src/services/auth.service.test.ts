/**
 * Auth Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Note: config module is mocked in setup.ts

// Mock bcrypt
vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

// Mock auth middleware
vi.mock('../middleware/auth', () => ({
  generateAccessToken: vi.fn(() => 'mock-access-token'),
  generateRefreshToken: vi.fn(() => 'mock-refresh-token'),
  verifyRefreshToken: vi.fn(),
}));

// Import modules after mocks
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';
import { redis } from '../lib/redis';
import {
  registerUser,
  loginUser,
} from './auth.service';

// Get mocked modules
const mockPrisma = vi.mocked(prisma);
const mockRedis = vi.mocked(redis);
const mockBcrypt = vi.mocked(bcrypt);

describe('Auth Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerUser', () => {
    const validEmail = 'test@example.com';
    const validPassword = 'SecurePassword123!';
    const validFullName = 'Test User';

    it('should register a new user successfully', async () => {
      // Mock no existing user
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Mock password hashing
      mockBcrypt.hash.mockResolvedValue('hashed-password' as never);

      // Mock user creation
      const mockUser = {
        id: 'user-123',
        email: validEmail.toLowerCase(),
        fullName: validFullName,
        avatarUrl: null,
        timezone: 'Europe/Amsterdam',
        role: 'EDITOR',
      };
      mockPrisma.user.create.mockResolvedValue(mockUser as never);

      // Mock redis session storage
      mockRedis.setex.mockResolvedValue('OK' as never);

      const result = await registerUser(validEmail, validPassword, validFullName);

      // Check user data is returned correctly
      expect(result.user.email).toBe(validEmail.toLowerCase());
      expect(result.user.fullName).toBe(validFullName);
      expect(result.user.role).toBe('EDITOR');
      // Check tokens are returned (values depend on actual middleware)
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw error if email already exists', async () => {
      // Mock existing user
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'existing-user',
        email: validEmail.toLowerCase(),
      } as never);

      await expect(
        registerUser(validEmail, validPassword, validFullName)
      ).rejects.toThrow('An account with this email already exists');
    });

    it('should normalize email to lowercase', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('hashed-password' as never);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-123',
        email: 'test@example.com',
        fullName: validFullName,
        avatarUrl: null,
        timezone: 'Europe/Amsterdam',
        role: 'EDITOR',
      } as never);
      mockRedis.setex.mockResolvedValue('OK' as never);

      await registerUser('TEST@EXAMPLE.COM', validPassword, validFullName);

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'test@example.com' },
      });
    });

    it('should hash password with bcrypt', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockBcrypt.hash.mockResolvedValue('hashed-password' as never);
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-123',
        email: validEmail,
        fullName: validFullName,
        avatarUrl: null,
        timezone: 'Europe/Amsterdam',
        role: 'EDITOR',
      } as never);
      mockRedis.setex.mockResolvedValue('OK' as never);

      await registerUser(validEmail, validPassword, validFullName);

      expect(mockBcrypt.hash).toHaveBeenCalledWith(validPassword, 12);
    });
  });

  describe('loginUser', () => {
    const validEmail = 'test@example.com';
    const validPassword = 'SecurePassword123!';

    it('should login user with valid credentials', async () => {
      const mockUser = {
        id: 'user-123',
        email: validEmail,
        fullName: 'Test User',
        avatarUrl: null,
        timezone: 'Europe/Amsterdam',
        role: 'EDITOR',
        passwordHash: 'hashed-password',
        authProvider: 'LOCAL',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as never);
      mockBcrypt.compare.mockResolvedValue(true as never);
      mockRedis.setex.mockResolvedValue('OK' as never);

      const result = await loginUser(validEmail, validPassword);

      // Check user data is returned correctly
      expect(result.user.id).toBe('user-123');
      expect(result.user.email).toBe(validEmail);
      // Check tokens are returned
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw error if user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      await expect(
        loginUser(validEmail, validPassword)
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error if password is incorrect', async () => {
      const mockUser = {
        id: 'user-123',
        email: validEmail,
        passwordHash: 'hashed-password',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as never);
      mockBcrypt.compare.mockResolvedValue(false as never);

      await expect(
        loginUser(validEmail, validPassword)
      ).rejects.toThrow('Invalid email or password');
    });

    it('should throw error if user has no password (OAuth only)', async () => {
      const mockUser = {
        id: 'user-123',
        email: validEmail,
        passwordHash: null,
        authProvider: 'GOOGLE',
      };

      mockPrisma.user.findUnique.mockResolvedValue(mockUser as never);

      await expect(
        loginUser(validEmail, validPassword)
      ).rejects.toThrow('This account uses GOOGLE login');
    });

    it('should normalize email to lowercase when searching', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      // Call login and let it throw - we only care about checking the findUnique call
      await expect(loginUser('TEST@EXAMPLE.COM', validPassword)).rejects.toThrow();

      expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { email: 'test@example.com' },
        })
      );
    });
  });
});
