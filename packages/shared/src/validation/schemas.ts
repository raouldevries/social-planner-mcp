/**
 * Social Planner - Zod Validation Schemas
 *
 * These schemas are used for request validation in the API.
 * Single workspace architecture - no workspace/membership schemas needed.
 */

import { z } from 'zod';
import { FEEDBACK_STATUS } from '../constants/status';

// ============================================
// AUTH SCHEMAS
// ============================================

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export const updatePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

// ============================================
// USER SCHEMAS
// ============================================

export const updateUserSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  timezone: z.string().optional(),
});

export const updateUserRoleSchema = z.object({
  role: z.enum(['ADMIN', 'EDITOR', 'VIEWER']),
});

// ============================================
// POST SCHEMAS
// ============================================

export const createPostSchema = z.object({
  baseContent: z.string().max(5000).optional(),
  channels: z
    .array(
      z.object({
        socialAccountId: z.string().uuid(),
        customContent: z.string().max(5000).optional(),
        scheduledAt: z.string().datetime().optional(),
      })
    )
    .optional(),
  mediaIds: z.array(z.string().uuid()).max(10).optional(),
  articleId: z.string().uuid().optional(),
  isAmbassadorAvailable: z.boolean().optional(),
  linkUrl: z.string().url().optional(),
  scheduledAt: z.string().datetime().nullable().optional(),
});

export const updatePostSchema = createPostSchema.partial().extend({
  articleId: z.string().uuid().nullable().optional(),
  linkUrl: z.string().url().nullable().optional(),
});

export const schedulePostSchema = z.object({
  scheduledAt: z.string().datetime(),
  channelSchedules: z
    .array(
      z.object({
        socialAccountId: z.string().uuid(),
        scheduledAt: z.string().datetime(),
      })
    )
    .optional(),
});

export const rejectPostSchema = z.object({
  reason: z.string().min(10, 'Rejection reason must be at least 10 characters').max(1000),
});

export const autosavePostSchema = z.object({
  baseContent: z.string().max(5000),
  lastModified: z.string().datetime().nullable().optional(), // For conflict detection
});

// ============================================
// ARTICLE SCHEMAS
// ============================================

export const createArticleSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  content: z.string().optional(),
  featuredImageId: z.string().uuid().optional(),
  plannedAt: z.string().datetime().optional(),
});

export const updateArticleSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
  featuredImageId: z.string().uuid().nullable().optional(),
  plannedAt: z.string().datetime().nullable().optional(),
});

export const rescheduleArticleSchema = z.object({
  plannedAt: z.string().datetime().nullable(),
});

// ============================================
// COMMENT SCHEMAS
// ============================================

export const createCommentSchema = z.object({
  content: z.string().min(1, 'Comment cannot be empty').max(5000),
  parentId: z.string().uuid().optional(),
  mentions: z.array(z.string().uuid()).optional(),
});

export const updateCommentSchema = z.object({
  content: z.string().min(1).max(5000).optional(),
  isResolved: z.boolean().optional(),
});

// ============================================
// MEDIA SCHEMAS
// ============================================

export const createUploadUrlSchema = z.object({
  fileName: z.string().min(1).max(255),
  contentType: z.string().regex(/^(image|video)\/.+$/),
  fileSize: z
    .number()
    .positive()
    .max(500 * 1024 * 1024), // 500MB max
});

export const updateMediaAssetSchema = z.object({
  altText: z.string().max(500).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
  folderId: z.string().uuid().nullable().optional(),
});

export const createFolderSchema = z.object({
  name: z.string().min(1, 'Folder name is required').max(100),
  parentId: z.string().uuid().optional(),
});

// ============================================
// SHARE LINK SCHEMAS
// ============================================

export const createShareLinkSchema = z.object({
  postId: z.string().uuid().optional(),
  calendarShare: z.boolean().optional(),
  month: z
    .string()
    .regex(/^\d{4}-\d{2}$/, 'Month must be in YYYY-MM format')
    .optional(),
  expiresInHours: z.number().min(1).max(720), // 1 hour to 30 days
  permissions: z.enum(['VIEW', 'VIEW_COMMENT']),
  password: z.string().min(8).optional(),
});

