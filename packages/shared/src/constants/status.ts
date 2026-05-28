/**
 * Social Planner - Status and Role Constants
 *
 * These constants mirror the enums defined in the Prisma schema.
 * Single workspace architecture - no OWNER role needed.
 */

// ============================================
// USER ROLES
// ============================================

export const USER_ROLE = {
  ADMIN: 'ADMIN',
  EDITOR: 'EDITOR',
  VIEWER: 'VIEWER',
} as const;

export type UserRole = (typeof USER_ROLE)[keyof typeof USER_ROLE];

// ============================================
// AUTH PROVIDERS
// ============================================

export const AUTH_PROVIDER = {
  LOCAL: 'LOCAL',
  GOOGLE: 'GOOGLE',
  MICROSOFT: 'MICROSOFT',
} as const;

export type AuthProvider = (typeof AUTH_PROVIDER)[keyof typeof AUTH_PROVIDER];

// ============================================
// POST STATUSES
// ============================================

export const POST_STATUS = {
  DRAFT: 'DRAFT',
  PENDING_APPROVAL: 'PENDING_APPROVAL',
  APPROVED: 'APPROVED',
  SCHEDULED: 'SCHEDULED',
  PUBLISHED: 'PUBLISHED',
  REJECTED: 'REJECTED',
  UNPUBLISHED: 'UNPUBLISHED',
} as const;

export type PostStatus = (typeof POST_STATUS)[keyof typeof POST_STATUS];

// ============================================
// ARTICLE STATUSES
// ============================================

export const ARTICLE_STATUS = {
  DRAFT: 'DRAFT',
  PUBLISHED: 'PUBLISHED',
} as const;

export type ArticleStatus = (typeof ARTICLE_STATUS)[keyof typeof ARTICLE_STATUS];

// ============================================
// CHANNEL STATUSES
// ============================================

export const CHANNEL_STATUS = {
  PENDING: 'PENDING',
  PUBLISHED: 'PUBLISHED',
  FAILED: 'FAILED',
} as const;

export type ChannelStatus = (typeof CHANNEL_STATUS)[keyof typeof CHANNEL_STATUS];

// ============================================
// SOCIAL PLATFORMS
// ============================================

export const SOCIAL_PLATFORM = {
  INSTAGRAM: 'INSTAGRAM',
  LINKEDIN: 'LINKEDIN',
} as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORM)[keyof typeof SOCIAL_PLATFORM];

// ============================================
// SHARE PERMISSIONS
// ============================================

export const SHARE_PERMISSION = {
  VIEW: 'VIEW',
  VIEW_COMMENT: 'VIEW_COMMENT',
} as const;

export type SharePermission = (typeof SHARE_PERMISSION)[keyof typeof SHARE_PERMISSION];

// ============================================
// AMBASSADOR STATUSES
// ============================================

export const AMBASSADOR_STATUS = {
  PENDING: 'PENDING',
  ACTIVE: 'ACTIVE',
  DECLINED: 'DECLINED',
} as const;

export type AmbassadorStatus = (typeof AMBASSADOR_STATUS)[keyof typeof AMBASSADOR_STATUS];

// ============================================
// INVITATION STATUSES
// ============================================

export const INVITATION_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  EXPIRED: 'EXPIRED',
  REVOKED: 'REVOKED',
} as const;

export type InvitationStatus = (typeof INVITATION_STATUS)[keyof typeof INVITATION_STATUS];

// ============================================
// FEEDBACK STATUSES
// ============================================

export const FEEDBACK_STATUS = {
  NEW: 'NEW',
  REVIEWED: 'REVIEWED',
  RESOLVED: 'RESOLVED',
} as const;

export type FeedbackStatus = (typeof FEEDBACK_STATUS)[keyof typeof FEEDBACK_STATUS];

// ============================================
// NOTIFICATION TYPES
// ============================================

export const NOTIFICATION_TYPE = {
  POST_SUBMITTED: 'POST_SUBMITTED',
  POST_APPROVED: 'POST_APPROVED',
  POST_REJECTED: 'POST_REJECTED',
  POST_PUBLISHED: 'POST_PUBLISHED',
  POST_FAILED: 'POST_FAILED',
  COMMENT_ADDED: 'COMMENT_ADDED',
  MENTION: 'MENTION',
  COLLABORATOR_ASSIGNED: 'COLLABORATOR_ASSIGNED',
  EDIT_REQUESTED: 'EDIT_REQUESTED',
  REVIEW_REQUESTED: 'REVIEW_REQUESTED',
  AMBASSADOR_CONTENT: 'AMBASSADOR_CONTENT',
  FEEDBACK_SUBMITTED: 'FEEDBACK_SUBMITTED',
} as const;

export type NotificationType = (typeof NOTIFICATION_TYPE)[keyof typeof NOTIFICATION_TYPE];

// ============================================
// UI HELPERS
// ============================================

export const STATUS_COLORS = {
  DRAFT: '#6B7280',
  PENDING_APPROVAL: '#F59E0B',
  APPROVED: '#3B82F6',
  SCHEDULED: '#8B5CF6',
  PUBLISHED: '#10B981',
  REJECTED: '#EF4444',
  UNPUBLISHED: '#F97316',
} as const;

export const PLATFORM_COLORS = {
  INSTAGRAM: '#E4405F',
  LINKEDIN: '#0A66C2',
} as const;

// ============================================
// PLATFORM LIMITS
// ============================================

export const PLATFORM_LIMITS = {
  INSTAGRAM: {
    textMaxLength: 2200,
    hashtagLimit: 30,
    mediaMaxCount: 10,
    imageMaxSizeMB: 8,
    videoMaxSizeMB: 100,
    videoMaxDurationSeconds: 60,
  },
  LINKEDIN: {
    textMaxLength: 3000,
    hashtagLimit: 5,
    mediaMaxCount: 1,
    imageMaxSizeMB: 8,
    videoMaxSizeMB: 200,
    videoMaxDurationSeconds: 600,
  },
} as const;
