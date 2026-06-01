/**
 * Social Planner - MCP Tool Registry Service
 *
 * Defines MCP tools and their handlers for post management via Claude Desktop.
 * Tools follow the Model Context Protocol specification.
 */

import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { MCP_WRITE_SCOPES, type MCPScope, type MCPToolResult } from '@social-planner/shared';

/**
 * Remove write scopes from a scope list. Used to enforce read-only access for
 * the demo account on the MCP transport: with write scopes stripped, no write
 * tool's requiredScopes can be satisfied, so write tools are never registered.
 */
export function filterReadOnlyScopes(scopes: MCPScope[]): MCPScope[] {
  const writeScopes = MCP_WRITE_SCOPES as readonly string[];
  return scopes.filter((scope) => !writeScopes.includes(scope));
}

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
    inputSchema: z.object({
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
    }),
  },

  get_post: {
    name: 'get_post',
    description:
      'Get detailed information about a specific post including its content, channels, and scheduling.',
    requiredScopes: ['read_posts'] as MCPScope[],
    inputSchema: z.object({
      postId: z.string().uuid().describe('The unique identifier of the post'),
    }),
  },

  list_channels: {
    name: 'list_channels',
    description: 'List connected social media accounts (channels) that can be used for publishing.',
    requiredScopes: ['read_channels'] as MCPScope[],
    inputSchema: z.object({
      platform: z.enum(['INSTAGRAM', 'LINKEDIN']).optional().describe('Filter by social platform'),
    }),
  },

  // =========================================
  // WRITE TOOLS
  // =========================================

  create_post: {
    name: 'create_post',
    description:
      'Create a new post draft. The post will be saved as a DRAFT and can later be scheduled or submitted for approval.',
    requiredScopes: ['create_posts'] as MCPScope[],
    inputSchema: z.object({
      content: z.string().min(1).max(10000).describe('The main content/text of the post'),
      channelIds: z
        .array(z.string().uuid())
        .optional()
        .describe('Social account IDs to attach as channels'),
      linkUrl: z.string().url().optional().describe('Optional link URL to attach'),
    }),
  },

  update_post: {
    name: 'update_post',
    description:
      'Update an existing draft post. Only posts in DRAFT or REJECTED status can be updated.',
    requiredScopes: ['create_posts'] as MCPScope[],
    inputSchema: z.object({
      postId: z.string().uuid().describe('The post ID to update'),
      content: z.string().min(1).max(10000).optional().describe('New content for the post'),
      linkUrl: z.string().url().nullable().optional().describe('Updated link URL (null to remove)'),
    }),
  },

  schedule_post: {
    name: 'schedule_post',
    description:
      'Set a proposed publish date on a draft post and attach channels. The post remains a DRAFT and will appear on the calendar at the proposed date. The user can then review and manually schedule it in the web interface.',
    requiredScopes: ['schedule_posts'] as MCPScope[],
    inputSchema: z.object({
      postId: z.string().uuid().describe('The post ID to set the proposed date on'),
      channels: z
        .array(
          z.object({
            socialAccountId: z.string().uuid().describe('Social account ID'),
            scheduledAt: z
              .string()
              .datetime()
              .describe('ISO 8601 datetime for the proposed publish date'),
            customContent: z
              .string()
              .max(5000)
              .optional()
              .describe('Platform-specific content override'),
          })
        )
        .min(1)
        .describe('Channel configuration with proposed dates'),
    }),
  },

  submit_for_approval: {
    name: 'submit_for_approval',
    description:
      'Submit a draft post for approval review. Only posts in DRAFT status can be submitted.',
    requiredScopes: ['create_posts'] as MCPScope[],
    inputSchema: z.object({
      postId: z.string().uuid().describe('The post ID to submit'),
    }),
  },
} as const;

// Context passed to all tool handlers
export interface ToolContext {
  userId: string;
  userRole: 'ADMIN' | 'EDITOR' | 'VIEWER';
  clientId: string;
  /** True for the read-only demo account; write tools are not registered for it. */
  isDemo?: boolean;
}

// Helper: Check if user can modify a post
function canModifyPost(post: { authorId: string }, context: ToolContext): boolean {
  return post.authorId === context.userId || context.userRole === 'ADMIN';
}

// Tool handler implementations
export const toolHandlers = {
  async list_posts(
    params: { status?: string; limit?: number; offset?: number },
    context: ToolContext
  ): Promise<MCPToolResult> {
    try {
      const { status, limit = 20, offset = 0 } = params;

      // Build query filters
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {};
      if (status) {
        where.status = status;
      }

      // Scope based on user role
      if (context.userRole === 'VIEWER') {
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
      // All authenticated users can view available channels
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const where: any = {};
      if (params.platform) {
        where.platform = params.platform;
      }

      // Suppress unused variable warning
      void context;

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
          linkUrl: params.linkUrl ?? null,
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

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
        select: { id: true, status: true, authorId: true, baseContent: true },
      });

      if (!post) {
        return {
          success: false,
          error: { code: 'POST_NOT_FOUND', message: 'Post not found' },
        };
      }

      // Access control: only author or admin can set proposed date
      if (!canModifyPost(post, context)) {
        return {
          success: false,
          error: { code: 'FORBIDDEN', message: 'You can only modify your own posts' },
        };
      }

      // Only drafts can have a proposed date set via MCP
      if (post.status !== 'DRAFT') {
        return {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot set proposed date on post in ${post.status} status. Post must be DRAFT.`,
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

      // Use the earliest channel date as the main scheduledAt for calendar display
      const proposedDate = new Date(
        Math.min(...params.channels.map((c) => new Date(c.scheduledAt).getTime()))
      );

      // Update post and create/update channels in a transaction
      await prisma.$transaction(async (tx) => {
        // Set proposed date on post (keep status as DRAFT)
        await tx.post.update({
          where: { id: params.postId },
          data: { scheduledAt: proposedDate },
        });

        // Create or update channels with their proposed dates
        for (const channel of params.channels) {
          await tx.postChannel.upsert({
            where: {
              postId_socialAccountId: {
                postId: params.postId,
                socialAccountId: channel.socialAccountId,
              },
            },
            create: {
              postId: params.postId,
              socialAccountId: channel.socialAccountId,
              scheduledAt: new Date(channel.scheduledAt),
              customContent: channel.customContent ?? null,
            },
            update: {
              scheduledAt: new Date(channel.scheduledAt),
              customContent: channel.customContent ?? null,
            },
          });
        }
      });

      // Log activity
      await prisma.activityLog.create({
        data: {
          postId: params.postId,
          actorId: context.userId,
          action: 'UPDATED',
          details: {
            source: 'mcp',
            clientId: context.clientId,
            action: 'proposed_date_set',
            proposedDate: proposedDate.toISOString(),
          },
        },
      });

      // Build channel summary for response
      const channelSummary = params.channels.map((c) => {
        const account = accounts.find((a) => a.id === c.socialAccountId)!;
        return {
          platform: account.platform,
          accountName: account.accountName,
          scheduledAt: c.scheduledAt,
        };
      });

      return {
        success: true,
        data: {
          postId: params.postId,
          status: 'DRAFT',
          proposedDate: proposedDate.toISOString(),
          channels: channelSummary,
          message: `Draft saved with proposed date ${proposedDate.toLocaleDateString()}. The post will appear on the calendar. Open Social Planner to review and schedule.`,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SET_PROPOSED_DATE_FAILED',
          message: error instanceof Error ? error.message : 'Failed to set proposed date',
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

// Get all tool names
export function getToolNames(): string[] {
  return Object.keys(MCP_TOOLS);
}
