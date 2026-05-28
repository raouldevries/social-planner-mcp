/**
 * Vitest Test Setup
 *
 * Global test configuration and mocks for API tests.
 */

import { vi, afterEach } from 'vitest';

// Mock environment variables before anything else
process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test';
process.env.JWT_ACCESS_SECRET = 'test-jwt-access-secret-key-for-testing';
process.env.JWT_REFRESH_SECRET = 'test-jwt-refresh-secret-key-for-testing';
process.env.S3_ACCESS_KEY = 'test-s3-access-key';
process.env.S3_SECRET_KEY = 'test-s3-secret-key';
process.env.S3_BUCKET = 'test-bucket';
process.env.S3_REGION = 'us-east-1';
process.env.S3_ENDPOINT = 'http://localhost:9000';
process.env.REDIS_URL = 'redis://localhost:6379';

// Mock config module
vi.mock('../config', () => ({
  config: {
    env: 'test',
    port: 3000,
    database: {
      url: 'postgresql://test:test@localhost:5432/test',
    },
    jwt: {
      accessSecret: 'test-jwt-access-secret',
      refreshSecret: 'test-jwt-refresh-secret',
      accessExpiresIn: '15m',
      refreshExpiresIn: '7d',
    },
    redis: {
      url: 'redis://localhost:6379',
    },
    s3: {
      accessKey: 'test-access-key',
      secretKey: 'test-secret-key',
      bucket: 'test-bucket',
      region: 'us-east-1',
      endpoint: 'http://localhost:9000',
    },
    cors: {
      origins: ['http://localhost:5173'],
    },
    JWT_ACCESS_SECRET: 'test-jwt-access-secret',
    JWT_REFRESH_SECRET: 'test-jwt-refresh-secret',
    MCP_ENABLED: true,
    MCP_ACCESS_TOKEN_EXPIRES_IN: '1h',
    MCP_REFRESH_TOKEN_EXPIRES_IN: '30d',
    MCP_PENDING_ACTION_EXPIRES_IN: '24h',
  },
}));

// Mock Prisma client
vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    post: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    article: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    activityLog: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    refreshToken: {
      findFirst: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    mCPClient: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    mCPSession: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
    mCPPendingAction: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    mCPAuditLog: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
    },
    feedback: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    feedbackReply: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
    notification: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
      deleteMany: vi.fn(),
      count: vi.fn(),
    },
    $transaction: vi.fn((callback) =>
      callback({
        user: {
          findUnique: vi.fn(),
          create: vi.fn(),
          update: vi.fn(),
        },
        refreshToken: {
          create: vi.fn(),
          delete: vi.fn(),
        },
      })
    ),
  },
}));

// Mock Redis client
vi.mock('../lib/redis', () => ({
  redis: {
    get: vi.fn(),
    set: vi.fn(),
    del: vi.fn(),
    setex: vi.fn(),
    incr: vi.fn(),
    expire: vi.fn(),
  },
}));

// Mock logger
vi.mock('../lib/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    child: vi.fn(() => ({
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    })),
  },
}));

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});
