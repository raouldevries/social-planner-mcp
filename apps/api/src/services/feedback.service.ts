/**
 * Social Planner - Feedback Service
 *
 * Handles in-app feedback submissions with admin notifications.
 */

import { randomUUID } from 'crypto';
import { prisma } from '../lib/prisma';
import { AppError } from '../middleware/errorHandler';
import { FeedbackStatus, Prisma } from '@social-planner/database';
import type { FeedbackSummary, FeedbackReply, PaginatedResponse } from '@social-planner/shared';
import * as notificationService from './notification.service';
import * as emailService from './email.service';
import * as s3 from '../lib/s3';
import { config } from '../config';

// ============================================
// HELPERS
// ============================================

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

const feedbackSelect = {
  id: true,
  userId: true,
  user: {
    select: {
      fullName: true,
    },
  },
  pageUrl: true,
  elementSelector: true,
  elementLabel: true,
  content: true,
  screenshotUrl: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  _count: {
    select: { replies: true },
  },
};

function formatFeedback(feedback: {
  id: string;
  userId: string;
  user: { fullName: string };
  pageUrl: string;
  elementSelector: string | null;
  elementLabel: string | null;
  content: string;
  screenshotUrl: string | null;
  status: FeedbackStatus;
  createdAt: Date;
  updatedAt: Date;
  _count?: { replies: number };
}): FeedbackSummary {
  return {
    id: feedback.id,
    userId: feedback.userId,
    userName: feedback.user.fullName,
    pageUrl: feedback.pageUrl,
    elementSelector: feedback.elementSelector,
    elementLabel: feedback.elementLabel,
    content: feedback.content,
    screenshotUrl: feedback.screenshotUrl,
    status: feedback.status,
    replyCount: feedback._count?.replies ?? 0,
    createdAt: feedback.createdAt.toISOString(),
    updatedAt: feedback.updatedAt.toISOString(),
  };
}

// ============================================
// CREATE
// ============================================

export interface CreateFeedbackData {
  content: string;
  pageUrl: string;
  elementSelector?: string;
  elementLabel?: string;
  screenshotUrl?: string;
}

/**
 * Create feedback and notify all admins (in-app + email)
 */
export async function createFeedback(
  userId: string,
  data: CreateFeedbackData
): Promise<FeedbackSummary> {
  const feedback = await prisma.feedback.create({
    data: {
      userId,
      content: data.content,
      pageUrl: data.pageUrl,
      elementSelector: data.elementSelector ?? null,
      elementLabel: data.elementLabel ?? null,
      screenshotUrl: data.screenshotUrl ?? null,
    },
    select: feedbackSelect,
  });

  const formatted = formatFeedback(feedback);

  // Notify admins in-app
  await notificationService.notifyAdmins('FEEDBACK_SUBMITTED', {
    feedbackId: feedback.id,
    userName: feedback.user.fullName,
    pageUrl: feedback.pageUrl,
  });

  // Notify admins via email (fire-and-forget)
  sendFeedbackEmailToAdmins(feedback.user.fullName, feedback.pageUrl, feedback.content).catch(
    () => {
      // Email failures are non-critical
    }
  );

  return formatted;
}

/**
 * Send feedback notification email to all admins
 */