export const accessShareLinkSchema = z.object({
  password: z.string().optional(),
});

export const verifyShareLinkSchema = z.object({
  password: z.string().min(1, 'Password is required'),
});

export const externalCommentSchema = z.object({
  postId: z.string().uuid('Invalid post ID'),
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  content: z.string().min(1, 'Comment is required').max(2000),
  parentId: z.string().uuid().optional(),
});

// ============================================
// AMBASSADOR SCHEMAS
// ============================================

export const createAmbassadorGroupSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  emailTemplate: z.string().max(5000).optional(),
});

export const updateAmbassadorGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).nullable().optional(),
  emailTemplate: z.string().max(5000).nullable().optional(),
});

export const inviteAmbassadorSchema = z.object({
  email: z.string().email('Invalid email address'),
});

// ============================================
// INVITATION SCHEMAS (Invite-Only Registration)
// ============================================

export const createInvitationSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['EDITOR', 'VIEWER']).default('EDITOR'), // Only EDITOR or VIEWER - ADMINs cannot be invited
});

export const acceptInvitationSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters').max(100),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character')
    .optional(), // Optional if accepting via OAuth
});

export const listInvitationsParamsSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED']).optional(),
  email: z.string().email().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

// ============================================
// CALENDAR EVENT SCHEMAS
// ============================================

// Color presets for calendar events
export const CALENDAR_EVENT_COLORS = [
  '#0EA5E9', // sky-500 (default)
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#F97316', // orange-500
  '#10B981', // emerald-500
  '#64748B', // slate-500
] as const;

export const createCalendarEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(1000).optional(),
  startAt: z.string().datetime('Invalid start date/time'),
  endAt: z.string().datetime('Invalid end date/time').optional(),
  allDay: z.boolean().default(false),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .default('#0EA5E9'),
});

export const updateCalendarEventSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().nullable().optional(),
  allDay: z.boolean().optional(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Invalid color format')
    .optional(),
});

export const calendarEventFiltersSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
});

export const rescheduleCalendarEventSchema = z.object({
  startAt: z.string().datetime('Invalid start date/time'),
  endAt: z.string().datetime('Invalid end date/time').nullable().optional(),
});

// ============================================
// FEEDBACK SCHEMAS
// ============================================

export const createFeedbackSchema = z.object({
  content: z.string().min(1, 'Feedback content is required').max(5000),
  pageUrl: z.string().min(1, 'Page URL is required'),
  elementSelector: z.string().optional(),
  elementLabel: z.string().optional(),
  screenshotUrl: z.string().url().optional(),
});

export const updateFeedbackSchema = z.object({
  status: z.enum(Object.values(FEEDBACK_STATUS) as [string, ...string[]]),
});

export const updateFeedbackContentSchema = z.object({
  content: z.string().min(1, 'Feedback content is required').max(5000),
});

export const createFeedbackReplySchema = z.object({
  content: z.string().min(1, 'Reply content is required').max(5000),
});

// ============================================
// QUERY SCHEMAS
// ============================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  perPage: z.coerce.number().int().positive().max(500).default(20), // Allow up to 500 for calendar views
});

// Helper for date strings that accepts both date-only (2025-01-01) and datetime (2025-01-01T00:00:00.000Z) formats
const dateStringSchema = z
  .string()
  .refine((s) => /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/.test(s), {
    message: 'Invalid date format. Use YYYY-MM-DD or ISO datetime',
  });

export const postFiltersSchema = z.object({
  status: z
    .string()
    .transform((s) => s.split(',').filter(Boolean))
    .optional(),
  platform: z.enum(['INSTAGRAM', 'LINKEDIN']).optional(),
  authorId: z.string().uuid().optional(),
  fromDate: dateStringSchema.optional(),
  toDate: dateStringSchema.optional(),
  search: z.string().max(100).optional(),
});

