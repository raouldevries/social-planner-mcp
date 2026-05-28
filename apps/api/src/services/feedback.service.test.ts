/**
 * Feedback Service Tests — Reply CRUD
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock notification service
vi.mock('./notification.service', () => ({
  createNotification: vi.fn(),
  notifyAdmins: vi.fn(),
}));

// Mock email service
vi.mock('./email.service', () => ({
  sendEmail: vi.fn().mockResolvedValue(true),
  sendFeedbackReplyEmail: vi.fn().mockResolvedValue(true),
}));

// Mock S3
vi.mock('../lib/s3', () => ({
  uploadFile: vi.fn(),
  getPublicUrl: vi.fn(() => 'https://s3.example.com/test.png'),
}));

import { prisma } from '../lib/prisma';
import * as notificationService from './notification.service';
import * as emailService from './email.service';
import {
  getFeedbackReplies,
  createFeedbackReply,
  deleteFeedbackReply,
  getFeedbacks,
} from './feedback.service';

const mockPrisma = vi.mocked(prisma);
const mockNotify = vi.mocked(notificationService);
const mockEmail = vi.mocked(emailService);

const mockFeedback = {
  id: 'feedback-1',
  userId: 'user-1',
  user: { fullName: 'Test User' },
  pageUrl: 'https://app.example.com/dashboard',
  elementSelector: null,
  elementLabel: null,
  content: 'Test feedback content',
  screenshotUrl: null,
  status: 'NEW' as const,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
  _count: { replies: 2 },
};

const mockReply = {
  id: 'reply-1',
  feedbackId: 'feedback-1',
  authorId: 'user-2',
  author: { fullName: 'Reply Author' },
  content: 'This is a reply',
  createdAt: new Date('2026-01-02'),
  updatedAt: new Date('2026-01-02'),
};

describe('Feedback Service — Replies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getFeedbackReplies', () => {
    it('should return formatted replies for a feedback item', async () => {
      mockPrisma.feedback.findUnique.mockResolvedValue({ id: 'feedback-1' } as any);
      mockPrisma.feedbackReply.findMany.mockResolvedValue([mockReply] as any);

      const replies = await getFeedbackReplies('feedback-1');

      expect(replies).toHaveLength(1);
      expect(replies[0]).toEqual({
        id: 'reply-1',
        feedbackId: 'feedback-1',
        authorId: 'user-2',
        authorName: 'Reply Author',
        content: 'This is a reply',
        createdAt: '2026-01-02T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      });

      expect(mockPrisma.feedbackReply.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { feedbackId: 'feedback-1' },
          orderBy: { createdAt: 'asc' },
        })
      );
    });

    it('should throw 404 if feedback not found', async () => {
      mockPrisma.feedback.findUnique.mockResolvedValue(null);

      await expect(getFeedbackReplies('nonexistent')).rejects.toThrow('Feedback not found');
    });
  });

  describe('createFeedbackReply', () => {
    it('should create a reply and trigger fire-and-forget notification', async () => {
      mockPrisma.feedback.findUnique.mockResolvedValue({
        id: 'feedback-1',
        userId: 'user-1',
        content: 'Test feedback content',
        user: { fullName: 'Feedback Author', email: 'author@example.com' },
      } as any);
      mockPrisma.feedbackReply.create.mockResolvedValue(mockReply as any);
      mockPrisma.user.findUnique.mockResolvedValue({ fullName: 'Reply Author' } as any);

      const reply = await createFeedbackReply('feedback-1', 'user-2', 'This is a reply');

      expect(reply.content).toBe('This is a reply');
      expect(reply.authorName).toBe('Reply Author');

      // Notification is fire-and-forget, so it runs async
      // Wait for microtasks to settle
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockNotify.createNotification).toHaveBeenCalledWith(
        'user-1',
        'FEEDBACK_REPLY',
        expect.objectContaining({
          feedbackId: 'feedback-1',
          replyAuthorName: 'Reply Author',
        })
      );
    });

    it('should succeed even when notification fails', async () => {
      mockPrisma.feedback.findUnique.mockResolvedValue({
        id: 'feedback-1',
        userId: 'user-1',
        content: 'Test feedback content',
        user: { fullName: 'Feedback Author', email: 'author@example.com' },
      } as any);
      mockPrisma.feedbackReply.create.mockResolvedValue(mockReply as any);
      mockPrisma.user.findUnique.mockResolvedValue({ fullName: 'Reply Author' } as any);
      mockNotify.createNotification.mockRejectedValue(new Error('Notification DB down'));

      // Should NOT throw even though notification fails
      const reply = await createFeedbackReply('feedback-1', 'user-2', 'This is a reply');
      expect(reply.content).toBe('This is a reply');
    });

    it('should NOT notify when reply author is the feedback author', async () => {
      mockPrisma.feedback.findUnique.mockResolvedValue({
        id: 'feedback-1',
        userId: 'user-1',
        content: 'Self feedback',
        user: { fullName: 'Same User', email: 'same@example.com' },
      } as any);
      mockPrisma.feedbackReply.create.mockResolvedValue({
        ...mockReply,
        authorId: 'user-1',
        author: { fullName: 'Same User' },
      } as any);

      await createFeedbackReply('feedback-1', 'user-1', 'Self-reply');

      // Wait for any potential async notifications
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockNotify.createNotification).not.toHaveBeenCalled();
    });

    it('should send email to feedback author when someone else replies', async () => {
      mockPrisma.feedback.findUnique.mockResolvedValue({
        id: 'feedback-1',
        userId: 'user-1',
        content: 'Original feedback content',
        user: { fullName: 'Feedback Author', email: 'author@example.com' },
      } as any);
      mockPrisma.feedbackReply.create.mockResolvedValue(mockReply as any);
      mockPrisma.user.findUnique.mockResolvedValue({ fullName: 'Reply Author' } as any);

      await createFeedbackReply('feedback-1', 'user-2', 'This is a reply');

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockEmail.sendFeedbackReplyEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientEmail: 'author@example.com',
          recipientName: 'Feedback Author',
          replyAuthorName: 'Reply Author',
          feedbackContent: 'Original feedback content',
          replyContent: 'This is a reply',
        })
      );
    });

    it('should notify admins via email and in-app when poster replies to own feedback', async () => {
      mockPrisma.feedback.findUnique.mockResolvedValue({
        id: 'feedback-1',
        userId: 'user-1',
        content: 'My own feedback',
        user: { fullName: 'Original Poster', email: 'poster@example.com' },
      } as any);
      mockPrisma.feedbackReply.create.mockResolvedValue({
        ...mockReply,
        authorId: 'user-1',
        author: { fullName: 'Original Poster' },
      } as any);
      mockPrisma.user.findMany.mockResolvedValue([
        { email: 'admin1@example.com', fullName: 'Admin One' },
        { email: 'admin2@example.com', fullName: 'Admin Two' },
      ] as any);

      await createFeedbackReply('feedback-1', 'user-1', 'Poster follow-up');

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should email each admin
      expect(mockEmail.sendFeedbackReplyEmail).toHaveBeenCalledTimes(2);
      expect(mockEmail.sendFeedbackReplyEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientEmail: 'admin1@example.com',
          recipientName: 'Admin One',
          replyAuthorName: 'Original Poster',
          feedbackContent: 'My own feedback',
          replyContent: 'Poster follow-up',
        })
      );

      // Should send in-app notification to admins
      expect(mockNotify.notifyAdmins).toHaveBeenCalledWith(
        'FEEDBACK_REPLY',
        expect.objectContaining({
          feedbackId: 'feedback-1',
          replyAuthorName: 'Original Poster',
        })
      );

      // Should NOT email the poster themselves
      expect(mockEmail.sendFeedbackReplyEmail).not.toHaveBeenCalledWith(
        expect.objectContaining({ recipientEmail: 'poster@example.com' })
      );
    });

    it('should still email admins even if in-app notification fails', async () => {
      mockPrisma.feedback.findUnique.mockResolvedValue({
        id: 'feedback-1',
        userId: 'user-1',
        content: 'My own feedback',
        user: { fullName: 'Original Poster', email: 'poster@example.com' },
      } as any);
      mockPrisma.feedbackReply.create.mockResolvedValue({
        ...mockReply,
        authorId: 'user-1',
        author: { fullName: 'Original Poster' },
      } as any);
      mockPrisma.user.findMany.mockResolvedValue([
        { email: 'admin1@example.com', fullName: 'Admin One' },
      ] as any);
      mockNotify.notifyAdmins.mockRejectedValue(new Error('DB down'));

      const reply = await createFeedbackReply('feedback-1', 'user-1', 'Follow-up');

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should NOT throw
      expect(reply.content).toBeDefined();
      // Email should still be sent despite notification failure
      expect(mockEmail.sendFeedbackReplyEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientEmail: 'admin1@example.com',
        })
      );
    });

    it('should NOT notify admins when a non-poster replies (poster gets notified instead)', async () => {
      mockPrisma.feedback.findUnique.mockResolvedValue({
        id: 'feedback-1',
        userId: 'user-1',
        content: 'Original feedback',
        user: { fullName: 'Feedback Author', email: 'author@example.com' },
      } as any);
      mockPrisma.feedbackReply.create.mockResolvedValue(mockReply as any);
      mockPrisma.user.findUnique.mockResolvedValue({ fullName: 'Reply Author' } as any);

      await createFeedbackReply('feedback-1', 'user-2', 'Admin reply');

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Admin notification should NOT be called (poster notification is called instead)
      expect(mockNotify.notifyAdmins).not.toHaveBeenCalled();
    });

    it('should throw 404 if feedback not found', async () => {
      mockPrisma.feedback.findUnique.mockResolvedValue(null);

      await expect(createFeedbackReply('nonexistent', 'user-1', 'Reply')).rejects.toThrow(
        'Feedback not found'
      );
    });
  });

  describe('deleteFeedbackReply', () => {
    it('should allow reply author to delete their own reply', async () => {
      mockPrisma.feedbackReply.findUnique.mockResolvedValue({
        id: 'reply-1',
        authorId: 'user-2',
      } as any);
      mockPrisma.feedbackReply.delete.mockResolvedValue({} as any);

      await deleteFeedbackReply('reply-1', 'user-2', false);

      expect(mockPrisma.feedbackReply.delete).toHaveBeenCalledWith({
        where: { id: 'reply-1' },
      });
    });

    it('should allow admin to delete any reply', async () => {
      mockPrisma.feedbackReply.findUnique.mockResolvedValue({
        id: 'reply-1',
        authorId: 'user-2',
      } as any);
      mockPrisma.feedbackReply.delete.mockResolvedValue({} as any);

      await deleteFeedbackReply('reply-1', 'user-3', true);

      expect(mockPrisma.feedbackReply.delete).toHaveBeenCalledWith({
        where: { id: 'reply-1' },
      });
    });

    it('should reject non-author, non-admin delete', async () => {
      mockPrisma.feedbackReply.findUnique.mockResolvedValue({
        id: 'reply-1',
        authorId: 'user-2',
      } as any);

      await expect(deleteFeedbackReply('reply-1', 'user-3', false)).rejects.toThrow(
        'You can only delete your own replies'
      );
    });

    it('should throw 404 if reply not found', async () => {
      mockPrisma.feedbackReply.findUnique.mockResolvedValue(null);

      await expect(deleteFeedbackReply('nonexistent', 'user-1', false)).rejects.toThrow(
        'Reply not found'
      );
    });
  });

  describe('getFeedbacks (replyCount)', () => {
    it('should include replyCount in feedback list', async () => {
      mockPrisma.feedback.findMany.mockResolvedValue([mockFeedback] as any);
      mockPrisma.feedback.count.mockResolvedValue(1);

      const result = await getFeedbacks({});

      expect(result.data[0].replyCount).toBe(2);
    });
  });
});
