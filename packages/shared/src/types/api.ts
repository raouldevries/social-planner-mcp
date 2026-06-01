/**
 * Social Planner - API Request/Response Types
 *
 * Single workspace architecture - all users belong to the Acme workspace.
 */

import type {
  PostStatus,
  ArticleStatus,
  UserRole,
  SocialPlatform,
  ChannelStatus,
  SharePermission,
  NotificationType,
  AmbassadorStatus,
  AuthProvider,
  InvitationStatus,
  FeedbackStatus,
} from '../constants/status';

// ============================================
// COMMON TYPES
// ============================================

export interface PaginationParams {
  page?: number;
  perPage?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    perPage: number;
    total: number;
    totalPages: number;
    hasMore: boolean;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, string[]>;
}

export interface ApiSuccess<T = void> {
  success: true;
  data: T;
}

// ============================================
// AUTH TYPES
// ============================================

export interface RegisterRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: UserSummary;
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
}

export interface OAuthCallbackParams {
  code: string;
  state?: string;
}

// ============================================
// USER TYPES
// ============================================

export interface UserSummary {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  timezone: string;
  role: UserRole;
  /** True only for the public read-only demo account; the API rejects all writes from it. */
  isDemo?: boolean;
}

export interface UserDetail extends UserSummary {
  authProvider: AuthProvider;
  emailVerifiedAt: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

export interface UpdateUserRequest {
  fullName?: string;
  avatarUrl?: string | null;
  timezone?: string;
}

export interface UpdatePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// ============================================
// USER MANAGEMENT (ADMIN)
// ============================================

export interface UserListItem extends UserSummary {
  createdAt: string;
  lastLoginAt: string | null;
}

export interface UpdateUserRoleRequest {
  role: UserRole;
}

// ============================================
// SOCIAL ACCOUNT TYPES
// ============================================

export interface SocialAccountSummary {
  id: string;
  platform: SocialPlatform;
  accountName: string;
  accountType: string | null;
  profileImageUrl: string | null;
  lastSyncAt: string | null;
  tokenExpiresAt: string | null; // Only included for admin users
}

export interface SocialAccountDetail extends SocialAccountSummary {
  connectedBy: UserSummary;
  connectedAt: string;
}

// ============================================
// POST TYPES
// ============================================

export interface PostSummary {
  id: string;
  status: PostStatus;
  baseContent: string | null;
  scheduledAt: string | null;
  publishedAt: string | null;
  author: UserSummary;
  channels: PostChannelSummary[];
  mediaCount: number;
  thumbnailUrl: string | null;
  collaboratorCount: number;
  collaborators?: CollaboratorSummary[];
  commentCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PostDetail extends PostSummary {
  rejectionReason: string | null;
  isAmbassadorAvailable: boolean;
  article: ArticleSummary | null;
  linkUrl: string | null;
  linkPreview: LinkPreview | null;
  media: PostMediaItem[];
  collaborators: CollaboratorSummary[];
}

export interface PostChannelSummary {
  id: string;
  socialAccountId: string;
  platform: SocialPlatform;
  accountName: string;
  customContent: string | null;
  scheduledAt: string | null;
  status: ChannelStatus;
  publishError: string | null;
  platformPostId: string | null;
  publishedAt: string | null;
}

export interface PostMediaItem {
  id: string;
  mediaAssetId: string;
  position: number;
  altText: string | null;
  fileName: string;
  fileType: string;
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
}

export interface LinkPreview {
  title: string;
  description: string | null;
  imageUrl: string | null;
  siteName: string | null;
}

export interface CollaboratorSummary {
  userId: string;
  user: UserSummary;
  assignedAt: string;
  assignedBy: UserSummary;
}

export interface CreatePostRequest {
  baseContent?: string;
  channels?: {
    socialAccountId: string;
    customContent?: string;
    scheduledAt?: string;
  }[];
  mediaIds?: string[];
  articleId?: string;
  isAmbassadorAvailable?: boolean;
  linkUrl?: string;
  scheduledAt?: string | null;
}

export interface UpdatePostRequest {
  baseContent?: string;
  channels?: {
    socialAccountId: string;
    customContent?: string;
    scheduledAt?: string;
  }[];
  mediaIds?: string[];
  articleId?: string | null;
  isAmbassadorAvailable?: boolean;
  linkUrl?: string | null;
  scheduledAt?: string | null;
}

export interface SchedulePostRequest {
  scheduledAt: string;
  channelSchedules?: {
    socialAccountId: string;
    scheduledAt: string;
  }[];
}

export interface RejectPostRequest {
  reason: string;
}

// ============================================
// ARTICLE TYPES
// ============================================

export interface ArticleSummary {
  id: string;
  title: string;
  status: ArticleStatus;
  author: UserSummary;
  featuredImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  plannedAt: string | null;
}

export interface ArticleDetail extends ArticleSummary {
  content: string | null;
  linkedPostCount: number;
}

export interface CreateArticleRequest {
  title: string;
  content?: string;
  featuredImageId?: string;
  plannedAt?: string;
}

export interface UpdateArticleRequest {
  title?: string;
  content?: string;
  featuredImageId?: string | null;
  plannedAt?: string | null;
}

export interface RescheduleArticleRequest {
  plannedAt: string | null;
}

// ============================================
// MEDIA TYPES
// ============================================

/** Minimal user info for media attribution */
export interface MediaUploaderSummary {
  id: string;
  name: string;
  avatarUrl: string | null;
}

export interface MediaAssetSummary {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number | string; // API returns string for BigInt compatibility
  url: string;
  thumbnailUrl: string | null;
  width: number | null;
  height: number | null;
  duration: number | null;
  altText: string | null;
  createdAt: string;
  uploadedBy: MediaUploaderSummary;
  canEdit: boolean;
  canDelete: boolean;
}

export interface MediaAssetDetail extends MediaAssetSummary {
  storagePath: string;
  metadata: Record<string, unknown>;
  tags: string[];
  folder: MediaFolderSummary | null;
}

export interface MediaFolderSummary {
  id: string;
  name: string;
  parentId: string | null;
}

export interface MediaFolderDetail extends MediaFolderSummary {
  children: MediaFolderSummary[];
  assetCount: number;
  createdAt: string;
}

export interface CreateUploadUrlRequest {
  fileName: string;
  contentType: string;
  fileSize: number;
}

export interface CreateUploadUrlResponse {
  uploadUrl: string;
  assetId: string;
  expiresAt: string;
}

export interface UpdateMediaAssetRequest {
  altText?: string;
  tags?: string[];
  folderId?: string | null;
}

export interface CreateFolderRequest {
  name: string;
  parentId?: string;
}

// ============================================
// COMMENT TYPES
// ============================================

export interface CommentSummary {
  id: string;
  content: string;
  author: UserSummary | null;
  externalAuthorName: string | null;
  externalAuthorEmail: string | null;
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
  replies: CommentSummary[];
  mentions: string[];
}

export interface CreateCommentRequest {
  content: string;
  parentId?: string;
  mentions?: string[];
}

export interface UpdateCommentRequest {
  content?: string;
  isResolved?: boolean;
}

// ============================================
// CALENDAR TYPES
// ============================================

export interface CalendarItem {
  id: string;
  type: 'post' | 'article';
  title: string;
  status: PostStatus | ArticleStatus;
  scheduledAt: string | null;
  publishedAt: string | null;
  platforms: SocialPlatform[];
  thumbnailUrl: string | null;
  collaborators: UserSummary[];
}

export interface CalendarFilters {
  from: string;
  to: string;
  status?: (PostStatus | ArticleStatus)[];
  platform?: SocialPlatform[];
  authorId?: string;
  collaboratorId?: string;
}

// ============================================
// CALENDAR EVENT TYPES (Custom Events)
// ============================================

export interface CalendarEventSummary {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string | null;
  allDay: boolean;
  color: string;
  createdBy: UserSummary;
  createdAt: string;
}

export interface CalendarEventDetail extends CalendarEventSummary {
  updatedAt: string;
}

export interface CreateCalendarEventRequest {
  title: string;
  description?: string;
  startAt: string;
  endAt?: string;
  allDay?: boolean;
  color?: string;
}

export interface UpdateCalendarEventRequest {
  title?: string;
  description?: string | null;
  startAt?: string;
  endAt?: string | null;
  allDay?: boolean;
  color?: string;
}

export interface CalendarEventFilters {
  from: string;
  to: string;
}

// ============================================
// ANALYTICS TYPES
// ============================================

export interface PostAnalyticsSummary {
  impressions: number;
  reach: number;
  engagements: number;
  engagementRate: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  clicks: number;
}

export interface ChannelAnalyticsSummary {
  channelId: string;
  socialAccountId: string;
  accountName: string;
  platform: SocialPlatform;
  profileImageUrl: string | null;
  metrics: PostAnalyticsSummary;
}

export interface PostAnalyticsDetail {
  postId: string;
  aggregate: PostAnalyticsSummary;
  byPlatform: Partial<Record<SocialPlatform, PostAnalyticsSummary>>;
  byChannel: ChannelAnalyticsSummary[];
  syncedAt: string;
}

export interface AnalyticsDashboard {
  dateRange: {
    from: string;
    to: string;
  };
  aggregate: PostAnalyticsSummary;
  byPlatform: Partial<Record<SocialPlatform, PostAnalyticsSummary>>;
  timeSeries: {
    date: string;
    impressions: number;
    engagements: number;
  }[];
  topPosts: {
    postId: string;
    content: string;
    engagementRate: number;
    platform: SocialPlatform;
  }[];
}

// ============================================
// NOTIFICATION TYPES
// ============================================

export interface NotificationSummary {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

// ============================================
// FEEDBACK TYPES
// ============================================

export interface FeedbackSummary {
  id: string;
  userId: string;
  userName: string;
  pageUrl: string;
  elementSelector: string | null;
  elementLabel: string | null;
  content: string;
  screenshotUrl: string | null;
  status: FeedbackStatus;
  replyCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedbackRequest {
  content: string;
  pageUrl: string;
  elementSelector?: string;
  elementLabel?: string;
  screenshotUrl?: string;
}

export interface UpdateFeedbackRequest {
  status: FeedbackStatus;
}

export interface UpdateFeedbackContentRequest {
  content: string;
}

export interface FeedbackReply {
  id: string;
  feedbackId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFeedbackReplyRequest {
  content: string;
}

// ============================================
// SHARE LINK TYPES
// ============================================

export interface ShareLinkSummary {
  id: string;
  token: string;
  postId: string | null;
  calendarShare: boolean;
  permissions: SharePermission;
  hasPassword: boolean;
  expiresAt: string;
  createdAt: string;
  createdBy: UserSummary;
}

export interface CreateShareLinkRequest {
  postId?: string;
  calendarShare?: boolean;
  expiresInHours: number;
  permissions: SharePermission;
  password?: string;
}

export interface AccessShareLinkRequest {
  password?: string;
}

// ============================================
// AMBASSADOR TYPES
// ============================================

export interface AmbassadorGroupSummary {
  id: string;
  name: string;
  description: string | null;
  emailTemplate: string | null;
  memberCount: number;
  createdAt: string;
}

export interface AmbassadorGroupDetail extends AmbassadorGroupSummary {
  members: AmbassadorMemberSummary[];
}

export interface AmbassadorMemberSummary {
  id: string;
  email: string | null;
  user: UserSummary | null;
  status: AmbassadorStatus;
  invitedAt: string;
  respondedAt: string | null;
}

export interface CreateAmbassadorGroupRequest {
  name: string;
  description?: string;
  emailTemplate?: string;
}

export interface UpdateAmbassadorGroupRequest {
  name?: string;
  description?: string | null;
  emailTemplate?: string | null;
}

export interface InviteAmbassadorRequest {
  email: string;
}

export interface AmbassadorShareSummary {
  id: string;
  postId: string;
  platform: SocialPlatform;
  sharedAt: string;
  shareUrl: string | null;
}

// ============================================
// ACTIVITY LOG TYPES
// ============================================

export interface ActivityLogSummary {
  id: string;
  postId: string | null;
  articleId: string | null;
  actor: UserSummary;
  action: string;
  details: Record<string, unknown>;
  createdAt: string;
}

// ============================================
// INVITATION TYPES (Invite-Only Registration)
// ============================================

export interface InvitationSummary {
  id: string;
  email: string;
  role: UserRole;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
  invitedBy: {
    id: string;
    fullName: string;
  };
  acceptedBy?: {
    id: string;
    fullName: string;
  } | null;
  acceptedAt?: string | null;
  revokedAt?: string | null;
}

export interface InvitationValidationResult {
  valid: boolean;
  email?: string; // Partially masked for privacy
  role?: UserRole;
  reason?: 'invalid' | 'expired' | 'already_used' | 'revoked';
}

export interface CreateInvitationRequest {
  email: string;
  role?: 'EDITOR' | 'VIEWER';
}

export interface AcceptInvitationRequest {
  fullName: string;
  password?: string; // Optional if accepting via OAuth
}

export interface AcceptInvitationResponse {
  accessToken: string;
  refreshToken: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    avatarUrl: string | null;
    timezone: string;
    role: UserRole;
  };
}

export interface ListInvitationsParams {
  status?: InvitationStatus;
  email?: string;
  page?: number;
  limit?: number;
}

export interface ListInvitationsResponse {
  invitations: InvitationSummary[];
  total: number;
}