export const articleFiltersSchema = z.object({
  status: z.enum(['DRAFT', 'PUBLISHED']).optional(),
  authorId: z.string().uuid().optional(),
  fromDate: dateStringSchema.optional(),
  toDate: dateStringSchema.optional(),
  search: z.string().max(100).optional(),
});

export const calendarFiltersSchema = z.object({
  from: z.string().datetime(),
  to: z.string().datetime(),
  status: z
    .string()
    .transform((s) => s.split(',').filter(Boolean))
    .optional(),
  platform: z
    .string()
    .transform((s) => s.split(',').filter(Boolean))
    .optional(),
  authorId: z.string().uuid().optional(),
  collaboratorId: z.string().uuid().optional(),
});

export const mediaFiltersSchema = z.object({
  fileType: z.enum(['image', 'video']).optional(),
  folderId: z.string().uuid().nullable().optional(),
  tags: z
    .string()
    .transform((s) => s.split(',').filter(Boolean))
    .optional(),
  search: z.string().max(100).optional(),
});

export const analyticsFiltersSchema = z.object({
  fromDate: dateStringSchema,
  toDate: dateStringSchema,
  platform: z.enum(['INSTAGRAM', 'LINKEDIN']).optional(),
});

// ============================================
// EXPORT SCHEMA TYPES
// ============================================

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshTokenInput = z.infer<typeof refreshTokenSchema>;
export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
export type UpdateUserRoleInput = z.infer<typeof updateUserRoleSchema>;
export type CreatePostInput = z.infer<typeof createPostSchema>;
export type UpdatePostInput = z.infer<typeof updatePostSchema>;
export type SchedulePostInput = z.infer<typeof schedulePostSchema>;
export type RejectPostInput = z.infer<typeof rejectPostSchema>;
export type AutosavePostInput = z.infer<typeof autosavePostSchema>;
export type CreateArticleInput = z.infer<typeof createArticleSchema>;
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>;
export type RescheduleArticleInput = z.infer<typeof rescheduleArticleSchema>;
export type CreateCommentInput = z.infer<typeof createCommentSchema>;
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;
export type CreateUploadUrlInput = z.infer<typeof createUploadUrlSchema>;
export type UpdateMediaAssetInput = z.infer<typeof updateMediaAssetSchema>;
export type CreateFolderInput = z.infer<typeof createFolderSchema>;
export type CreateShareLinkInput = z.infer<typeof createShareLinkSchema>;
export type AccessShareLinkInput = z.infer<typeof accessShareLinkSchema>;
export type VerifyShareLinkInput = z.infer<typeof verifyShareLinkSchema>;
export type ExternalCommentInput = z.infer<typeof externalCommentSchema>;
export type CreateAmbassadorGroupInput = z.infer<typeof createAmbassadorGroupSchema>;
export type UpdateAmbassadorGroupInput = z.infer<typeof updateAmbassadorGroupSchema>;
export type InviteAmbassadorInput = z.infer<typeof inviteAmbassadorSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type PostFiltersInput = z.infer<typeof postFiltersSchema>;
export type ArticleFiltersInput = z.infer<typeof articleFiltersSchema>;
export type CalendarFiltersInput = z.infer<typeof calendarFiltersSchema>;
export type MediaFiltersInput = z.infer<typeof mediaFiltersSchema>;
export type AnalyticsFiltersInput = z.infer<typeof analyticsFiltersSchema>;
export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>;
export type CalendarEventFiltersInput = z.infer<typeof calendarEventFiltersSchema>;
export type RescheduleCalendarEventInput = z.infer<typeof rescheduleCalendarEventSchema>;
export type CreateInvitationInput = z.infer<typeof createInvitationSchema>;
export type AcceptInvitationInput = z.infer<typeof acceptInvitationSchema>;
export type ListInvitationsParamsInput = z.infer<typeof listInvitationsParamsSchema>;
export type CreateFeedbackInput = z.infer<typeof createFeedbackSchema>;
export type UpdateFeedbackInput = z.infer<typeof updateFeedbackSchema>;
export type CreateFeedbackReplyInput = z.infer<typeof createFeedbackReplySchema>;
