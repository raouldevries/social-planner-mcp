/**
 * Auth Middleware Tests
 *
 * Covers the read-only demo guard (blockDemoWrites) and its composition into
 * requireAuth, which is the single choke point that keeps the public demo
 * account from mutating any data.
 */

import { describe, it, expect, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import express from 'express';
import passport from 'passport';
import request from 'supertest';

// The real config module calls process.exit() on missing env. Mock it locally so
// the JWT strategy and token signer share a known secret. (prisma/redis come from
// the global setup mocks.)
vi.mock('../config', () => ({
  config: {
    NODE_ENV: 'test',
    JWT_ACCESS_SECRET: 'test-access-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
  },
}));

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: { findUnique: vi.fn() },
  },
}));

import { blockDemoWrites, requireAuth, requireEditor, generateAccessToken } from './auth';
import { prisma } from '../lib/prisma';

// ---------------------------------------------------------------------------
// Unit tests: blockDemoWrites in isolation
// ---------------------------------------------------------------------------

function makeRes(): Response {
  const res = {} as Record<string, unknown>;
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as unknown as Response;
}

function run(overrides: Partial<Request> & { user?: unknown }) {
  const req = {
    method: 'GET',
    originalUrl: '/api/posts',
    user: undefined,
    ...overrides,
  } as unknown as Request;
  const res = makeRes();
  const next = vi.fn() as unknown as NextFunction;
  blockDemoWrites(req, res, next);
  return { req, res, next };
}

const demoUser = { id: 'd1', isDemo: true, role: 'VIEWER' };
const realViewer = { id: 'v1', isDemo: false, role: 'VIEWER' };

describe('blockDemoWrites', () => {
  it('blocks a demo user POST with 403 DEMO_READ_ONLY and does not call next', () => {
    const { res, next } = run({ method: 'POST', originalUrl: '/api/posts', user: demoUser });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 'DEMO_READ_ONLY' }));
    expect(next).not.toHaveBeenCalled();
  });

  it.each(['PATCH', 'PUT', 'DELETE'])('blocks a demo user %s', (method) => {
    const { res, next } = run({ method, originalUrl: '/api/comments/1', user: demoUser });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it.each(['GET', 'HEAD', 'OPTIONS'])('allows a demo user %s (read-only method)', (method) => {
    const { res, next } = run({ method, originalUrl: '/api/posts', user: demoUser });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('strips the query string before matching the path (still blocks)', () => {
    const { res, next } = run({
      method: 'POST',
      originalUrl: '/api/posts?draft=1',
      user: demoUser,
    });
    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it.each(['/api/auth/logout', '/api/auth/logout-all'])(
    'allows a demo user to call the allowlisted write %s',
    (path) => {
      const { res, next } = run({ method: 'POST', originalUrl: path, user: demoUser });
      expect(next).toHaveBeenCalledTimes(1);
      expect(res.status).not.toHaveBeenCalled();
    }
  );

  it('allows a non-demo viewer to write', () => {
    const { res, next } = run({ method: 'POST', originalUrl: '/api/posts', user: realViewer });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('does nothing when there is no authenticated user', () => {
    const { res, next } = run({ method: 'POST', originalUrl: '/api/posts', user: undefined });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Integration tests: full requireAuth pipeline (passport JWT -> demo guard)
// ---------------------------------------------------------------------------

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(passport.initialize());
  app.get('/api/posts', requireAuth, (_req, res) => {
    res.json({ ok: true });
  });
  app.post('/api/posts', requireAuth, (_req, res) => {
    res.json({ ok: true });
  });
  app.post('/api/auth/logout', requireAuth, (_req, res) => {
    res.status(204).send();
  });
  // Editor-only route — mirrors the guard the hardened content routes now use.
  app.post('/api/editor-only', requireAuth, requireEditor, (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}

const demoRecord = {
  id: 'demo-1',
  email: 'demo@planner.com',
  fullName: 'Demo User',
  avatarUrl: null,
  timezone: 'UTC',
  role: 'VIEWER',
  isDemo: true,
};
const editorRecord = { ...demoRecord, id: 'editor-1', role: 'EDITOR', isDemo: false };

describe('requireAuth (demo guard integration)', () => {
  it('rejects a demo account write with 403 DEMO_READ_ONLY', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(demoRecord as never);
    const token = generateAccessToken(demoRecord.id);

    const res = await request(buildApp())
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ baseContent: 'hack' });

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('DEMO_READ_ONLY');
  });

  it('allows a demo account to read', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(demoRecord as never);
    const token = generateAccessToken(demoRecord.id);

    const res = await request(buildApp()).get('/api/posts').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });

  it('allows a demo account to log out', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(demoRecord as never);
    const token = generateAccessToken(demoRecord.id);

    const res = await request(buildApp())
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(204);
  });

  it('allows a non-demo account to write', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(editorRecord as never);
    const token = generateAccessToken(editorRecord.id);

    const res = await request(buildApp())
      .post('/api/posts')
      .set('Authorization', `Bearer ${token}`)
      .send({ baseContent: 'real' });

    expect(res.status).toBe(200);
  });

  it('rejects an unauthenticated request with 401', async () => {
    const res = await request(buildApp()).post('/api/posts').send({});
    expect(res.status).toBe(401);
  });
});

describe('requireEditor (role guard integration)', () => {
  const viewerRecord = { ...editorRecord, id: 'viewer-2', role: 'VIEWER', isDemo: false };
  const adminRecord = { ...editorRecord, id: 'admin-2', role: 'ADMIN' };

  it('rejects a VIEWER from an editor-only route with 403 INSUFFICIENT_PERMISSIONS', async () => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(viewerRecord as never);
    const token = generateAccessToken(viewerRecord.id);

    const res = await request(buildApp())
      .post('/api/editor-only')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(403);
    expect(res.body.code).toBe('INSUFFICIENT_PERMISSIONS');
  });

  it.each([
    ['EDITOR', editorRecord],
    ['ADMIN', adminRecord],
  ])('allows an %s on an editor-only route', async (_role, record) => {
    vi.mocked(prisma.user.findUnique).mockResolvedValue(record as never);
    const token = generateAccessToken(record.id);

    const res = await request(buildApp())
      .post('/api/editor-only')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(200);
  });
});
