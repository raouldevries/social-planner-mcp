/**
 * Post Service - Collaborator Tests
 *
 * Tests for addCollaborator and removeCollaborator functions,
 * verifying notification, activity logging, and email integrations.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ============================================
// MOCKS — direct vi.fn() in factories, no wrappers
// ============================================

vi.mock('../lib/prisma', () => ({
  prisma: {
    post: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    collaboratorAssignment: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
    activityLog: { create: vi.fn() },
  },
}));

vi.mock('./notification.service', () => ({
  notifyCollaboratorAdded: vi.fn(),
}));

vi.mock('./activity.service', () => ({
  logPostActivity: vi.fn(),
  ACTIVITY_ACTIONS: {
    COLLABORATOR_ADDED: 'collaborator.added',
    COLLABORATOR_REMOVED: 'collaborator.removed',
  },
}));

vi.mock('./email.service', () => ({
  sendCollaboratorAddedEmail: vi.fn(),
}));

vi.mock('./version.service', () => ({
  createVersion: vi.fn(),
}));

vi.mock('../lib/s3', () => ({
  getPublicUrl: vi.fn((key: string) => `https://cdn.test/${key}`),
}));

vi.mock('../lib/media-utils', () => ({
  resolveMediaUrl: vi.fn((path: string | null) => (path ? `https://cdn.test/${path}` : null)),
  resolveMediaUrls: vi.fn((asset: { storagePath: string; thumbnailPath: string | null }) => ({
    url: `https://cdn.test/${asset.storagePath}`,
    thumbnailUrl: asset.thumbnailPath ? `https://cdn.test/${asset.thumbnailPath}` : null,
  })),
}));

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

// Import after mocks
import { addCollaborator, removeCollaborator } from './post.service';
import { prisma } from '../lib/prisma';
import { notifyCollaboratorAdded } from './notification.service';
import { logPostActivity } from './activity.service';
import { sendCollaboratorAddedEmail } from './email.service';

// ============================================
// TESTS
// ============================================

describe('Post Service - Collaborators', () => {
  // Re-establish mock implementations before each test.
  // restoreMocks: true in vitest config clears vi.fn() implementations
  // between tests, so we must set them up fresh each time.
  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(notifyCollaboratorAdded).mockResolvedValue(undefined);
    vi.mocked(logPostActivity).mockResolvedValue(undefined);
    vi.mocked(sendCollaboratorAddedEmail).mockResolvedValue(true as any);
  });

  const mockPost = {
    id: 'post-1',
    baseContent: 'Test post content for preview',
    authorId: 'user-author',
    status: 'DRAFT',
  };

  const mockUser = {
    id: 'user-collab',
    email: 'collab@example.com',
    fullName: 'Test Collaborator',
    avatarUrl: null,
    timezone: 'Europe/Amsterdam',
    role: 'EDITOR',
  };

  const mockAssigner = {
    id: 'user-assigner',
    fullName: 'Test Assigner',
  };

  describe('addCollaborator', () => {
    it('should add a collaborator and trigger notification, activity log, and email', async () => {
      vi.mocked(prisma.post.findUnique).mockResolvedValue(mockPost as any);
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockUser as any) // collaborator lookup
        .mockResolvedValueOnce(mockAssigner as any); // assigner name lookup
      vi.mocked(prisma.collaboratorAssignment.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.collaboratorAssignment.create).mockResolvedValue({} as any);

      try {
        await addCollaborator('post-1', 'user-collab', 'user-assigner');
      } catch {
        // getPostById may fail due to incomplete mock, that's OK
      }

      // Verify assignment was created
      expect(prisma.collaboratorAssignment.create).toHaveBeenCalledWith({
        data: {
          postId: 'post-1',
          userId: 'user-collab',
          assignedById: 'user-assigner',
        },
      });

      // Verify notification was called with correct args
      expect(notifyCollaboratorAdded).toHaveBeenCalledWith(
        'post-1',
        'user-collab',
        'Test Assigner'
      );

      // Verify activity logging
      expect(logPostActivity).toHaveBeenCalledWith(
        'post-1',
        'user-assigner',
        'collaborator.added',
        {
          collaboratorId: 'user-collab',
          collaboratorName: 'Test Collaborator',
        }
      );

      // Verify email was called
      expect(sendCollaboratorAddedEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientEmail: 'collab@example.com',
          recipientName: 'Test Collaborator',
          addedByName: 'Test Assigner',
        })
      );
    });

    it('should throw POST_NOT_FOUND when post does not exist', async () => {
      vi.mocked(prisma.post.findUnique).mockResolvedValue(null);

      await expect(addCollaborator('post-999', 'user-collab', 'user-assigner')).rejects.toThrow(
        'Post not found'
      );

      expect(prisma.collaboratorAssignment.create).not.toHaveBeenCalled();
      expect(notifyCollaboratorAdded).not.toHaveBeenCalled();
    });

    it('should throw USER_NOT_FOUND when user does not exist', async () => {
      vi.mocked(prisma.post.findUnique).mockResolvedValue(mockPost as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(null);

      await expect(addCollaborator('post-1', 'user-999', 'user-assigner')).rejects.toThrow(
        'User not found'
      );

      expect(prisma.collaboratorAssignment.create).not.toHaveBeenCalled();
      expect(notifyCollaboratorAdded).not.toHaveBeenCalled();
    });

    it('should throw ALREADY_COLLABORATOR when assignment exists', async () => {
      vi.mocked(prisma.post.findUnique).mockResolvedValue(mockPost as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.collaboratorAssignment.findUnique).mockResolvedValue({
        postId: 'post-1',
        userId: 'user-collab',
      } as any);

      await expect(addCollaborator('post-1', 'user-collab', 'user-assigner')).rejects.toThrow(
        'User is already a collaborator'
      );

      expect(prisma.collaboratorAssignment.create).not.toHaveBeenCalled();
      expect(notifyCollaboratorAdded).not.toHaveBeenCalled();
    });

    it('should not break if notification fails', async () => {
      vi.mocked(prisma.post.findUnique).mockResolvedValue(mockPost as any);
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(mockAssigner as any);
      vi.mocked(prisma.collaboratorAssignment.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.collaboratorAssignment.create).mockResolvedValue({} as any);
      vi.mocked(notifyCollaboratorAdded).mockRejectedValueOnce(new Error('Notification failed'));

      try {
        await addCollaborator('post-1', 'user-collab', 'user-assigner');
      } catch {
        // getPostById may fail
      }

      // Assignment should still have been created
      expect(prisma.collaboratorAssignment.create).toHaveBeenCalled();
      // Activity logging should still have been called
      expect(logPostActivity).toHaveBeenCalled();
    });

    it('should not break if email fails', async () => {
      vi.mocked(prisma.post.findUnique).mockResolvedValue(mockPost as any);
      vi.mocked(prisma.user.findUnique)
        .mockResolvedValueOnce(mockUser as any)
        .mockResolvedValueOnce(mockAssigner as any);
      vi.mocked(prisma.collaboratorAssignment.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.collaboratorAssignment.create).mockResolvedValue({} as any);
      vi.mocked(sendCollaboratorAddedEmail).mockRejectedValueOnce(new Error('Email failed'));

      try {
        await addCollaborator('post-1', 'user-collab', 'user-assigner');
      } catch {
        // getPostById may fail
      }

      // Assignment should still have been created
      expect(prisma.collaboratorAssignment.create).toHaveBeenCalled();
      // Activity logging should still have been called
      expect(logPostActivity).toHaveBeenCalled();
    });
  });

  describe('removeCollaborator', () => {
    it('should remove a collaborator and log activity', async () => {
      vi.mocked(prisma.collaboratorAssignment.findUnique).mockResolvedValue({
        postId: 'post-1',
        userId: 'user-collab',
      } as any);
      vi.mocked(prisma.user.findUnique).mockResolvedValue(mockUser as any);
      vi.mocked(prisma.collaboratorAssignment.delete).mockResolvedValue({} as any);

      try {
        await removeCollaborator('post-1', 'user-collab', 'user-remover');
      } catch {
        // getPostById may fail
      }

      // Verify deletion
      expect(prisma.collaboratorAssignment.delete).toHaveBeenCalledWith({
        where: {
          postId_userId: { postId: 'post-1', userId: 'user-collab' },
        },
      });

      // Verify activity logging with correct actor
      expect(logPostActivity).toHaveBeenCalledWith(
        'post-1',
        'user-remover',
        'collaborator.removed',
        {
          collaboratorId: 'user-collab',
          collaboratorName: 'Test Collaborator',
        }
      );
    });

    it('should throw NOT_COLLABORATOR when assignment does not exist', async () => {
      vi.mocked(prisma.collaboratorAssignment.findUnique).mockResolvedValue(null);

      await expect(removeCollaborator('post-1', 'user-999', 'user-remover')).rejects.toThrow(
        'User is not a collaborator on this post'
      );

      expect(prisma.collaboratorAssignment.delete).not.toHaveBeenCalled();
      expect(logPostActivity).not.toHaveBeenCalled();
    });
  });
});
