/**
 * Dashboard Service Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../lib/prisma';
import {
  getPostStats,
  getRecentActivity,
  getUpcomingPosts,
  getPublishedThisWeek,
  getDashboardData,
} from './dashboard.service';

// Get mocked prisma
const mockPrisma = vi.mocked(prisma);

describe('Dashboard Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPostStats', () => {
    it('should return post counts grouped by status', async () => {
      mockPrisma.post.groupBy.mockResolvedValue([
        { status: 'DRAFT', _count: { id: 5 } },
        { status: 'PENDING_APPROVAL', _count: { id: 3 } },
        { status: 'APPROVED', _count: { id: 2 } },
        { status: 'SCHEDULED', _count: { id: 4 } },
        { status: 'PUBLISHED', _count: { id: 10 } },
        { status: 'REJECTED', _count: { id: 1 } },
        { status: 'UNPUBLISHED', _count: { id: 0 } },
      ] as never);

      const stats = await getPostStats();

      expect(stats).toEqual({
        draft: 5,
        pendingApproval: 3,
        approved: 2,
        scheduled: 4,
        published: 10,
        rejected: 1,
        unpublished: 0,
        total: 25,
      });
    });

    it('should return zeros when no posts exist', async () => {
      mockPrisma.post.groupBy.mockResolvedValue([] as never);

      const stats = await getPostStats();

      expect(stats).toEqual({
        draft: 0,
        pendingApproval: 0,
        approved: 0,
        scheduled: 0,
        published: 0,
        rejected: 0,
        unpublished: 0,
        total: 0,
      });
    });

    it('should handle partial status data', async () => {
      mockPrisma.post.groupBy.mockResolvedValue([
        { status: 'DRAFT', _count: { id: 3 } },
        { status: 'PUBLISHED', _count: { id: 7 } },
      ] as never);

      const stats = await getPostStats();

      expect(stats.draft).toBe(3);
      expect(stats.published).toBe(7);
      expect(stats.scheduled).toBe(0);
      expect(stats.total).toBe(10);
    });
  });

  describe('getRecentActivity', () => {
    it('should return recent activity items with default limit', async () => {
      const mockActivities = [
        {
          id: 'act-1',
          action: 'POST_CREATED',
          details: {},
          createdAt: new Date('2024-12-27T10:00:00Z'),
          actor: { id: 'user-1', fullName: 'John Doe', avatarUrl: null },
          post: { id: 'post-1', baseContent: 'Test post content' },
          article: null,
        },
        {
          id: 'act-2',
          action: 'ARTICLE_PUBLISHED',
          details: {},
          createdAt: new Date('2024-12-27T09:00:00Z'),
          actor: { id: 'user-2', fullName: 'Jane Smith', avatarUrl: 'https://example.com/avatar.jpg' },
          post: null,
          article: { id: 'article-1', title: 'Test Article' },
        },
      ];

      mockPrisma.activityLog.findMany.mockResolvedValue(mockActivities as never);

      const activities = await getRecentActivity();

      expect(activities).toHaveLength(2);
      expect(activities[0].actor.fullName).toBe('John Doe');
      expect(activities[0].post?.baseContent).toBe('Test post content');
      expect(activities[1].article?.title).toBe('Test Article');
    });

    it('should respect custom limit', async () => {
      mockPrisma.activityLog.findMany.mockResolvedValue([] as never);

      await getRecentActivity(5);

      expect(mockPrisma.activityLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 5 })
      );
    });
  });

  describe('getUpcomingPosts', () => {
    it('should return scheduled posts in the future', async () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 1);

      const mockPosts = [
        {
          id: 'post-1',
          baseContent: 'Upcoming post',
          scheduledAt: futureDate,
          status: 'SCHEDULED',
          author: { id: 'user-1', fullName: 'John Doe', avatarUrl: null },
          channels: [
            { socialAccount: { platform: 'INSTAGRAM', accountName: 'test_account' } },
          ],
        },
      ];

      mockPrisma.post.findMany.mockResolvedValue(mockPosts as never);

      const posts = await getUpcomingPosts();

      expect(posts).toHaveLength(1);
      expect(posts[0].baseContent).toBe('Upcoming post');
      expect(posts[0].channels[0].platform).toBe('INSTAGRAM');
    });

    it('should respect custom limit', async () => {
      mockPrisma.post.findMany.mockResolvedValue([] as never);

      await getUpcomingPosts(3);

      expect(mockPrisma.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 3 })
      );
    });
  });

  describe('getPublishedThisWeek', () => {
    it('should return count of posts published this week', async () => {
      mockPrisma.post.count.mockResolvedValue(5);

      const count = await getPublishedThisWeek();

      expect(count).toBe(5);
      expect(mockPrisma.post.count).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'PUBLISHED',
            publishedAt: expect.objectContaining({
              gte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should return 0 when no posts published this week', async () => {
      mockPrisma.post.count.mockResolvedValue(0);

      const count = await getPublishedThisWeek();

      expect(count).toBe(0);
    });
  });

  describe('getDashboardData', () => {
    it('should aggregate all dashboard data', async () => {
      // Mock all required data
      mockPrisma.post.groupBy.mockResolvedValue([
        { status: 'DRAFT', _count: { id: 2 } },
        { status: 'PENDING_APPROVAL', _count: { id: 1 } },
        { status: 'PUBLISHED', _count: { id: 5 } },
      ] as never);

      mockPrisma.activityLog.findMany.mockResolvedValue([]);
      mockPrisma.post.findMany.mockResolvedValue([]);
      mockPrisma.post.count.mockResolvedValue(3);

      const data = await getDashboardData();

      expect(data).toHaveProperty('postStats');
      expect(data).toHaveProperty('recentActivity');
      expect(data).toHaveProperty('upcomingPosts');
      expect(data).toHaveProperty('publishedThisWeek');
      expect(data).toHaveProperty('pendingApprovalCount');

      expect(data.postStats.draft).toBe(2);
      expect(data.postStats.pendingApproval).toBe(1);
      expect(data.publishedThisWeek).toBe(3);
      expect(data.pendingApprovalCount).toBe(1);
    });
  });
});