async function sendFeedbackEmailToAdmins(
  userName: string,
  pageUrl: string,
  content: string
): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { email: true, fullName: true },
  });

  const truncatedContent = content.length > 200 ? content.substring(0, 200) + '...' : content;
  const feedbackUrl = `${config.FRONTEND_URL}/feedback`;

  // Escape user-controlled values to prevent HTML injection in emails
  const safeUserName = escapeHtml(userName);
  const safePageUrl = escapeHtml(pageUrl);
  const safeContent = escapeHtml(truncatedContent);

  await Promise.allSettled(
    admins.map((admin) =>
      emailService.sendEmail({
        to: admin.email,
        subject: `New feedback from ${userName}`,
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Feedback</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f3f4f6; }
    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: white; border-radius: 12px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { margin-bottom: 24px; }
    .logo { font-size: 20px; font-weight: 600; color: #6366f1; }
    h1 { font-size: 24px; font-weight: 600; color: #111827; margin: 0 0 16px 0; }
    p { margin: 0 0 16px 0; }
    .feedback-box { background: #f9fafb; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #6366f1; }
    .meta { font-size: 14px; color: #6b7280; margin-bottom: 8px; }
    .button { display: inline-block; background: #6366f1; color: white !important; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 500; margin-top: 8px; }
    .footer { text-align: center; margin-top: 32px; color: #9ca3af; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <div class="header"><span class="logo">Social Planner</span></div>
      <h1>New Feedback Submitted</h1>
      <p><strong>${safeUserName}</strong> submitted feedback.</p>
      <p class="meta">Page: ${safePageUrl}</p>
      <div class="feedback-box"><p>${safeContent}</p></div>
      <a href="${feedbackUrl}" class="button">View Feedback</a>
    </div>
    <div class="footer"><p>Sent via Social Planner</p></div>
  </div>
</body>
</html>`,
        text: `New feedback from ${userName}\n\nPage: ${pageUrl}\n\n${truncatedContent}\n\nView feedback: ${feedbackUrl}`,
      })
    )
  );
}

/**
 * Notify all admins when the original poster replies to their feedback
 */
async function sendFeedbackReplyToAdmins(
  feedbackId: string,
  posterName: string,
  feedbackContent: string,
  replyContent: string
): Promise<void> {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: { email: true, fullName: true },
  });

  const feedbackUrl = `${config.FRONTEND_URL}/feedback`;

  // Run in-app and email notifications in parallel so one channel failing doesn't block the other
  await Promise.allSettled([
    notificationService.notifyAdmins('FEEDBACK_REPLY', {
      feedbackId,
      replyAuthorName: posterName,
    }),
    ...admins.map((admin) =>
      emailService.sendFeedbackReplyEmail({
        recipientEmail: admin.email,
        recipientName: admin.fullName,
        replyAuthorName: posterName,
        feedbackContent,
        replyContent,
        feedbackUrl,
      })
    ),
  ]);
}

// ============================================
// READ
// ============================================

export interface FeedbackFilters {
  status?: FeedbackStatus | undefined;
  page?: number | undefined;
  perPage?: number | undefined;
}

/**
 * Get all feedback (admin only) with pagination and status filter
 */
export async function getFeedbacks(
  filters: FeedbackFilters
): Promise<PaginatedResponse<FeedbackSummary>> {
  const page = filters.page ?? 1;
  const perPage = filters.perPage ?? 20;

  const where: Prisma.FeedbackWhereInput = {};
  if (filters.status) {
    where.status = filters.status;
  }

  const [feedbacks, total] = await Promise.all([
    prisma.feedback.findMany({
      where,
      select: feedbackSelect,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
    prisma.feedback.count({ where }),
  ]);

  const totalPages = Math.ceil(total / perPage);

  return {
    data: feedbacks.map(formatFeedback),
    pagination: {
      page,
      perPage,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

// ============================================
// UPDATE
// ============================================

/**
 * Update feedback status (admin only)
 */
export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackStatus
): Promise<FeedbackSummary> {
  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    select: { id: true },
  });

  if (!feedback) {
    throw new AppError('FEEDBACK_NOT_FOUND', 'Feedback not found', 404);
  }

  const updated = await prisma.feedback.update({
    where: { id: feedbackId },
    data: { status },
    select: feedbackSelect,
  });

  return formatFeedback(updated);
}

/**
 * Update feedback content (owner only)
 */
export async function updateFeedbackContent(
  feedbackId: string,
  userId: string,
  content: string
): Promise<FeedbackSummary> {
  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    select: { id: true, userId: true },
  });

  if (!feedback) {
    throw new AppError('FEEDBACK_NOT_FOUND', 'Feedback not found', 404);
  }

  if (feedback.userId !== userId) {
    throw new AppError('FORBIDDEN', 'You can only edit your own feedback', 403);
  }

  const updated = await prisma.feedback.update({
    where: { id: feedbackId },
    data: { content },
    select: feedbackSelect,
  });

  return formatFeedback(updated);
}

// ============================================
// DELETE
// ============================================

/**
 * Delete feedback (admin only)
 */
export async function deleteFeedback(feedbackId: string): Promise<void> {
  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    select: { id: true },
  });

  if (!feedback) {
    throw new AppError('FEEDBACK_NOT_FOUND', 'Feedback not found', 404);
  }

  await prisma.feedback.delete({ where: { id: feedbackId } });
}

// ============================================
// REPLIES
// ============================================

const replySelect = {
  id: true,
  feedbackId: true,
  authorId: true,
  author: {
    select: { fullName: true },
  },
  content: true,
  createdAt: true,
  updatedAt: true,
};

function formatReply(reply: {
  id: string;
  feedbackId: string;
  authorId: string;
  author: { fullName: string };
  content: string;
  createdAt: Date;
  updatedAt: Date;
}): FeedbackReply {
  return {
    id: reply.id,
    feedbackId: reply.feedbackId,
    authorId: reply.authorId,
    authorName: reply.author.fullName,
    content: reply.content,
    createdAt: reply.createdAt.toISOString(),
    updatedAt: reply.updatedAt.toISOString(),
  };
}

export async function getFeedbackReplies(feedbackId: string): Promise<FeedbackReply[]> {
  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    select: { id: true },
  });

  if (!feedback) {
    throw new AppError('FEEDBACK_NOT_FOUND', 'Feedback not found', 404);
  }

  const replies = await prisma.feedbackReply.findMany({
    where: { feedbackId },
    select: replySelect,
    orderBy: { createdAt: 'asc' },
  });

  return replies.map(formatReply);
}

export async function createFeedbackReply(
  feedbackId: string,
  authorId: string,
  content: string
): Promise<FeedbackReply> {
  const feedback = await prisma.feedback.findUnique({
    where: { id: feedbackId },
    select: {
      id: true,
      userId: true,
      content: true,
      user: { select: { fullName: true, email: true } },
    },
  });

  if (!feedback) {
    throw new AppError('FEEDBACK_NOT_FOUND', 'Feedback not found', 404);
  }

  const reply = await prisma.feedbackReply.create({
    data: { feedbackId, authorId, content },
    select: replySelect,
  });

  // Notify the feedback author if the reply is from someone else (fire-and-forget)
  if (feedback.userId !== authorId) {
    prisma.user
      .findUnique({ where: { id: authorId }, select: { fullName: true } })
      .then((author) => {
        const replyAuthorName = author?.fullName ?? 'Someone';

        return Promise.allSettled([
          notificationService.createNotification(feedback.userId, 'FEEDBACK_REPLY', {
            feedbackId,
            replyAuthorName,
          }),
          emailService.sendFeedbackReplyEmail({
            recipientEmail: feedback.user.email,
            recipientName: feedback.user.fullName,
            replyAuthorName,
            feedbackContent: feedback.content,
            replyContent: content,
            feedbackUrl: `${config.FRONTEND_URL}/feedback`,
          }),
        ]);
      })
      .catch(() => {
        // Notification/email failures are non-critical
      });
  } else {
    // Original poster replied back — notify all admins (fire-and-forget)
    sendFeedbackReplyToAdmins(feedbackId, feedback.user.fullName, feedback.content, content).catch(
      () => {
        // Admin notification failures are non-critical
      }
    );
  }

  return formatReply(reply);
}

export async function deleteFeedbackReply(
  replyId: string,
  userId: string,
  isAdmin: boolean
): Promise<void> {
  const reply = await prisma.feedbackReply.findUnique({
    where: { id: replyId },
    select: { id: true, authorId: true },
  });

  if (!reply) {
    throw new AppError('REPLY_NOT_FOUND', 'Reply not found', 404);
  }

  if (reply.authorId !== userId && !isAdmin) {
    throw new AppError('FORBIDDEN', 'You can only delete your own replies', 403);
  }

  await prisma.feedbackReply.delete({ where: { id: replyId } });
}

// ============================================
// SCREENSHOT UPLOAD
// ============================================

const MAX_SCREENSHOT_SIZE = 5 * 1024 * 1024; // 5MB decoded

// PNG magic bytes: 89 50 4E 47
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
// JPEG magic bytes: FF D8 FF
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);

/**
 * Upload a base64-encoded screenshot to S3
 * Returns the public URL of the uploaded image
 */
export async function uploadScreenshot(imageBase64: string): Promise<string> {
  const buffer = Buffer.from(imageBase64, 'base64');

  // Validate minimum size (need at least 4 bytes for magic byte detection)
  if (buffer.length < 4) {
    throw new AppError('INVALID_IMAGE_DATA', 'Image data is too short to be a valid image', 400);
  }

  // Validate decoded size
  if (buffer.length > MAX_SCREENSHOT_SIZE) {
    throw new AppError(
      'FILE_TOO_LARGE',
      `Screenshot exceeds maximum size of ${MAX_SCREENSHOT_SIZE / (1024 * 1024)}MB`,
      400
    );
  }

  // Validate image type by magic bytes
  let contentType: string;
  let extension: string;

  if (buffer.subarray(0, 4).equals(PNG_MAGIC)) {
    contentType = 'image/png';
    extension = 'png';
  } else if (buffer.subarray(0, 3).equals(JPEG_MAGIC)) {
    contentType = 'image/jpeg';
    extension = 'jpg';
  } else {
    throw new AppError('INVALID_FILE_TYPE', 'Only PNG and JPEG images are accepted', 400);
  }

  const key = `feedback-screenshots/${randomUUID()}.${extension}`;
  await s3.uploadFile(key, buffer, { contentType });

  return s3.getPublicUrl(key);
}
